import { auth } from '@/lib/firebase';

const getBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return '';
};

/**
 * Retrieve current Firebase ID Token dynamically with automatic authStateReady check
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !auth) return null;

  try {
    if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
      await (auth as any).authStateReady();
    }
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (err) {
    console.debug('[API Client] Token retrieval skipped:', err);
    return null;
  }
}

export interface ApiOptions extends RequestInit {
  params?: Record<string, any>;
}

/**
 * Standard HTTP request wrapper with automatic Bearer token injection
 */
export async function apiRequest<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  let url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = json?.error?.message || json?.error || json?.message || `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(errorMsg) as any;
    error.status = response.status;
    error.code = json?.error?.code;
    error.data = json;
    throw error;
  }

  return json;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: ApiOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: ApiOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: ApiOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string, options?: ApiOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default apiClient;
