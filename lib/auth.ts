import { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { isAllowedAdminEmail } from '@/lib/firebase-admin';

/**
 * Read a Firebase account using an ID token Firebase issued. Returns the account's
 * own record, including whether the email address has been verified.
 */
async function lookupFirebaseAccount(idToken: string): Promise<{
  uid: string; email: string | null; emailVerified: boolean; displayName?: string;
} | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const u = data?.users?.[0];
  if (!u?.localId) return null;
  const email = typeof u.email === 'string' ? u.email.toLowerCase().trim() : null;
  return { uid: u.localId, email, emailVerified: !!email && u.emailVerified === true, displayName: u.displayName };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        authType: { label: 'AuthType', type: 'text' },
        idToken: { label: 'IdToken', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const cleanEmail = credentials.email.toLowerCase().trim();
        let verifiedUid: string | null = null;
        let verifiedEmail: string | null = null;
        let verifiedName: string = credentials.name || cleanEmail.split('@')[0];
        let isEmailVerified = false;

        // 1. Verify via cryptographic Firebase ID Token if supplied.
        //    Identity (uid, email, email_verified) comes only from the verified token,
        //    never from the email the browser typed.
        if (credentials.idToken) {
          try {
            const { adminAuth } = await import('@/lib/firebase-admin');
            if (adminAuth) {
              const decoded = await adminAuth.verifyIdToken(credentials.idToken);
              if (decoded && decoded.uid) {
                verifiedUid = decoded.uid;
                verifiedEmail = decoded.email ? decoded.email.toLowerCase().trim() : null;
                verifiedName = decoded.name || verifiedName;
                isEmailVerified = !!decoded.email && decoded.email_verified === true;
              }
            } else {
              const account = await lookupFirebaseAccount(credentials.idToken);
              if (account) {
                verifiedUid = account.uid;
                verifiedEmail = account.email;
                verifiedName = account.displayName || verifiedName;
                isEmailVerified = account.emailVerified;
              }
            }
          } catch (tokenErr) {
            console.warn('⚠️ ID Token verification failed:', (tokenErr as Error)?.message);
          }
        }

        // 2. Server-side fallback: password sign-in via Firebase Auth REST API.
        //    A successful password sign-in proves the password, NOT ownership of the
        //    mailbox (`registered` is always true on success). Email verification is
        //    read from Firebase's account record using the token Firebase just issued.
        if (!verifiedUid && credentials.password) {
          try {
            const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
            if (!apiKey) {
              console.warn('⚠️ NEXT_PUBLIC_FIREBASE_API_KEY not set, skipping password auth fallback');
              return null;
            }
            const fbRes = await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: cleanEmail,
                  password: credentials.password,
                  returnSecureToken: true,
                }),
                signal: AbortSignal.timeout(8000),
              }
            );

            const fbData = await fbRes.json();
            if (fbRes.ok && fbData.localId && fbData.idToken) {
              const account = await lookupFirebaseAccount(fbData.idToken);
              if (account && account.uid === fbData.localId) {
                verifiedUid = account.uid;
                verifiedEmail = account.email;
                verifiedName = account.displayName || fbData.displayName || cleanEmail.split('@')[0];
                isEmailVerified = account.emailVerified;
              }
            }
          } catch (err) {
            console.error('Server-side Firebase auth fallback failed:', (err as Error)?.message);
          }
        }

        // If neither valid token nor valid password succeeded, deny access
        if (!verifiedUid) {
          return null;
        }

        // Check if user role is ADMIN in MongoDB or verified admin email
        const isAllowedAdmin = isAllowedAdminEmail(verifiedEmail, isEmailVerified);
        let userRole: 'USER' | 'ADMIN' = 'USER';
        try {
          const { findUserByFirebaseUid, upsertUser } = await import('@/lib/db/users');
          const dbUser = await findUserByFirebaseUid(verifiedUid);
          if (dbUser && dbUser.role === 'ADMIN') {
            userRole = 'ADMIN';
          } else if (isAllowedAdmin) {
            userRole = 'ADMIN';
          } else if (!dbUser) {
            await upsertUser(verifiedUid, {
              email: verifiedEmail || `${verifiedUid}@users.noemail`,
              name: verifiedName,
              role: 'USER',
            });
          }
        } catch {
          // non-blocking
        }

        return {
          id: verifiedUid,
          email: verifiedEmail,
          name: verifiedName,
          image: null,
          role: userRole,
        } as NextAuthUser;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    // Shorter than the 30-day default so a removed admin's cookie expires sooner.
    // Admin APIs still re-check the database role / verified allowlist on every call.
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? 'USER';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: NEXTAUTH_SECRET environment variable is required in production. Set it in Vercel Environment Variables.');
    }
    return 'dev-only-nextauth-secret-never-use-in-production-32chars';
  })(),
};
