import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const PHONE = /^[6-9]\d{9}$/;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'notify-stock', 5);
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } });
  }
  try {
    const body = await request.json().catch(() => null);
    const contact = typeof body?.contact === 'string' ? body.contact.trim().slice(0, 254) : '';
    const productSlug = typeof body?.productSlug === 'string' ? body.productSlug.trim().slice(0, 200) : '';
    const productName = typeof body?.productName === 'string' ? body.productName.trim().slice(0, 200) : '';

    if (!productSlug || !(EMAIL.test(contact) || PHONE.test(contact.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')))) {
      return NextResponse.json({ error: 'Please enter a valid email address or 10-digit mobile number.' }, { status: 400 });
    }

    const col = await getCollection('stock_notifications');
    await col.updateOne(
      { contact: contact.toLowerCase(), productSlug },
      { $setOnInsert: { contact: contact.toLowerCase(), productSlug, productName, notified: false, createdAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ success: true, message: 'Stock notification alert saved' });
  } catch (err) {
    console.error('Notify stock error:', err);
    return NextResponse.json({ error: 'Could not save your request. Please try again.' }, { status: 500 });
  }
}
