import { rateLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/db/products';

export async function GET(request: NextRequest) {
  { const rl = rateLimit(request, 'search', 60); if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }); }
  const searchParams = request.nextUrl.searchParams;
  const q = (searchParams.get('q')?.trim() ?? '').slice(0, 100);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  try {
    const result = await getProducts({ search: q, limit });

    return NextResponse.json({
      products: result.products.map((p) => ({
        id: p._id?.toString() || (p as any).id || p.slug,
        name: p.name,
        slug: p.slug,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        image: p.image || p.images?.[0] || null,
        characterName: p.characterName ?? null,
        animeName: p.animeName ?? null,
        brandName: p.brandName ?? null,
      })),
    });
  } catch (error) {
    console.error('Search error in MongoDB:', error);
    return NextResponse.json({ products: [] });
  }
}
