import { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { isAllowedAdminEmail } from '@/lib/firebase-admin';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
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

        // 1. Verify via cryptographic Firebase ID Token if supplied
        if (credentials.idToken) {
          try {
            const { adminAuth } = await import('@/lib/firebase-admin');
            if (adminAuth) {
              const decoded = await adminAuth.verifyIdToken(credentials.idToken);
              if (decoded && decoded.uid) {
                verifiedUid = decoded.uid;
                verifiedEmail = (decoded.email || cleanEmail).toLowerCase().trim();
                verifiedName = decoded.name || verifiedName;
                isEmailVerified = !!decoded.email_verified;
              }
            } else {
              // Fallback to Google Identity Toolkit token lookup
              const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
              if (!apiKey) {
                console.warn('⚠️ NEXT_PUBLIC_FIREBASE_API_KEY not set, skipping Identity Toolkit lookup');
                return null;
              }
              const lookupRes = await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ idToken: credentials.idToken }),
                }
              );
              const lookupData = await lookupRes.json();
              if (lookupRes.ok && lookupData.users?.[0]?.localId) {
                const u = lookupData.users[0];
                verifiedUid = u.localId;
                verifiedEmail = (u.email || cleanEmail).toLowerCase().trim();
                verifiedName = u.displayName || verifiedName;
                isEmailVerified = !!u.emailVerified;
              }
            }
          } catch (tokenErr) {
            console.warn('⚠️ ID Token verification failed:', tokenErr);
          }
        }

        // 2. Server-side fallback: Authenticate with Firebase Auth REST API with verified password
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
              }
            );

            const fbData = await fbRes.json();
            if (fbRes.ok && fbData.localId) {
              verifiedUid = fbData.localId;
              verifiedEmail = cleanEmail;
              verifiedName = fbData.displayName || cleanEmail.split('@')[0];
              // Email/password login only verified if registered or verified
              isEmailVerified = !!fbData.registered;
            }
          } catch (err) {
            console.error('Server-side Firebase auth fallback failed:', err);
          }
        }

        // If neither valid token nor valid password succeeded, deny access
        if (!verifiedUid) {
          return null;
        }

        // Check if user role is ADMIN in MongoDB or verified admin email
        const isAllowedAdmin = isAllowedAdminEmail(verifiedEmail || cleanEmail, isEmailVerified);
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
              email: verifiedEmail || cleanEmail,
              name: verifiedName,
              role: 'USER',
            });
          }
        } catch {
          // non-blocking
        }

        return {
          id: verifiedUid,
          email: verifiedEmail || cleanEmail,
          name: verifiedName,
          image: null,
          role: userRole,
        } as NextAuthUser;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
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
