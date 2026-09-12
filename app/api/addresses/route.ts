import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getFirestoreAddresses,
  saveFirestoreAddress,
  deleteFirestoreAddress,
} from '@/lib/firestore';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try Firestore first
    const addresses = await getFirestoreAddresses(userId);

    if (addresses.length > 0) {
      return NextResponse.json({ addresses });
    }

    // Fallback to Prisma if database configured
    try {
      const dbAddresses = await prisma.address.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({
        addresses: dbAddresses.map((a) => ({
          id: a.id,
          userId: a.userId,
          fullName: a.name,
          phone: a.phone,
          addressLine1: a.line1,
          addressLine2: a.line2 || undefined,
          city: a.city,
          state: a.state,
          pinCode: a.pincode,
          country: a.country,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        })),
      });
    } catch {
      return NextResponse.json({ addresses: [] });
    }
  } catch (err) {
    console.error('Error fetching addresses:', err);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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

    if (!finalName || !finalPhone || !finalLine1 || !finalCity || !finalState || !finalPin) {
      return NextResponse.json(
        { error: 'Missing required address fields' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(finalPin.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit Indian PIN code' },
        { status: 400 }
      );
    }

    const saved = await saveFirestoreAddress(
      userId,
      {
        fullName: finalName,
        phone: finalPhone,
        addressLine1: finalLine1,
        addressLine2: finalLine2,
        city: finalCity,
        state: finalState,
        pinCode: finalPin,
        country: finalCountry,
      },
      id
    );

    // Also persist in Prisma if available
    try {
      await prisma.address.create({
        data: {
          id: saved.id,
          userId,
          name: finalName,
          phone: finalPhone,
          line1: finalLine1,
          line2: finalLine2 || null,
          city: finalCity,
          state: finalState,
          pincode: finalPin,
          country: finalCountry,
        },
      });
    } catch {
      // ignore prisma fallback error
    }

    return NextResponse.json({ address: saved, success: true });
  } catch (err) {
    console.error('Error saving address:', err);
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
    }

    await deleteFirestoreAddress(addressId, userId);

    try {
      await prisma.address.delete({
        where: { id: addressId },
      });
    } catch {
      // ignore prisma fallback error
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting address:', err);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
