import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard/ProductCard';
import { User, ShoppingBag } from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';

interface Props {
  params: Promise<{ slug: string }> | { slug: string };
}

async function getCharacterData(slug: string) {
  try {
    const char = await prisma.character.findUnique({
      where: { slug },
      include: {
        anime: true,
        products: {
          where: { isPublished: true },
          include: {
            images: { where: { isMain: true }, take: 1 },
            character: true,
            anime: true,
            brand: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (char) return char;
  } catch {
    // database offline fallback
  }

  // Fallback to custom products + mock products search by character slug
  const { getAllCustomProductsAsync } = await import('@/lib/customProductsStore');
  const custom = await getAllCustomProductsAsync();
  const allProducts = [...custom, ...MOCK_PRODUCTS];

  const matchingProducts = allProducts.filter(
    (p) =>
      p.characterName?.toLowerCase().replace(/\s+/g, '-') === slug ||
      p.characterName?.toLowerCase().includes(slug.replace(/-/g, ' '))
  );

  const charName = matchingProducts[0]?.characterName ?? slug.replace(/-/g, ' ').toUpperCase();
  const animeName = matchingProducts[0]?.animeName ?? 'Anime Universe';

  return {
    id: slug,
    name: charName,
    slug,
    description: `Official authentic figures, posable statues, and collectibles featuring ${charName}.`,
    anime: { name: animeName, slug: (matchingProducts[0] as any)?.animeSlug ?? 'anime' },
    products: matchingProducts.length > 0 ? matchingProducts : MOCK_PRODUCTS.slice(0, 3),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const char = await getCharacterData(slug);
  if (!char) return { title: 'Character Not Found | OTAKUVERSE' };

  return {
    title: `${char.name} Figures & Statues | OTAKUVERSE`,
    description: `Shop authentic ${char.name} (${char.anime?.name ?? 'Anime'}) collectible figures, statues and merch.`,
  };
}

export default async function CharacterPage({ params }: Props) {
  const { slug } = await Promise.resolve(params);
  const char = await getCharacterData(slug);

  if (!char) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-950 text-white py-12 border-b border-gray-800">
        <div className="container-wide">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
            <Link href="/" className="hover:text-brand-red">Home</Link>
            <span>/</span>
            {char.anime && (
              <>
                <Link href={`/anime/${char.anime.slug}`} className="hover:text-brand-red">
                  {char.anime.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-white font-semibold">{char.name}</span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-brand-red" />
            <span className="text-xs font-bold tracking-[0.2em] text-brand-red uppercase">
              CHARACTER VAULT
            </span>
          </div>
          <h1 className="font-heading text-4xl sm:text-6xl tracking-widest uppercase">
            {char.name}
          </h1>
          {char.anime && (
            <p className="text-gray-400 text-sm mt-1">From Franchise: <strong className="text-white">{char.anime.name}</strong></p>
          )}
          {char.description && (
            <p className="text-gray-300 text-sm max-w-2xl mt-4 leading-relaxed">
              {char.description}
            </p>
          )}
        </div>
      </div>

      <div className="container-wide py-10">
        <div className="flex items-end justify-between mb-8 pb-4 border-b border-gray-100">
          <div>
            <h2 className="section-title text-left">
              {char.name.toUpperCase()} FIGURES & STATUES ({char.products.length})
            </h2>
            <div className="h-0.5 w-16 bg-brand-red mt-2" />
          </div>
        </div>

        {char.products.length === 0 ? (
          <div className="py-16 text-center bg-gray-50 p-8 border border-gray-100">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="font-heading text-2xl text-gray-400 tracking-wide mb-2">
              NO FIGURES FOUND FOR {char.name.toUpperCase()}
            </p>
            <Link href="/shop" className="btn-primary mt-4">
              Explore All Figures
            </Link>
          </div>
        ) : (
          <div className="product-grid">
            {char.products.map((p: any) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  price: p.price,
                  compareAtPrice: p.compareAtPrice ?? undefined,
                  image: p.images?.[0]?.url ?? p.image ?? '',
                  characterName: char.name,
                  animeName: char.anime?.name,
                  brandName: p.brand?.name ?? p.brandName,
                  stock: p.stock ?? 10,
                  isSoldOut: p.isSoldOut || p.stock === 0,
                  isNewArrival: p.isNewArrival,
                  isBestSeller: p.isBestSeller,
                  isLimitedEdition: p.isLimitedEdition,
                  isPreOrder: p.isPreOrder,
                  description: p.description,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
