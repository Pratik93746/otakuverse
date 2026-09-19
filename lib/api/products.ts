import { apiClient } from './client';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  anime?: string;
  brand?: string;
  filter?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
  q?: string;
}

export async function getProducts(params: ProductQueryParams = {}) {
  try {
    // Try Express v1 API first if NEXT_PUBLIC_API_URL configured
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.get('/api/v1/products', { params });
      return {
        products: res.data || [],
        pagination: res.pagination || { page: 1, limit: 24, total: (res.data || []).length, totalPages: 1 },
      };
    }
  } catch (err) {
    console.debug('Fallback to relative /api/products:', err);
  }

  // Seamless fallback to Next.js route handler
  const res = await apiClient.get('/api/products', { params });
  return {
    products: res.products || res.data || [],
    pagination: res.pagination || { page: 1, limit: 24, total: 0, totalPages: 1 },
  };
}

export async function getProductBySlug(slug: string) {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.get(`/api/v1/products/slug/${slug}`);
      if (res.data) return res.data;
    }
  } catch (err) {
    console.debug('Fallback to relative product lookup:', err);
  }

  const res = await apiClient.get(`/api/products/${slug}`);
  return res.product || res.data || res;
}

export async function getProductById(id: string) {
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const res = await apiClient.get(`/api/v1/products/${id}`);
      if (res.data) return res.data;
    }
  } catch (err) {
    console.debug('Fallback to relative product lookup:', err);
  }

  const res = await apiClient.get(`/api/products/${id}`);
  return res.product || res.data || res;
}
