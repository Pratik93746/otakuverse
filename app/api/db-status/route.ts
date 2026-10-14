import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Admin-only connectivity check. Reveals no connection details or error text. */
export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
  }
  try {
    const db = await getDatabase();
    const [productsCount, ordersCount] = await Promise.all([
      db.collection('products').countDocuments(),
      db.collection('orders').countDocuments(),
    ]);
    return NextResponse.json({ status: 'CONNECTED', productsCount, ordersCount });
  } catch (err) {
    console.error('db-status failed:', err);
    return NextResponse.json({ status: 'CONNECTION_ERROR' }, { status: 503 });
  }
}
