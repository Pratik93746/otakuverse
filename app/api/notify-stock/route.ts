import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { contact, productName, productSlug } = await request.json();

    if (!contact || !productSlug) {
      return NextResponse.json({ error: 'Contact and product slug are required' }, { status: 400 });
    }

    const col = await getCollection('stock_notifications');
    await col.insertOne({
      contact: contact.trim(),
      productName,
      productSlug,
      notified: false,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Stock notification alert saved' });
  } catch (err: any) {
    console.error('Notify stock error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
