import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { verifyAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
  }

  const rawUri = process.env.MONGODB_URI || '';
  const hasUri = rawUri.trim().length > 0;
  const sanitizedHost = rawUri.includes('@') ? rawUri.split('@')[1]?.split('/')[0] : 'NO_HOST';

  if (!hasUri) {
    return NextResponse.json({
      status: 'MISSING_ENV_VAR',
      message: 'MONGODB_URI is not set in Vercel Environment Variables',
      hasUri: false,
    }, { status: 500 });
  }

  try {
    const client = await getMongoClient();
    const db = client.db('otakuverse');
    const [productsCount, ordersCount] = await Promise.all([
      db.collection('products').countDocuments(),
      db.collection('orders').countDocuments(),
    ]);

    return NextResponse.json({
      status: 'CONNECTED',
      hasUri: true,
      clusterHost: sanitizedHost,
      productsCount,
      ordersCount,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'CONNECTION_ERROR',
      hasUri: true,
      clusterHost: sanitizedHost,
      errorName: err?.name || 'Error',
      errorMessage: err?.message || String(err),
    }, { status: 500 });
  }
}
