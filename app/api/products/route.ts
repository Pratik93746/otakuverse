import { NextRequest, NextResponse } from 'next/server';
import { getProducts, ProductQueryOptions } from '@/lib/db/products';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const limit = Math.min(48, parseInt(sp.get('limit') ?? '24', 10));

    const options: ProductQueryOptions = {
      page,
      limit,
      filter: sp.get('filter') || undefined,
      category: sp.get('category') || undefined,
      anime: sp.get('anime') || undefined,
      brand: sp.get('brand') || undefined,
      character: sp.get('character') || undefined,
      minPrice: sp.get('minPrice') ? parseFloat(sp.get('minPrice')!) : undefined,
      maxPrice: sp.get('maxPrice') ? parseFloat(sp.get('maxPrice')!) : undefined,
      search: sp.get('q') || undefined,
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
