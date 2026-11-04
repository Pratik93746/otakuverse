import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'otakuverse-5fa52';

const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
  try {
    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } else {
      admin.initializeApp({
        projectId,
      });
    }
  } catch (initErr) {
    console.warn('⚠️ [Firebase Admin] Initialization notice:', initErr);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  admin?: boolean;
  role?: string;
  decodedToken: admin.auth.DecodedIdToken;
}

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AuthError';
  }
}

/**
 * Extract and verify Firebase ID Token from Authorization header
 */
export async function verifyBearerToken(authHeader: string | null): Promise<VerifiedFirebaseUser> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or malformed Authorization header. Expected Bearer <token>', 401);
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    throw new AuthError('Empty Firebase ID token provided', 401);
  }

  if (!adminAuth) {
    throw new AuthError('Firebase Admin SDK is not initialized on the server', 500);
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      admin: !!decodedToken.admin,
      role: (decodedToken.role as string) || (decodedToken.admin ? 'ADMIN' : 'USER'),
      decodedToken,
    };
  } catch (err: any) {
    console.error('❌ [Firebase Admin] Token verification failed:', err?.message || err);
    throw new AuthError('Invalid or expired Firebase ID token', 401);
  }
}

/**
 * Reusable server authentication helper to verify Firebase user on protected API routes
 */
export async function requireFirebaseUser(request: NextRequest): Promise<VerifiedFirebaseUser> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  return await verifyBearerToken(authHeader);
}

/**
 * Check if an email is in the allowed admin list.
 * CRITICAL: email must be explicitly verified by the identity provider.
 */
export function isAllowedAdminEmail(email?: string | null, emailVerified?: boolean): boolean {
  if (!email || !emailVerified) return false;
  const clean = email.toLowerCase().trim();
  const rawAdmins = process.env.ADMIN_EMAILS;
  if (!rawAdmins) return false;

  const configuredAdmins = rawAdmins
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  return configuredAdmins.includes(clean);
}

/**
 * Reusable server authorization helper to verify Admin status on protected routes.
 * Strictly verifies cryptographic custom claims, verified email whitelist, or verified DB role.
 */
export async function requireAdminUser(request: NextRequest): Promise<VerifiedFirebaseUser> {
  const user = await requireFirebaseUser(request);

  // 1. Cryptographic custom claims check (tamper-proof)
  if (user.decodedToken.admin === true || user.decodedToken.role === 'ADMIN' || user.admin === true || user.role === 'ADMIN') {
    return user;
  }

  // 2. Email whitelist check — MUST be verified by identity provider
  const isEmailVerified = !!user.decodedToken.email_verified;
  if (isEmailVerified && isAllowedAdminEmail(user.email, isEmailVerified)) {
    return user;
  }

  // 3. MongoDB user role check bound to verified UID
  try {
    const { findUserByFirebaseUid } = await import('@/lib/db/users');
    const dbUser = await findUserByFirebaseUid(user.uid);
    if (dbUser && dbUser.role === 'ADMIN') {
      return user;
    }
  } catch (dbErr) {
    console.warn('⚠️ [Firebase Admin] Error checking dbUser role:', dbErr);
  }

  throw new AuthError('Forbidden: Verified administrative access required', 403);
}

/**
 * Standardized JSON error response handler for API routes
 */
export function handleAuthError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  const msg = err instanceof Error ? err.message : 'Authentication failed';
  return NextResponse.json({ error: msg }, { status: 401 });
}
