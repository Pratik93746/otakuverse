'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card3DTilt } from '@/components/UI/Card3DTilt';
import { Sparkles, ArrowRight } from 'lucide-react';

const themes = [
  { name: 'DRAGON BALL', slug: 'dragon-ball', emoji: '🔥', color: 'from-orange-600/90 to-yellow-500/80', desc: 'Goku, Vegeta & Super Saiyans' },
  { name: 'NARUTO', slug: 'naruto', emoji: '🍥', color: 'from-orange-600/90 to-red-600/80', desc: 'Shinobi, Akatsuki & Hokage' },
  { name: 'ONE PIECE', slug: 'one-piece', emoji: '⚓', color: 'from-blue-700/90 to-cyan-500/80', desc: 'Straw Hats, Gear 5 & Emperors' },
  { name: 'DEMON SLAYER', slug: 'demon-slayer', emoji: '🌊', color: 'from-red-600/90 to-pink-600/80', desc: 'Tanjiro, Nezuko & Hashira' },
  { name: 'JUJUTSU KAISEN', slug: 'jujutsu-kaisen', emoji: '👁️', color: 'from-purple-800/90 to-indigo-600/80', desc: 'Gojo, Sukuna & Sorcerers' },
  { name: 'BLEACH', slug: 'bleach', emoji: '⚔️', color: 'from-gray-900/90 to-red-700/80', desc: 'Soul Reapers & Bankai' },
  { name: 'MY HERO ACADEMIA', slug: 'my-hero-academia', emoji: '💪', color: 'from-emerald-700/90 to-teal-500/80', desc: 'Deku, Bakugo & Plus Ultra' },
  { name: 'CHAINSAW MAN', slug: 'chainsaw-man', emoji: '🩸', color: 'from-red-900/90 to-orange-700/80', desc: 'Denji, Power & Devils' },
];

export function ThemeSection() {
  return (
    <section id="themes" className="section-spacing relative bg-[#0A0A0F] text-white overflow-hidden py-16" style={{ backgroundColor: '#0A0A0F' }}>
      {/* Background All-Star Anime Heroes Image with 3D Depth */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <Image
          src="/custom/anime_allstar_bg.jpg"
          alt="All Favorite Anime Characters Background"
          fill
          sizes="100vw"
          loading="lazy"
          decoding="async"
          className="object-cover object-center filter brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-transparent to-[#0A0A0F]" />
      </div>

      <div className="container-wide relative z-10">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/20 border border-red-600/50 text-red-400 text-xs font-black tracking-[0.25em] uppercase mb-3 rounded-md">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            CHOOSE YOUR FAVORITE UNIVERSE
          </div>
          <h2 className="font-heading text-4xl sm:text-6xl tracking-widest uppercase text-white font-black">
            SHOP BY ANIME THEME
          </h2>
          <div className="h-0.5 w-20 bg-brand-red mx-auto mt-3" />
        </div>

        {/* 3D Tilt Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {themes.map((theme) => (
            <Card3DTilt key={theme.slug} intensity={14} glare={true}>
              <Link
                href={`/anime/${theme.slug}`}
                className="block h-full group"
              >
                <div
                  className={`relative h-44 sm:h-48 rounded-xl bg-gradient-to-br ${theme.color} border border-white/20 p-5 flex flex-col justify-between overflow-hidden shadow-xl transition-all duration-300 group-hover:border-white group-hover:shadow-2xl group-hover:scale-[1.02]`}
                >
                  {/* Watermark Emoji */}
                  <span className="absolute -right-2 -bottom-4 text-7xl opacity-20 group-hover:scale-125 group-hover:opacity-35 transition-all duration-500 pointer-events-none select-none">
                    {theme.emoji}
                  </span>

                  {/* Top: Emoji Icon */}
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-md">
                    {theme.emoji}
                  </div>

                  {/* Bottom: Name & CTA */}
                  <div className="relative z-10">
                    <p className="text-[11px] text-white/80 font-medium tracking-wide line-clamp-1 mb-1">
                      {theme.desc}
                    </p>
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-xl sm:text-2xl tracking-wider uppercase text-white leading-none font-black">
                        {theme.name}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </Card3DTilt>
          ))}
        </div>
      </div>
    </section>
  );
}
