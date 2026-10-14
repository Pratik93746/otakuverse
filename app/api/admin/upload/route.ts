import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { put, list } from '@vercel/blob';
import sharp from 'sharp';

export const runtime = 'nodejs';

// 1 GB Hard Limit on Vercel Blob Free / Hobby Tier (1,073,741,824 bytes)
export const MAX_BLOB_STORAGE_BYTES = 1024 * 1024 * 1024;

// In-memory cache for storage usage with 60-second TTL to preserve Vercel simple operations quota
let cachedStorage: {
  totalBytes: number;
  totalFiles: number;
  lastChecked: number;
} | null = null;

async function getStorageUsage(token: string, forceRefresh = false): Promise<{ totalBytes: number; totalFiles: number }> {
  const now = Date.now();
  if (!forceRefresh && cachedStorage && now - cachedStorage.lastChecked < 60_000) {
    return {
      totalBytes: cachedStorage.totalBytes,
      totalFiles: cachedStorage.totalFiles,
    };
  }

  let totalBytes = 0;
  let totalFiles = 0;
  let cursor: string | undefined = undefined;

  do {
    const res: any = await list({ token, cursor, limit: 1000 });
    for (const blob of res.blobs) {
      totalBytes += blob.size || 0;
      totalFiles += 1;
    }
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);

  cachedStorage = {
    totalBytes,
    totalFiles,
    lastChecked: now,
  };

  return { totalBytes, totalFiles };
}

function isValidImageHeader(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true;
  return false;
}

// Compress image to WebP with auto-orientation & resizing
async function compressImageBuffer(inputBuffer: Buffer): Promise<Buffer> {
  return sharp(inputBuffer)
    .rotate() // Auto-orient phone camera shots
    .resize({
      width: 1400,
      height: 1400,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 80,
      effort: 5,
      smartSubsample: true,
    })
    .toBuffer();
}

