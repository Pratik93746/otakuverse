import { apiClient } from './client';

export async function createOrder(orderData: any) {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.post('/api/v1/orders', orderData);
      return res.data || res;
    }
  } catch (err) {
    console.debug('Fallback to /api/orders:', err);
  }

  return await apiClient.post('/api/orders', orderData);
}

export async function getUserOrders(params?: any) {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.get('/api/v1/orders', { params });
      return res.data || res.orders || [];
    }
  } catch (err) {
    console.debug('Fallback to /api/orders:', err);
  }

  const res = await apiClient.get('/api/orders', { params });
  return res.orders || res.data || [];
}

export async function getOrderById(orderId: string) {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.get(`/api/v1/orders/${orderId}`);
      return res.data || res;
    }
  } catch (err) {
    console.debug('Fallback to /api/orders/[id]:', err);
  }

  return await apiClient.get(`/api/orders/${orderId}`);
}
