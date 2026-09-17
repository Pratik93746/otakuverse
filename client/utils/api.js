import { getAuth } from 'firebase/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Retrieve the current Firebase Auth user's ID token dynamically.
 * Automatically forces refresh if the token has expired.
 */
async function getAuthToken() {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      return await currentUser.getIdToken(false);
    }
    return null;
  } catch (error) {
    console.error('[API Client] Error retrieving Firebase ID token:', error);
    return null;
  }
}

/**
 * Core HTTP request handler with automatic Bearer token injection and error parsing.
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.message || `HTTP error ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`[API Client] Request failed for ${url}:`, error);
    throw error;
  }
}

export const api = {
  get: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    }),

  put: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    }),

  delete: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: 'DELETE' })
};

export default api;
