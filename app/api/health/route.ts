import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/** Public uptime probe for monitors: only "ok" or "degraded", nothing about the system. */
export async function GET() {
  try {
    await (await getDatabase()).command({ ping: 1 });
    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error(JSON.stringify({ event: 'health.db_down', message: (err as Error)?.message }));
    return NextResponse.json({ status: 'degraded' }, { status: 503 });
  }
}
