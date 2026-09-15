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
      if (verified && (verified.admin || isAllowedAdminEmail(verified.email))) {
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
      // Strict check: role must be ADMIN AND email must be in configured allowed admins
      if (role === 'ADMIN' && isAllowedAdminEmail(email)) {
        return true;
      }
    }
  } catch {
    // ignore
  }

  return false;
}
