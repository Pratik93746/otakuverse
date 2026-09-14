import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard/ProductCard';
import { ArrowLeft, Sparkles, Filter, ShoppingBag } from 'lucide-react';
import { ANIME_FRANCHISES } from '@/lib/mockProducts';
import { getProducts } from '@/lib/db/products';

interface Props {
  params: Promise<{ slug: string }> | { slug: string };
}

async function getAnimeData(slug: string) {
  const franchise = ANIME_FRANCHISES[slug];
  const animeQuery = slug.replace(/-/g, ' ');
  const res = await getProducts({ anime: animeQuery, limit: 50 });
  const products = res.products || [];

  const name = franchise?.name ?? animeQuery.toUpperCase();
  const description =
    franchise?.description ??
    `Official authentic ${name} collectible figures, statues, and merchandise.`;
  const bannerImage =
    franchise?.bannerImage ??
    '/catalog/dragon-ball/item-001.png';

  const characters = franchise?.characters
    ? franchise.characters.map((c, i) => ({
        id: `char-${i}`,
        name: c.name,
        slug: c.slug,
        image: null,
      }))
    : [];

  return {
    id: slug,
    name,
    slug,
    description,
    bannerImage,
    characters,
    products,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const anime = await getAnimeData(slug);
  if (!anime) return { title: 'Anime Franchise Not Found | OTAKUVERSE' };

  return {
    title: `${anime.name} Figures & Collectibles | OTAKUVERSE`,
    description:
      anime.description ??
      `Shop authentic ${anime.name} anime figures, statues, and collectibles on OTAKUVERSE.`,
  };
}

export default async function AnimePage({ params }: Props) {
  const { slug } = await Promise.resolve(params);
  const anime = await getAnimeData(slug);

  if (!anime) notFound();

  return (
    <div className="min-h-screen bg-white">
      {/* Franchise Hero Banner */}
      <div className="bg-gradient-to-r from-gray-950 via-[#161226] to-gray-950 text-white py-12 md:py-16 relative overflow-hidden border-b border-gray-800">
        <div
          className="absolute inset-0 opacity-15 bg-cover bg-center"
          style={{
            backgroundImage: `url(${anime.bannerImage ?? 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1600&auto=format&fit=crop'})`,
          }}
        />
        <div className="container-wide relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-red mb-6 transition-colors font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-brand-red" />
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-brand-red">
              OFFICIAL FRANCHISE SHOWCASE
            </span>
          </div>
          <h1 className="font-heading text-4xl sm:text-6xl tracking-widest uppercase">
            {anime.name}
          </h1>
          {anime.description && (
            <p className="text-gray-300 text-sm md:text-base max-w-2xl mt-3 leading-relaxed">
              {anime.description}
            </p>
          )}
        </div>
      </div>

      {/* Characters Pill Strip */}
      {anime.characters.length > 0 && (
        <div className="border-b border-gray-100 bg-gray-50 py-3.5 sticky top-[64px] z-20 backdrop-blur-md bg-white/90">
          <div className="container-wide flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <span className="text-xs font-bold tracking-wider text-gray-500 uppercase flex-shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter by Character:
            </span>
            {anime.characters.map((char) => (
              <Link
                key={char.id}
                href={`/characters/${char.slug}`}
                className="px-3.5 py-1.5 bg-white border border-gray-200 text-xs font-semibold text-gray-800 uppercase tracking-wide hover:border-brand-red hover:text-brand-red hover:bg-red-50 transition-all whitespace-nowrap shadow-2xs"
              >
                {char.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Product Catalog */}
      <div className="container-wide py-10">
        <div className="flex items-end justify-between mb-8 pb-4 border-b border-gray-100">
          <div>
            <h2 className="section-title text-left">
              {anime.name.toUpperCase()} FIGURES & STATUES ({anime.products.length})
            </h2>
            <div className="h-0.5 w-20 bg-brand-red mt-2" />
          </div>
          <Link
            href={`/shop?anime=${anime.slug}`}
            className="text-xs font-bold tracking-wider uppercase text-brand-red hover:underline flex items-center gap-1"
          >
            Open in Full Shop Filter →
          </Link>
        </div>

        {anime.products.length === 0 ? (
          <div className="py-16 text-center bg-gray-50 p-8 border border-gray-100">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="font-heading text-2xl text-gray-600 tracking-wide mb-2">
              NO FIGURES CURRENTLY AVAILABLE FOR THIS THEME
            </p>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              New pre-orders and restocks for {anime.name} are added weekly.
            </p>
            <Link href="/shop" className="btn-primary">
              Browse All Collectibles
            </Link>
          </div>
        ) : (
          <div className="product-grid">
            {anime.products.map((p: any) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  price: p.price,
                  compareAtPrice: p.compareAtPrice ?? undefined,
                  image: p.images?.[0]?.url ?? p.image ?? '',
                  characterName: p.character?.name ?? p.characterName,
                  animeName: anime.name,
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