/**
 * GET: Storage Usage Status & 1 GB Warning Monitor
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          configured: false,
          error: 'Vercel Blob token (BLOB_READ_WRITE_TOKEN) is not configured.',
        },
        { status: 503 }
      );
    }

    const force = request.nextUrl.searchParams.get('refresh') === 'true';
    const { totalBytes, totalFiles } = await getStorageUsage(token, force);

    const usedPercentage = Math.min(100, (totalBytes / MAX_BLOB_STORAGE_BYTES) * 100);
    const remainingBytes = Math.max(0, MAX_BLOB_STORAGE_BYTES - totalBytes);
    const avgPosterSizeBytes = 120 * 1024; // ~120KB per compressed WebP poster
    const estimatedRemainingPosters = Math.floor(remainingBytes / avgPosterSizeBytes);

    return NextResponse.json({
      configured: true,
      totalBytes,
      totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
      maxBytes: MAX_BLOB_STORAGE_BYTES,
      maxMB: (MAX_BLOB_STORAGE_BYTES / (1024 * 1024)).toFixed(0),
      remainingMB: (remainingBytes / (1024 * 1024)).toFixed(2),
      totalFiles,
      usedPercentage: parseFloat(usedPercentage.toFixed(2)),
      isNearLimit: usedPercentage >= 80,
      isCritical: usedPercentage >= 95,
      isFull: totalBytes >= MAX_BLOB_STORAGE_BYTES,
      estimatedRemainingPosters,
    });
  } catch (err: any) {
    console.error('Storage status error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch storage status' }, { status: 500 });
  }
}

/**
 * POST: Upload & Compress with 1 GB Storage Guard
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error: 'Vercel Blob token (BLOB_READ_WRITE_TOKEN) is not configured yet in environment variables.',
        },
        { status: 503 }
      );
    }

    // 1. Guard check: check current 1 GB storage limit before processing
    const { totalBytes: currentTotalBytes } = await getStorageUsage(token);
    if (currentTotalBytes >= MAX_BLOB_STORAGE_BYTES) {
      return NextResponse.json(
        {
          error:
            'Storage Limit Reached: Your 1 GB free Vercel Blob storage is full! Please delete old files or upgrade your Vercel plan to upload new posters.',
          storageFull: true,
        },
        { status: 413 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let rawBuffer: Buffer;
    let originalName = 'poster.webp';

    // Case 1: FormData upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }

      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json({ error: 'Original image exceeds 20MB limit' }, { status: 400 });
      }

      originalName = file.name || 'poster.webp';
      const arrayBuf = await file.arrayBuffer();
      rawBuffer = Buffer.from(arrayBuf);
    }
    // Case 2: JSON payload with base64 data URI
    else if (contentType.includes('application/json')) {
      const body = await request.json();
      const { base64, filename = 'poster.webp' } = body;

      if (!base64 || typeof base64 !== 'string') {
        return NextResponse.json({ error: 'Base64 image data is required' }, { status: 400 });
      }

      originalName = filename;
      const matches = base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        rawBuffer = Buffer.from(matches[2], 'base64');
      } else {
        rawBuffer = Buffer.from(base64, 'base64');
      }

      if (rawBuffer.length > 20 * 1024 * 1024) {
        return NextResponse.json({ error: 'Original image exceeds 20MB limit' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 400 });
    }

    // 2. Strict Magic Byte & Format Validation
    if (!isValidImageHeader(rawBuffer)) {
      return NextResponse.json(
        { error: 'Invalid file format. Uploaded file must be a valid JPEG, PNG, or WebP image.' },
        { status: 400 }
      );
    }

    // 3. High-Performance Image Compression & Sanitization via Sharp
    let compressedBuffer: Buffer;
    try {
      compressedBuffer = await compressImageBuffer(rawBuffer);
    } catch (compressionErr: any) {
      console.warn('Sharp image validation/compression failed:', compressionErr?.message);
      return NextResponse.json(
        { error: 'Corrupted or unreadable image file. Please provide a valid JPEG, PNG, or WebP image.' },
        { status: 400 }
      );
    }

    // 3. Check if upload would breach 1 GB hard limit
    if (currentTotalBytes + compressedBuffer.length > MAX_BLOB_STORAGE_BYTES) {
      return NextResponse.json(
        {
          error:
            'Upload would exceed the 1 GB free Vercel Blob storage limit. Please delete old files to free up space.',
          storageFull: true,
        },
        { status: 413 }
      );
    }

    // 4. Clean path name
    const cleanBase = originalName
      .toLowerCase()
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-z0-9.-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const pathname = `posters/${Date.now()}-${cleanBase || 'poster'}.webp`;

    // 5. Upload compressed WebP to Vercel Blob
    const blob = await put(pathname, compressedBuffer, {
      access: 'public',
      contentType: 'image/webp',
      token,
    });

    // 6. Update in-memory storage stats
    if (cachedStorage) {
      cachedStorage.totalBytes += compressedBuffer.length;
      cachedStorage.totalFiles += 1;
    }

    const savedPct = rawBuffer.length > compressedBuffer.length
      ? Math.round(((rawBuffer.length - compressedBuffer.length) / rawBuffer.length) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      contentType: 'image/webp',
      originalKB: (rawBuffer.length / 1024).toFixed(1),
      compressedKB: (compressedBuffer.length / 1024).toFixed(1),
      savedPercentage: savedPct,
    });
  } catch (err: any) {
    console.error('Vercel Blob upload error:', err);
    const errorMsg = err?.message || '';
    if (errorMsg.toLowerCase().includes('private') || errorMsg.toLowerCase().includes('not allowed')) {
      return NextResponse.json(
        {
          error:
            'This Vercel Blob store is set to "Private". For public e-commerce poster images, please create a "Public" Blob store in Vercel.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: errorMsg || 'Failed to upload image to Vercel Blob' },
      { status: 500 }
    );
  }
}
