'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

const posterCategories = [
  {
    name: 'ANIME POSTERS',
    japanese: 'ポスター',
    slug: 'anime-posters',
    emoji: '🖼️',
    tagline: 'Ultra-HD Fine Art Prints',
    gradient: 'from-red-600 to-rose-500',
    glow: 'rgba(239, 68, 68, 0.25)',
    accentColor: '#EF4444',
    itemCount: '280+ Designs',
  },
  {
    name: 'FRAMED CANVAS',
    japanese: 'キャンバス',
    slug: 'framed-canvas',
    emoji: '🎨',
    tagline: 'Gallery-Wrapped Canvas Wall Art',
    gradient: 'from-amber-500 to-red-600',
    glow: 'rgba(245, 158, 11, 0.25)',
    accentColor: '#F59E0B',
    itemCount: 'Ready to Hang',
  },
  {
    name: 'MINIMALIST PRINTS',
    japanese: 'ミニマル',
    slug: 'minimalist-prints',
    emoji: '✨',
    tagline: 'Modern Aesthetic Wall Art',
    gradient: 'from-cyan-500 to-blue-600',
    glow: 'rgba(6, 182, 212, 0.25)',
    accentColor: '#06B6D4',
    itemCount: '300 GSM Archival',
  },
  {
    name: 'MANGA PANELS',
    japanese: '漫画 • コマ',
    slug: 'manga-panels',
    emoji: '📖',
    tagline: 'Monochrome High-GSM Manga Art',
    gradient: 'from-purple-600 to-indigo-600',
    glow: 'rgba(147, 51, 234, 0.25)',
    accentColor: '#A855F7',
    itemCount: 'Iconic Manga Scenes',
  },
  {
    name: 'VINTAGE ART',
    japanese: 'レトロ',
    slug: 'vintage-wall-art',
    emoji: '📜',
    tagline: 'Retro Japanese Aesthetic Posters',
    gradient: 'from-rose-500 to-orange-500',
    glow: 'rgba(244, 63, 94, 0.25)',
    accentColor: '#F43F5E',
    itemCount: 'Vintage Anime Vibes',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

export function CategoriesSection() {
  return (
    <section
      id="categories"
      className="section-spacing relative overflow-hidden border-t border-white/10"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(220, 38, 38, 0.15) 0%, transparent 70%), radial-gradient(ellipse 60% 60% at 80% 100%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)',
        }}
      />

      <div className="container-wide relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/15 border border-red-600/40 text-red-400 text-xs font-black tracking-[0.25em] uppercase mb-2.5 rounded-md">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            OFFICIAL BAKA COLLECTION
          </div>
          <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl tracking-widest uppercase text-white font-black">
            EXPLORE BY CATEGORY
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1 max-w-xl mx-auto">
            Choose from our 5 core specialized collections featured on the official BAKA poster.
          </p>
          <div className="h-0.5 w-24 bg-brand-red mx-auto mt-3" />
        </div>

        {/* 5 Clean Emoji Category Cards Grid */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {posterCategories.map((cat) => (
            <motion.div key={cat.slug} variants={cardVariants}>
              <Link
                href={`/shop?category=${cat.slug}`}
                className="group block h-full"
              >
                <div
                  className="relative h-56 sm:h-64 rounded-xl border border-white/10 overflow-hidden transition-all duration-300 hover:border-white/40 hover:-translate-y-2 hover:shadow-2xl flex flex-col justify-between p-5 text-center"
                  style={{
                    backgroundColor: '#12111A',
                  }}
                >
                  {/* Subtle hover background glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                    style={{ backgroundColor: cat.accentColor }}
                  />

                  {/* Top Japanese Kanji Tag */}
                  <div className="flex items-center justify-center">
                    <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 bg-black/60 border border-white/10 text-gray-300 rounded-md">
                      {cat.japanese}
                    </span>
                  </div>

                  {/* Center Large Emoji */}
                  <div className="my-auto py-2">
                    <span className="text-4xl sm:text-5xl block transition-transform duration-300 group-hover:scale-125 filter drop-shadow-md">
                      {cat.emoji}
                    </span>
                    <h3 className="font-heading text-lg sm:text-xl text-white uppercase tracking-wider font-black mt-3 group-hover:text-red-400 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium leading-tight mt-1 line-clamp-2">
                      {cat.tagline}
                    </p>
                  </div>

                  {/* Bottom Strip */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-400 group-hover:text-white transition-colors">
                    <span>{cat.itemCount}</span>
                    <span className="flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform" style={{ color: cat.accentColor }}>
                      EXPLORE <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Bottom Accent Bar */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${cat.gradient} opacity-40 group-hover:opacity-100 transition-opacity duration-300`}
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
