import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser, handleAuthError } from '@/lib/firebase-admin';
import { findUserByFirebaseUid, upsertUser } from '@/lib/db/users';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function resolveUser(request: NextRequest): Promise<{ uid: string; email?: string; name?: string; picture?: string } | null> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const fbUser = await requireFirebaseUser(request);
      if (fbUser?.uid) {
        return {
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.name,
          picture: fbUser.picture,
        };
      }
    } catch {
      // fallback
    }
  }

  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const uid = (session.user as any).firebaseUid || (session.user as any).id || session.user.email || '';
      if (uid) {
        return {
          uid,
          email: session.user.email || undefined,
          name: session.user.name || undefined,
          picture: session.user.image || undefined,
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const verifiedUser = await resolveUser(request);
    if (!verifiedUser?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let user = await findUserByFirebaseUid(verifiedUser.uid);

    if (!user) {
      // Create user if missing
      user = await upsertUser(verifiedUser.uid, {
        email: verifiedUser.email || `${verifiedUser.uid}@collector.baka.style`,
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
    const verifiedUser = await resolveUser(request);
    if (!verifiedUser?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, image } = body;

    const updatedUser = await upsertUser(verifiedUser.uid, {
      email: verifiedUser.email || `${verifiedUser.uid}@collector.baka.style`,
      name: name || verifiedUser.name || 'Collector',
      phone,
      image: image || verifiedUser.picture,
    });

    return NextResponse.json({ user: updatedUser });
  } catch (err) {
    return handleAuthError(err);
  }
}
