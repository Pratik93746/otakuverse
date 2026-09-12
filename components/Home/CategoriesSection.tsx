'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

const categories = [
  { name: 'ACTION FIGURES', slug: 'action-figures', emoji: '⚔️', image: '/catalog/action-figures/item-001.jpg', gradient: 'from-red-600 to-rose-500', glow: 'rgba(239, 68, 68, 0.25)' },
  { name: 'STATUES', slug: 'statues', emoji: '🗿', image: '/catalog/statues/item-001.jpg', gradient: 'from-purple-600 to-violet-500', glow: 'rgba(139, 92, 246, 0.25)' },
  { name: 'ANIME', slug: 'anime', emoji: '🎌', image: '/catalog/anime/item-001.jpg', gradient: 'from-blue-600 to-indigo-500', glow: 'rgba(99, 102, 241, 0.25)' },
  { name: 'MANGA', slug: 'manga', emoji: '📚', image: '/catalog/manga/item-001.jpg', gradient: 'from-emerald-600 to-teal-500', glow: 'rgba(16, 185, 129, 0.25)' },
  { name: 'GAMING', slug: 'gaming', emoji: '🎮', image: '/catalog/gaming/item-001.jpg', gradient: 'from-orange-500 to-amber-500', glow: 'rgba(249, 115, 22, 0.25)' },
  { name: 'MOVIE FIGURES', slug: 'movie-figures', emoji: '🎬', image: '/catalog/movie-figures/item-001.jpg', gradient: 'from-pink-600 to-rose-500', glow: 'rgba(236, 72, 153, 0.25)' },
  { name: 'LIMITED EDITIONS', slug: 'limited-editions', emoji: '⭐', image: '/catalog/limited-editions/item-001.jpg', gradient: 'from-yellow-500 to-amber-400', glow: 'rgba(234, 179, 8, 0.25)' },
  { name: 'COLLECTIBLES', slug: 'collectibles', emoji: '💎', image: '/catalog/collectibles/item-001.jpg', gradient: 'from-cyan-500 to-sky-500', glow: 'rgba(6, 182, 212, 0.25)' },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function CategoriesSection() {
  return (
    <section
      className="section-spacing relative overflow-hidden"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Radial ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(230, 51, 41, 0.12) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 80% 100%, rgba(123, 47, 190, 0.08) 0%, transparent 60%)',
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="container-wide relative z-10">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/15 border border-red-600/40 text-red-400 text-xs font-black tracking-[0.25em] uppercase mb-3 rounded-md">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            BROWSE BY TYPE
          </div>
          <h2 className="font-heading text-4xl sm:text-6xl tracking-widest uppercase text-white font-black">
            CATEGORIES
          </h2>
          <div className="h-0.5 w-20 bg-brand-red mx-auto mt-3" />
        </div>

        {/* Grid */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {categories.map((cat) => (
            <motion.div key={cat.slug} variants={cardVariants}>
              <Link
                href={`/shop?category=${cat.slug}`}
                className="group block"
              >
                <div
                  className="relative h-40 sm:h-48 md:h-52 rounded-xl border border-white/[0.08] overflow-hidden transition-all duration-400 hover:border-white/[0.3] hover:-translate-y-1.5 hover:shadow-2xl"
                  style={{ backgroundColor: '#12111A' }}
                >
                  {/* Background Figure Image */}
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    className="object-cover opacity-25 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500 pointer-events-none"
                  />

                  {/* Gradient overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-[#12111A] via-[#12111A]/80 to-transparent`}
                  />

                  {/* Hover Color Glow Overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
                  />

                  {/* Bottom gradient bar */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  />

                  {/* Ambient glow */}
                  <div
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
                    style={{ backgroundColor: cat.glow }}
                  />

                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
                    {/* Emoji */}
                    <span className="text-3xl sm:text-4xl mb-2 transition-all duration-400 group-hover:scale-125 group-hover:drop-shadow-lg">
                      {cat.emoji}
                    </span>

                    {/* Name */}
                    <p className="font-heading text-sm sm:text-base md:text-lg tracking-[0.16em] text-white/90 uppercase text-center font-black leading-tight group-hover:text-white transition-colors duration-300">
                      {cat.name}
                    </p>

                    {/* Arrow indicator */}
                    <div className="mt-2 flex items-center gap-1 text-white/0 group-hover:text-white/80 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      <span className="text-[10px] font-bold tracking-widest uppercase">Explore</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Corner accent */}
                  <div
                    className={`absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl ${cat.gradient} opacity-[0.08] group-hover:opacity-[0.2] rounded-bl-3xl transition-opacity duration-300`}
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
