import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser, handleAuthError } from '@/lib/firebase-admin';
import { getCartByFirebaseUid, syncCart, clearCart } from '@/lib/db/carts';

export async function GET(request: NextRequest) {
  try {
    const verifiedUser = await requireFirebaseUser(request);
    const cart = await getCartByFirebaseUid(verifiedUser.uid);

    return NextResponse.json({
      cart: cart || {
        firebaseUid: verifiedUser.uid,
        items: [],
        subtotal: 0,
        totalItems: 0,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const verifiedUser = await requireFirebaseUser(request);
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }

    const updatedCart = await syncCart(verifiedUser.uid, items);
    return NextResponse.json({ cart: updatedCart });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const verifiedUser = await requireFirebaseUser(request);
    await clearCart(verifiedUser.uid);

    return NextResponse.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    return handleAuthError(err);
  }
}
