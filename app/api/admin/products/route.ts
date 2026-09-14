import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser, isAllowedAdminEmail } from '@/lib/firebase-admin';
import {
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
} from '@/lib/db/products';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  // 1. Try Firebase Bearer Token
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      await requireAdminUser(request);
      return true;
    } catch {
      // fallback
    }
  }

  // 2. Try NextAuth session cookie
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      if (session.user.role === 'ADMIN' || (session.user.email && isAllowedAdminEmail(session.user.email))) {
        return true;
      }
    }
  } catch {
    // ignore
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const products = await getAllProductsAdmin();

    return NextResponse.json({
      customProducts: products,
      totalCatalog: products.length,
    });
  } catch (err: any) {
    console.error('Admin products GET error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const body = await request.json();

    const {
      name,
      price,
      compareAtPrice,
      image,
      images,
      animeName,
      characterName,
      brandName,
      categoryName,
      stock = 10,
      badge = 'new',
      description,
    } = body;

    if (!name || !price) {
      return NextResponse.json(
        { error: 'Product name and price are required' },
        { status: 400 }
      );
    }

    const numPrice = Number(price);
    const numCompare = compareAtPrice ? Number(compareAtPrice) : null;
    const discount =
      numCompare && numCompare > numPrice
        ? Math.round(((numCompare - numPrice) / numCompare) * 100)
        : 0;

    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const animeSlug = animeName
      ? animeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : 'anime';
    const categorySlug = categoryName
      ? categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : 'figures';

    const newProduct = await createProduct({
      name,
      slug: baseSlug,
      price: numPrice,
      compareAtPrice: numCompare,
      discount,
      image: image || '/catalog/dragon-ball/item-001.png',
      images: images || (image ? [image] : []),
      characterName: characterName || '',
      animeName: animeName || 'Anime',
      animeSlug,
      brandName: brandName || 'BAKA Exclusive',
      categoryName: categoryName || 'Figures',
      categorySlug,
      stock: Number(stock) || 0,
      isSoldOut: Number(stock) <= 0,
      isNewArrival: badge === 'new',
      isBestSeller: badge === 'bestseller',
      isLimitedEdition: badge === 'limited',
      isPreOrder: badge === 'preorder',
      isFeatured: badge === 'featured' || true,
      description: description || `Premium ${name} official figure from BAKA.`,
    });

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (err: any) {
    console.error('Admin product POST error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, stock, ...otherUpdates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID or slug is required' }, { status: 400 });
    }

    if (stock !== undefined && Object.keys(otherUpdates).length === 0) {
      // Direct stock update
      const numStock = Math.max(0, parseInt(stock, 10) || 0);
      await updateProductStock(id, numStock);
      return NextResponse.json({ success: true, stock: numStock });
    }

    const updated = await updateProduct(id, {
      ...otherUpdates,
      ...(stock !== undefined ? { stock: Number(stock) } : {}),
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    console.error('Admin product PATCH error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('slug');

    if (!id) {
      return NextResponse.json({ error: 'Product ID or slug is required' }, { status: 400 });
    }

    const deleted = await deleteProduct(id);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    console.error('Admin product DELETE error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
