import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { releaseExpiredReservations } from '@/lib/db/orders';

export const dynamic = 'force-dynamic';

/** Called by Vercel Cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  const ok =
    !!secret && secret.length >= 16 && given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const released = await releaseExpiredReservations(200);
    return NextResponse.json({ released });
  } catch (err) {
    console.error('Reservation cron failed:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
