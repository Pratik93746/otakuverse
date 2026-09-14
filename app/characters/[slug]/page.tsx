import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard/ProductCard';
import { User, ShoppingBag } from 'lucide-react';
import { getProducts } from '@/lib/db/products';

interface Props {
  params: Promise<{ slug: string }> | { slug: string };
}

async function getCharacterData(slug: string) {
  const searchName = slug.replace(/-/g, ' ');
  const res = await getProducts({ character: searchName, limit: 50 });
  const matchingProducts = res.products || [];

  const charName =
    matchingProducts[0]?.characterName ??
    searchName.charAt(0).toUpperCase() + searchName.slice(1);
  const animeName = matchingProducts[0]?.animeName ?? 'Anime Universe';
  const animeSlug = matchingProducts[0]?.animeSlug ?? 'anime';

  return {
    id: slug,
    name: charName,
    slug,
    description: `Official authentic figures, posable statues, and collectibles featuring ${charName}.`,
    anime: { name: animeName, slug: animeSlug },
    products: matchingProducts,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const char = await getCharacterData(slug);
  if (!char) return { title: 'Character Not Found | BAKA' };

  return {
    title: `${char.name} Figures & Statues | BAKA`,
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
            <span className="text-white">{char.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600/20 border border-purple-500/40 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-wider">{char.name}</h1>
              {char.anime && (
                <p className="text-xs text-purple-400 font-semibold tracking-wide uppercase mt-0.5">
                  Series: {char.anime.name}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-3 max-w-2xl">{char.description}</p>
        </div>
      </div>

      <div className="container-wide py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-xl uppercase tracking-wide">
            AVAILABLE FIGURES & STATUES ({char.products.length})
          </h2>
        </div>

        {char.products.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 border border-gray-100 rounded-sm">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-sm">No collectibles currently found for {char.name}</p>
            <Link href="/shop" className="btn-primary text-xs mt-4 inline-flex items-center">
              Explore All Figures
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {char.products.map((product) => (
              <ProductCard key={(product as any).id || product._id?.toString() || product.slug} product={product as any} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
