import { apiClient } from './client';

export async function getCurrentUser() {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.get('/api/v1/auth/me');
      return res.data || res;
    }
  } catch (err) {
    console.debug('Fallback to /api/users/profile:', err);
  }

  return await apiClient.get('/api/users/profile');
}

export async function updateProfile(data: any) {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.patch('/api/v1/auth/me', data);
      return res.data || res;
    }
  } catch (err) {
    console.debug('Fallback to /api/users/profile:', err);
  }

  return await apiClient.patch('/api/users/profile', data);
}

export async function addAddress(addressData: any) {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.post('/api/v1/auth/addresses', addressData);
      return res.data || res;
    }
  } catch (err) {
    console.debug('Fallback to /api/addresses:', err);
  }

  return await apiClient.post('/api/addresses', addressData);
}
