import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star, Crown, ShoppingBag, Eye } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard/ProductCard';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import { Card3DTilt } from '@/components/UI/Card3DTilt';
import { formatPrice } from '@/lib/utils';

async function getLimitedEditions() {
  try {
    const p = await prisma.product.findMany({
      where: { isLimitedEdition: true, isPublished: true },
      include: {
        images: { where: { isMain: true }, take: 1 },
        character: true,
        anime: true,
        brand: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });
    return p.length > 0 ? p : (MOCK_PRODUCTS.filter((x) => x.isLimitedEdition).slice(0, 4) as any);
  } catch {
    return MOCK_PRODUCTS.filter((x) => x.isLimitedEdition).slice(0, 4) as any;
  }
}

export async function LimitedEditionSection() {
  const products = await getLimitedEditions();

  return (
    <section className="section-spacing bg-black text-white relative overflow-hidden border-t border-red-900/40">
      {/* Background Cursed Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#140810] to-[#0A0A0F]" />
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(220,38,38,0.5) 0%, transparent 60%), radial-gradient(circle at 80% 50%, rgba(126,34,206,0.4) 0%, transparent 60%)',
        }}
      />

      <div className="container-wide relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold tracking-[0.3em] uppercase text-yellow-400">
                ULTRA-RARE COLLECTOR&apos;S VAULT
              </span>
            </div>
            <h2 className="font-heading text-4xl sm:text-6xl tracking-widest uppercase text-white leading-none">
              COLLECTOR&apos;S EDITION
            </h2>
            <div className="h-0.5 w-24 bg-brand-red mt-2" />
          </div>
          <Link
            href="/shop?filter=limited"
            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-brand-red hover:text-white transition-colors self-start sm:self-end"
          >
            View Entire Vault <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 3D Showcase Hero Card (3rd user image: Sukuna) + Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Main 3D Sukuna Collector Spotlight (Exact 9:16 Ratio) */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <Card3DTilt intensity={20} glare={true} className="w-[280px] sm:w-[320px] lg:w-[340px] h-[500px] sm:h-[560px]">
              <div className="relative w-full h-full min-h-[480px] bg-gradient-to-b from-red-950/60 via-black to-black border-2 border-red-600/60 shadow-2xl shadow-red-900/40 overflow-hidden flex flex-col justify-between p-5 group rounded-xs">
                <Image
                  src="/custom/sukuna_collectors_3d.png"
                  alt="Ryomen Sukuna Collector's Edition 3D Statue"
                  fill
                  quality={100}
                  unoptimized
                  priority
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />

                {/* Top Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest flex items-center gap-1 shadow-md">
                    <Star className="w-3 h-3 fill-white" /> 1 OF 500 PIECES
                  </span>
                  <span className="bg-black/85 backdrop-blur-sm text-red-400 text-xs font-mono font-bold px-2 py-0.5 border border-red-500/40">
                    SKU: OTV-SUK-001
                  </span>
                </div>

                {/* Bottom Details & CTA */}
                <div className="relative z-10 space-y-3 pt-20">
                  <div>
                    <span className="text-[11px] font-bold text-red-400 tracking-widest uppercase">
                      JUJUTSU KAISEN • MALEVOLENT SHRINE
                    </span>
                    <h3 className="font-heading text-3xl text-white tracking-wide uppercase">
                      Ryomen Sukuna Resin Statue
                    </h3>
                    <p className="text-xs text-gray-300 line-clamp-2 mt-1">
                      Featuring hand-painted cursed seal markings, skull altar pedestal, and holographic domain expansion aura.
                    </p>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-red-500">{formatPrice(7499)}</span>
                    <span className="text-sm text-gray-400 line-through">{formatPrice(9499)}</span>
                    <span className="text-xs font-bold text-green-400 uppercase">21% OFF</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link
                      href="/product/sukuna-figure"
                      className="btn-primary py-3 text-xs justify-center gap-1.5 shadow-lg shadow-red-600/30"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> ORDER NOW
                    </Link>
                    <Link
                      href="/product/sukuna-figure"
                      className="btn-secondary text-white border-white/30 hover:bg-white hover:text-black py-3 text-xs justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> 3D INSPECT
                    </Link>
                  </div>
                </div>
              </div>
            </Card3DTilt>
          </div>

          {/* Right Column: Other Limited Edition Collectibles */}
          <div className="lg:col-span-7 grid grid-cols-2 gap-4">
            {products.map((product: any) => (
              <ProductCard
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: product.price,
                  compareAtPrice: product.compareAtPrice ?? undefined,
                  image: (product as any).images?.[0]?.url ?? (product as any).image ?? '',
                  characterName: product.character?.name ?? (product as any).characterName,
                  animeName: product.anime?.name ?? (product as any).animeName,
                  brandName: product.brand?.name ?? (product as any).brandName,
                  stock: product.stock,
                  isSoldOut: product.isSoldOut || product.stock === 0,
                  isLimitedEdition: true,
                  isPreOrder: product.isPreOrder,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
