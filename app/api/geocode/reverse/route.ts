import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    let line1 = '';
    let city = '';
    let state = '';
    let pincode = '';
    let country = 'India';

    // 1. Try OpenStreetMap Nominatim Reverse Geocoding
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'OtakuVerse-ECommerce/1.0 (contact: support@otakuverse.in)',
            'Accept-Language': 'en',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (osmRes.ok) {
        const data = await osmRes.json();
        const addr = data.address || {};

        const parts: string[] = [];
        if (addr.house_number) parts.push(addr.house_number);
        if (addr.building) parts.push(addr.building);
        if (addr.road) parts.push(addr.road);
        if (addr.suburb) parts.push(addr.suburb);
        if (addr.neighbourhood && !parts.includes(addr.neighbourhood)) parts.push(addr.neighbourhood);

        line1 = parts.join(', ') || data.name || '';
        city = addr.city || addr.town || addr.village || addr.state_district || addr.county || '';
        state = addr.state || '';
        pincode = (addr.postcode || '').replace(/\D/g, '').slice(0, 6);
        country = addr.country || 'India';
      }
    } catch {
      // Nominatim failed or timed out, fallback to BigDataCloud
    }

    // 2. Fallback to BigDataCloud if fields are missing
    if (!city || !state || !pincode) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (bdcRes.ok) {
          const bdc = await bdcRes.json();
          if (!line1 && bdc.locality) line1 = bdc.locality;
          if (!city) city = bdc.city || bdc.locality || '';
          if (!state) state = bdc.principalSubdivision || '';
          if (!pincode && bdc.postcode) pincode = bdc.postcode.replace(/\D/g, '').slice(0, 6);
          if (bdc.countryName) country = bdc.countryName;
        }
      } catch {
        // Fallback failed
      }
    }

    return NextResponse.json({
      success: true,
      address: {
        line1,
        city,
        state,
        pincode,
        country,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown geocoding error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
