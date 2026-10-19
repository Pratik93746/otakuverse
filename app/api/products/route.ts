import { NextRequest, NextResponse } from 'next/server';
import { getProducts, ProductQueryOptions } from '@/lib/db/products';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
    const limit = Math.min(48, Math.max(1, parseInt(sp.get('limit') ?? '24', 10) || 24));
    const num = (key: string) => {
      const n = parseFloat(sp.get(key) ?? '');
      return Number.isFinite(n) && n >= 0 ? n : undefined;
    };
    const short = (key: string) => (sp.get(key) || '').slice(0, 100) || undefined;

    const options: ProductQueryOptions = {
      page,
      limit,
      filter: short('filter'),
      category: short('category'),
      anime: short('anime'),
      brand: short('brand'),
      character: short('character'),
      minPrice: num('minPrice'),
      maxPrice: num('maxPrice'),
      search: short('q'),
      sort: sp.get('sort') || 'featured',
      inStock: sp.get('inStock') === 'true',
    };

    const result = await getProducts(options);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Failed to fetch products from MongoDB:', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
