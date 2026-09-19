import { apiClient } from './client';

export async function getCart() {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.get('/api/v1/cart');
      return res.data || res.cart;
    }
  } catch (err) {
    console.debug('Fallback to /api/cart:', err);
  }

  const res = await apiClient.get('/api/cart');
  return res.cart || res.data || res;
}

export async function addToCart(productId: string, quantity = 1) {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.post('/api/v1/cart/items', { productId, quantity });
      return res.data;
    }
  } catch (err) {
    console.debug('Fallback to /api/cart:', err);
  }

  const res = await apiClient.post('/api/cart', { items: [{ productId, quantity }] });
  return res.cart || res.data;
}

export async function updateCartItem(productId: string, quantity: number) {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.patch(`/api/v1/cart/items/${productId}`, { quantity });
      return res.data;
    }
  } catch (err) {
    console.debug('Fallback to /api/cart:', err);
  }

  return await getCart();
}

export async function removeCartItem(productId: string) {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.delete(`/api/v1/cart/items/${productId}`);
      return res.data;
    }
  } catch (err) {
    console.debug('Fallback to /api/cart:', err);
  }

  return await getCart();
}

export async function clearCart() {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.delete('/api/v1/cart');
      return res.data;
    }
  } catch (err) {
    console.debug('Fallback to /api/cart:', err);
  }

  return await apiClient.delete('/api/cart');
}
