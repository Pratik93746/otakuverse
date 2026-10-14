import { NextRequest } from 'next/server';
import { requireAdminUser, isAllowedAdminEmail } from '@/lib/firebase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Robust, unified Admin verification for API endpoints.
 * Enforces dual-check:
 * 1. Valid Firebase Bearer Token with admin rights, OR
 * 2. Active NextAuth Server Session with role === 'ADMIN' AND verified allowed admin email.
 */
export async function verifyAdminRequest(request: NextRequest): Promise<boolean> {
  // 1. Verify Firebase Bearer Token
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const verified = await requireAdminUser(request);
      if (verified) {
        return true;
      }
    } catch {
      // fallback to NextAuth session
    }
  }

  // 2. Verify NextAuth session cookie
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const email = session.user.email?.toLowerCase().trim();
      const role = session.user.role;
      const userId = (session.user as any).firebaseUid || (session.user as any).id;

      // Check MongoDB user role directly for authoritative server-side check
      if (userId) {
        try {
          const { findUserByFirebaseUid } = await import('@/lib/db/users');
          const dbUser = await findUserByFirebaseUid(userId);
          if (dbUser && dbUser.role === 'ADMIN') {
            return true;
          }
        } catch {
          // ignore
        }
      }

      if (role === 'ADMIN' && email && isAllowedAdminEmail(email, true)) {
        return true;
      }
    }
  } catch {
    // ignore
  }

  return false;
}
