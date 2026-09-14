import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser, handleAuthError } from '@/lib/firebase-admin';
import { findUserByFirebaseUid, upsertUser } from '@/lib/db/users';

export async function GET(request: NextRequest) {
  try {
    const verifiedUser = await requireFirebaseUser(request);
    let user = await findUserByFirebaseUid(verifiedUser.uid);

    if (!user) {
      // Create user if missing
      user = await upsertUser(verifiedUser.uid, {
        email: verifiedUser.email || `${verifiedUser.uid}@collector.otakuverse.com`,
        name: verifiedUser.name || verifiedUser.email?.split('@')[0] || 'Collector',
        image: verifiedUser.picture,
      });
    }

    return NextResponse.json({ user });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const verifiedUser = await requireFirebaseUser(request);
    const body = await request.json();

    const { name, phone, image } = body;

    const updatedUser = await upsertUser(verifiedUser.uid, {
      email: verifiedUser.email || `${verifiedUser.uid}@collector.otakuverse.com`,
      name,
      phone,
      image,
    });

    return NextResponse.json({ user: updatedUser });
  } catch (err) {
    return handleAuthError(err);
  }
}
