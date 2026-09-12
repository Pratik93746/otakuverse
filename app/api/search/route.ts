import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') ?? '';
  const limit = parseInt(searchParams.get('limit') ?? '20');

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { character: { name: { contains: q, mode: 'insensitive' } } },
          { anime: { name: { contains: q, mode: 'insensitive' } } },
          { brand: { name: { contains: q, mode: 'insensitive' } } },
          { tags: { has: q.toLowerCase() } },
        ],
      },
      include: {
        images: { where: { isMain: true }, take: 1 },
        character: { select: { name: true } },
        anime: { select: { name: true } },
        brand: { select: { name: true } },
      },
      take: Math.min(limit, 50),
      orderBy: [{ isFeatured: 'desc' }, { salesCount: 'desc' }],
    });

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        image: p.images[0]?.url ?? null,
        characterName: p.character?.name ?? null,
        animeName: p.anime?.name ?? null,
        brandName: p.brand?.name ?? null,
      })),
    });
  } catch (error) {
    // Fallback to custom products + mock products
    const { getAllCustomProductsAsync } = await import('@/lib/customProductsStore');
    const { MOCK_PRODUCTS } = await import('@/lib/mockProducts');
    const custom = await getAllCustomProductsAsync();
    const all = [...custom, ...MOCK_PRODUCTS];

    const qLower = q.toLowerCase();
    const matched = all
      .filter((p) =>
        p.name.toLowerCase().includes(qLower) ||
        (p.characterName?.toLowerCase() ?? '').includes(qLower) ||
        (p.animeName?.toLowerCase() ?? '').includes(qLower) ||
        (p.categoryName?.toLowerCase() ?? '').includes(qLower)
      )
      .slice(0, Math.min(limit, 50));

    return NextResponse.json({
      products: matched.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        image: (p as any).image ?? (p as any).images?.[0] ?? null,
        characterName: p.characterName ?? null,
        animeName: p.animeName ?? null,
        brandName: p.brandName ?? null,
      })),
    });
  }
}
