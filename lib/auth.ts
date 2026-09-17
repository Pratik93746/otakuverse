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
        firebaseUid: { label: 'FirebaseUID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const cleanEmail = credentials.email.toLowerCase().trim();
        const isAdmin = isAllowedAdminEmail(cleanEmail);

        // Authenticated Firebase User Bridge
        if (credentials.firebaseUid) {
          const userName = credentials.name || cleanEmail.split('@')[0];

          // Check if user role is ADMIN in MongoDB
          let userRole: 'USER' | 'ADMIN' = isAdmin ? 'ADMIN' : 'USER';
          try {
            const { findUserByFirebaseUid } = await import('@/lib/db/users');
            const dbUser = await findUserByFirebaseUid(credentials.firebaseUid);
            if (dbUser && dbUser.role === 'ADMIN') {
              userRole = 'ADMIN';
            }
          } catch {
            // non-blocking
          }

          return {
            id: credentials.firebaseUid,
            email: cleanEmail,
            name: userName,
            image: null,
            role: userRole,
          } as NextAuthUser;
        }

        // Server-side fallback: Authenticate with Firebase Auth REST API directly
        // This bypasses client-side network failures, adblockers, and domain blocks
        if (credentials.password) {
          try {
            const apiKey =
              process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
              'AIzaSyAxbMtQKuTqUOndhEfkykmYmidgBTSjjME';
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
              const firebaseUid = fbData.localId;
              const userName = fbData.displayName || cleanEmail.split('@')[0];

              let userRole: 'USER' | 'ADMIN' = isAdmin ? 'ADMIN' : 'USER';
              try {
                const { findUserByFirebaseUid, upsertUser } = await import('@/lib/db/users');
                const dbUser = await findUserByFirebaseUid(firebaseUid);
                if (dbUser && dbUser.role === 'ADMIN') {
                  userRole = 'ADMIN';
                } else if (!dbUser) {
                  await upsertUser(firebaseUid, {
                    email: cleanEmail,
                    name: userName,
                    role: userRole,
                  });
                }
              } catch {
                // non-blocking
              }

              return {
                id: firebaseUid,
                email: cleanEmail,
                name: userName,
                image: null,
                role: userRole,
              } as NextAuthUser;
            }
          } catch (err) {
            console.error('Server-side Firebase auth fallback failed:', err);
          }
        }

        return null;
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
  secret: process.env.NEXTAUTH_SECRET ?? 'otakuverse-secret-key-32-chars-minimum',
};
