import Link from 'next/link';
import { prisma } from '@/lib/prisma';

const fallbackBrands = [
  { name: 'Banpresto', slug: 'banpresto', emoji: '🏆' },
  { name: 'S.H.Figuarts', slug: 'sh-figuarts', emoji: '⚡' },
  { name: 'Good Smile', slug: 'good-smile', emoji: '😊' },
  { name: 'Kotobukiya', slug: 'kotobukiya', emoji: '🎯' },
  { name: 'MegaHouse', slug: 'megahouse', emoji: '🏠' },
  { name: 'Funko', slug: 'funko', emoji: '🎭' },
  { name: 'Bandai', slug: 'bandai', emoji: '🎌' },
  { name: 'Tamashii', slug: 'tamashii-nations', emoji: '✨' },
];

export async function BrandsSection() {
  let brands: { name: string; slug: string; logo?: string | null }[] = [];
  try {
    brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      take: 8,
      select: { name: true, slug: true, logo: true },
    });
  } catch { /* use fallback */ }

  const displayBrands = brands.length > 0
    ? brands.map((b) => ({ ...b, emoji: '🏷️' }))
    : fallbackBrands;

  return (
    <section className="section-spacing relative overflow-hidden" style={{ backgroundColor: '#0D0D14' }}>
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container-wide">
        <div className="text-center mb-8">
          <h2 className="section-title text-white">SHOP BY BRAND</h2>
          <div className="h-0.5 w-16 bg-brand-red mx-auto mt-3" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 sm:gap-3 md:gap-4">
          {displayBrands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/shop?brand=${brand.slug}`}
              className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-brand-red/50 hover:bg-white/[0.06] transition-all duration-300 group min-w-0"
            >
              <span className="text-2xl sm:text-3xl group-hover:scale-125 transition-transform duration-300">
                {'emoji' in brand ? brand.emoji : '🏷️'}
              </span>
              <p className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-gray-400 group-hover:text-white transition-colors text-center leading-tight truncate w-full">
                {brand.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
