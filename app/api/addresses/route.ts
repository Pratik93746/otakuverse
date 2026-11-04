import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser, handleAuthError } from '@/lib/firebase-admin';
import { getUserAddresses, saveAddress, deleteAddress } from '@/lib/db/addresses';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function resolveUser(request: NextRequest): Promise<{ uid: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const fbUser = await requireFirebaseUser(request);
      if (fbUser?.uid) return { uid: fbUser.uid, email: fbUser.email };
    } catch {
      // fallback to NextAuth session
    }
  }

  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const uid = (session.user as any).firebaseUid || (session.user as any).id || session.user.email || '';
      if (uid) return { uid, email: session.user.email || undefined };
    }
  } catch {
    // ignore
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await resolveUser(request);
    if (!user?.uid) {
      return NextResponse.json({ error: 'Unauthorized: Sign in required' }, { status: 401 });
    }

    const addresses = await getUserAddresses(user.uid);

    return NextResponse.json({
      addresses: addresses.map((a) => ({
        id: a._id?.toString(),
        userId: a.firebaseUid,
        firebaseUid: a.firebaseUid,
        fullName: a.fullName,
        phone: a.phone,
        addressLine1: a.addressLine1,
        addressLine2: a.addressLine2,
        city: a.city,
        state: a.state,
        pinCode: a.pinCode,
        country: a.country,
        isDefault: a.isDefault,
        createdAt: a.createdAt?.toISOString(),
        updatedAt: a.updatedAt?.toISOString(),
      })),
    });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveUser(request);
    if (!user?.uid) {
      return NextResponse.json({ error: 'Unauthorized: Sign in required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const {
      fullName,
      name,
      phone,
      addressLine1,
      line1,
      addressLine2,
      line2,
      city,
      state,
      pinCode,
      pincode,
      country,
      isDefault,
      id,
    } = body;

    const finalName = fullName || name;
    const finalPhone = phone;
    const finalLine1 = addressLine1 || line1;
    const finalLine2 = addressLine2 || line2 || '';
    const finalCity = city;
    const finalState = state;
    const finalPin = pinCode || pincode;
    const finalCountry = country || 'India';

    const textFields = [finalName, finalPhone, finalLine1, finalLine2, finalCity, finalState, finalPin, finalCountry];
    if (textFields.some((v) => typeof v !== 'string' || v.length > 200) || (id !== undefined && typeof id !== 'string')) {
      return NextResponse.json({ error: 'Address fields must be text of reasonable length' }, { status: 400 });
    }

    if (!finalName || !finalPhone || !finalLine1 || !finalCity || !finalState || !finalPin) {
      return NextResponse.json(
        { error: 'Missing required address fields' },
        { status: 400 }
      );
    }

    if (!/^[6-9]\d{9}$/.test(finalPhone.trim().replace(/\D/g, ''))) {
      return NextResponse.json(
        { error: 'Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9' },
        { status: 400 }
      );
    }

    if (!/^[1-9]\d{5}$/.test(finalPin.trim().replace(/\D/g, ''))) {
      return NextResponse.json(
        { error: 'PIN Code must be a valid 6-digit Indian postal PIN code starting with 1-9' },
        { status: 400 }
      );
    }

    if (finalLine1.trim().length < 5) {
      return NextResponse.json(
        { error: 'Street address must be at least 5 characters long' },
        { status: 400 }
      );
    }

    if (!id) {
      const existing = await getUserAddresses(user.uid);
      if (existing.length >= 15) {
        return NextResponse.json(
          { error: 'Maximum 15 saved addresses allowed per account. Please remove an old address.' },
          { status: 400 }
        );
      }
    }

    const saved = await saveAddress(
      user.uid,
      {
        fullName: finalName.trim(),
        phone: finalPhone.trim(),
        addressLine1: finalLine1.trim(),
        addressLine2: finalLine2.trim(),
        city: finalCity.trim(),
        state: finalState.trim(),
        pinCode: finalPin.trim(),
        country: finalCountry.trim(),
        isDefault: !!isDefault,
      },
      id
    );

    return NextResponse.json({
      success: true,
      address: {
        id: saved._id?.toString(),
        userId: saved.firebaseUid,
        firebaseUid: saved.firebaseUid,
        fullName: saved.fullName,
        phone: saved.phone,
        addressLine1: saved.addressLine1,
        addressLine2: saved.addressLine2,
        city: saved.city,
        state: saved.state,
        pinCode: saved.pinCode,
        country: saved.country,
        isDefault: saved.isDefault,
        createdAt: saved.createdAt?.toISOString(),
        updatedAt: saved.updatedAt?.toISOString(),
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await resolveUser(request);
    if (!user?.uid) {
      return NextResponse.json({ error: 'Unauthorized: Sign in required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
    }

    const deleted = await deleteAddress(addressId, user.uid);
    if (!deleted) {
      return NextResponse.json({ error: 'Address not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Address removed' });
  } catch (err) {
    return handleAuthError(err);
  }
}
