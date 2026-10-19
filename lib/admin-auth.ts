import { NextRequest } from 'next/server';
import { requireAdminUser, isAllowedAdminEmail } from '@/lib/firebase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface AdminActor {
  uid: string;
  /** Verified email when known; used to attribute audit entries. */
  email: string;
}

/**
 * Server-side admin authentication for API endpoints. Returns who the admin is, or null.
 * Accepted proofs (checked on every request, never cached):
 * 1. A valid Firebase Bearer token with admin claim, verified allow-listed email or DB role ADMIN.
 * 2. A NextAuth session whose uid has DB role ADMIN, or whose JWT role is ADMIN AND whose
 *    email is on the verified-email ADMIN_EMAILS allow-list.
 */
export async function authenticateAdmin(request: NextRequest): Promise<AdminActor | null> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const verified = await requireAdminUser(request);
      if (verified) return { uid: verified.uid, email: (verified.email || '').toLowerCase() };
    } catch {
      // fall through to the session cookie
    }
  }

  return authenticateAdminSession();
}

/**
 * Same re-verification as the API, for server-rendered admin pages: the role stored in the login
 * cookie is never trusted on its own (it can be up to 7 days old).
 */
export async function authenticateAdminSession(): Promise<AdminActor | null> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const email = session.user.email?.toLowerCase().trim() || '';
      const role = session.user.role;
      const userId = (session.user as any).firebaseUid || (session.user as any).id;

      if (userId) {
        try {
          const { findUserByFirebaseUid } = await import('@/lib/db/users');
          const dbUser = await findUserByFirebaseUid(userId);
          if (dbUser && dbUser.role === 'ADMIN') return { uid: userId, email: email || dbUser.email };
        } catch {
          // ignore
        }
      }

      // The email is only trusted because lib/auth.ts issues role ADMIN solely for
      // identities whose email Firebase reports as verified.
      if (role === 'ADMIN' && email && userId && isAllowedAdminEmail(email, true)) {
        return { uid: userId, email };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function verifyAdminRequest(request: NextRequest): Promise<boolean> {
  return (await authenticateAdmin(request)) !== null;
}
