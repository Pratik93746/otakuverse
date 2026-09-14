import { auth } from '@/lib/firebase';

/**
 * Retrieve the current Firebase User's ID token, or null if unauthenticated
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !auth) return null;

  try {
    // Wait for auth to initialize if state is resolving
    if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
      await (auth as any).authStateReady();
    }

    const user = auth.currentUser;
    if (!user) return null;

    return await user.getIdToken();
  } catch (err) {
    console.debug('Failed to get Firebase ID token:', err);
    return null;
  }
}

/**
 * Fetch wrapper that automatically attaches the verified Firebase ID Token Bearer
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = await getFirebaseIdToken();

  const headers = new Headers(init?.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
