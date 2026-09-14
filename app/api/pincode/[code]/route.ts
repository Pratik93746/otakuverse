import { NextRequest, NextResponse } from 'next/server';

interface PincodeResult {
  valid: boolean;
  pincode: string;
  city?: string;
  district?: string;
  state?: string;
  postOffices?: string[];
  message?: string;
}

// Simple in-memory cache for fast lookups
const pincodeCache = new Map<string, PincodeResult>();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cleanPin = (code || '').trim().replace(/\D/g, '');

    // 1. PIN code must be exactly 6 digits and not start with 0
    if (!/^[1-9]\d{5}$/.test(cleanPin)) {
      return NextResponse.json(
        {
          valid: false,
          pincode: cleanPin,
          message: 'PIN code must be a 6-digit Indian postal code starting with 1-9',
        },
        { status: 400 }
      );
    }

    // 2. Check Cache
    if (pincodeCache.has(cleanPin)) {
      return NextResponse.json(pincodeCache.get(cleanPin)!);
    }

    // 3. Query India Post API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const entry = data[0];
          if (entry.Status === 'Success' && Array.isArray(entry.PostOffice) && entry.PostOffice.length > 0) {
            const offices = entry.PostOffice;
            const state = offices[0].State || '';
            const district = offices[0].District || '';
            const city = district || offices[0].Block || offices[0].Division || '';
            const postOffices = offices.map((o: { Name: string }) => o.Name).filter(Boolean);

            const result: PincodeResult = {
              valid: true,
              pincode: cleanPin,
              city,
              district,
              state,
              postOffices: postOffices.slice(0, 5),
              message: `Verified: ${city}, ${state}`,
            };

            pincodeCache.set(cleanPin, result);
            return NextResponse.json(result);
          } else if (entry.Status === 'Error' || entry.PostOffice === null) {
            const result: PincodeResult = {
              valid: false,
              pincode: cleanPin,
              message: 'PIN code not found in Indian Postal database',
            };
            return NextResponse.json(result, { status: 404 });
          }
        }
      }
    } catch {
      // If external API times out or fails, accept 6-digit Indian PIN zone format
    }

    // Fallback: If external API timed out but format is valid 6 digits (1-9 starting), return valid
    const fallbackResult: PincodeResult = {
      valid: true,
      pincode: cleanPin,
      message: 'Valid 6-digit PIN code format',
    };
    return NextResponse.json(fallbackResult);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Pincode validation error';
    return NextResponse.json({ valid: false, message: errorMsg }, { status: 500 });
  }
}
