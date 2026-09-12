import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Flame } from 'lucide-react';
import { ANIME_FRANCHISES } from '@/lib/mockProducts';

export const metadata: Metadata = {
  title: 'All Anime Franchises & Universes | OTAKUVERSE',
  description: 'Explore official collectible figures and statues from Dragon Ball, Naruto, One Piece, Demon Slayer, Jujutsu Kaisen, Bleach, and more.',
};

export default function AnimeHubPage() {
  const franchises = Object.values(ANIME_FRANCHISES);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-[#0A0A0F] to-[#12111A] text-white py-12 md:py-16 border-b border-white/[0.08] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(230, 51, 41, 0.3) 0%, transparent 70%)',
          }}
        />

        <div className="container-wide relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/15 border border-red-600/40 text-red-400 text-xs font-black tracking-[0.2em] uppercase mb-4 rounded-md">
            <Flame className="w-3.5 h-3.5 text-brand-red" />
            ANIME UNIVERSES
          </div>
          <h1 className="font-heading text-4xl sm:text-6xl tracking-widest uppercase font-black">
            EXPLORE BY FRANCHISE
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-3 leading-relaxed">
            Direct access to official Japanese licensed statues, scale figures, and action collectibles organized by your favorite anime series.
          </p>
        </div>
      </div>

      {/* Franchise Grid */}
      <div className="container-wide py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {franchises.map((f) => (
            <Link
              key={f.slug}
              href={`/anime/${f.slug}`}
              className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-950 transition-all duration-300 hover:border-brand-red hover:shadow-2xl hover:-translate-y-1.5 flex flex-col h-[380px]"
            >
              {/* Background Image */}
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src={f.bannerImage}
                  alt={f.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
              </div>

              {/* Content */}
              <div className="relative z-10 p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-heading text-2xl tracking-wider text-white uppercase group-hover:text-brand-red transition-colors">
                    {f.name}
                  </h2>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                    {f.description}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {f.characters.slice(0, 3).map((c) => (
                      <span key={c.slug} className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded">
                        {c.name}
                      </span>
                    ))}
                  </div>

                  <span className="text-xs font-bold text-brand-red flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Explore <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
