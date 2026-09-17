'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, TrendingUp, ShoppingBag, Eye, Zap } from 'lucide-react';
import { Card3DTilt } from '@/components/UI/Card3DTilt';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import toast from 'react-hot-toast';
import { useRequireAuth } from '@/lib/useRequireAuth';

const trendingCards = [
  {
    id: 'trend-1',
    name: 'Spider-Man Integrated Suit vs Doc Ock 3D Battle Diorama',
    franchise: 'Marvel Studios • Spider-Man No Way Home',
    slug: 'spiderman-doc-ock-battle-diorama',
    price: 6499,
    compareAtPrice: 7999,
    discount: '19% OFF',
    image: '/custom/spiderman_trending_3d.jpg',
    badge: '#1 TRENDING WORLDWIDE',
    viewsCount: '12.8K collectors viewing',
    stock: 7,
    rating: 5.0,
    reviews: 142,
    accentColor: '#E63329',
    glowColor: 'rgba(230, 51, 41, 0.45)',
    description: 'Dynamic NYC high-rise battle scene featuring Peter Parker dodging Doc Ock metallic tentacles with web-line effects.',
  },
  {
    id: 'trend-2',
    name: 'Monkey D. Luffy Gear 5 Sun God Nika Awakening Figure',
    franchise: 'One Piece • Grand Line Masterpiece',
    slug: 'monkey-d-luffy-gear-5-sun-god-nika-awakening-figure-534',
    price: 4999,
    compareAtPrice: 6499,
    discount: '23% OFF',
    image: '/catalog/one-piece/item-001.jpg',
    badge: '⚡ GEAR 5 SUN GOD NIKA',
    viewsCount: '18.4K collectors viewing',
    stock: 6,
    rating: 5.0,
    reviews: 284,
    accentColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    description: 'Legendary Sun God Nika Gear 5 awakening sculpt featuring cloud steam sash, laughing joyboy expression, and rubberized lightning effects.',
  },
  {
    id: 'trend-3',
    name: 'Ultra Instinct Goku Dynamic Posable Action Figure',
    franchise: 'Dragon Ball Super • Tournament of Power',
    slug: 'ultra-instinct-goku-dynamic-posable-action-figure-1',
    price: 3499,
    compareAtPrice: 4499,
    discount: '22% OFF',
    image: '/catalog/action-figures/item-001.jpg',
    badge: 'DIVINE FORM RESTOCK',
    viewsCount: '14.1K collectors viewing',
    stock: 5,
    rating: 4.9,
    reviews: 198,
    accentColor: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    description: 'Sculpted with godly silver-white ki aura, battle-damaged dogi, and ultra-articulated limbs for iconic kamehameha poses.',
  },
];

export function TrendingSection() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const addItem = useCartStore((s) => s.addItem);
  const { requireAuth } = useRequireAuth();
  const activeItem = trendingCards[selectedIdx];

  const handleQuickAdd = (item: typeof activeItem) => {
    if (!requireAuth(undefined, '/shop')) return;

    addItem({
      id: item.id,
      productId: item.id,
      name: item.name,
      slug: item.slug,
      image: item.image,
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      stock: item.stock,
    });
    toast.success(`${item.name.split(' ')[0]} added to bag!`, {
      icon: '🔥',
      style: { borderLeft: `4px solid ${item.accentColor}` },
    });
  };

  return (
    <section 
      className="section-spacing relative overflow-hidden border-t border-white/10"
      style={{ backgroundColor: '#0B0914', color: '#FFFFFF' }}
    >
      {/* Background Ambient Glows */}
      <div
        className="absolute top-0 right-1/4 w-[450px] h-[450px] rounded-full blur-[140px] opacity-25 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: activeItem.accentColor }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)' }}
      />

      <div className="container-wide relative z-10">

        {/* Header with Live Ticker Pulse */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-600/50 text-red-400 text-xs font-black tracking-[0.2em] uppercase mb-2 rounded-md">
              <Flame className="w-3.5 h-3.5 text-red-500 animate-bounce" />
              NOWADAYS TRENDING & VIRAL DROPS
            </div>
            <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl tracking-widest uppercase text-white leading-none font-black">
              TRENDING TODAY
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm mt-2 max-w-xl font-normal">
              The highest requested anime and superhero collector statues exploding across social media and collector forums.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 border border-white/10 rounded-md">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
            <span className="text-xs font-black tracking-wider text-green-400 uppercase">
              LIVE POPULARITY INDEX
            </span>
          </div>
        </div>

        {/* Big Spotlight Grid: Left Big 3D Card Spotlight + Right Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left Column: Big Interactive 3D Card Spotlight */}
          <div className="lg:col-span-5 flex justify-center">
            <Card3DTilt intensity={14} glare={true} className="w-full max-w-[320px] sm:max-w-[360px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeItem.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35 }}
                  className="relative w-full bg-gradient-to-b from-[#181622] via-[#0E0D14] to-black border-2 shadow-2xl rounded-xl overflow-hidden flex flex-col justify-between p-3.5 group"
                  style={{
                    borderColor: `${activeItem.accentColor}99`,
                    boxShadow: `0 20px 60px -10px ${activeItem.glowColor}`,
                  }}
                >
                  {/* 3D Image Container */}
                  <Link href={`/product/${activeItem.slug}`} className="relative w-full h-[380px] sm:h-[420px] bg-black overflow-hidden rounded-lg block">
                    <Image
                      src={activeItem.image}
                      alt={activeItem.name}
                      fill
                      sizes="(max-width: 640px) 320px, 360px"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                    {/* Top Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-600 text-white text-[10px] font-black tracking-widest uppercase shadow-lg rounded-md">
                      <Flame className="w-3.5 h-3.5 fill-white" />
                      {activeItem.badge}
                    </div>

                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/80 backdrop-blur-md border border-white/20 text-yellow-400 text-[10px] font-black tracking-wider uppercase rounded-md">
                      {activeItem.discount}
                    </div>
                  </Link>

                  {/* Bottom Details & Quick Actions */}
                  <div className="p-3 bg-[#0A0A0F]/95 backdrop-blur-md border border-white/10 flex items-center justify-between rounded-lg mt-2.5">
                    <div className="truncate max-w-[170px] sm:max-w-[200px]">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block truncate">
                        {activeItem.franchise}
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-lg font-black text-white font-heading">{formatPrice(activeItem.price)}</span>
                        <span className="text-xs text-gray-400 line-through">{formatPrice(activeItem.compareAtPrice)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickAdd(activeItem)}
                      className="btn-primary py-2 px-3.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg rounded-md"
                      style={{ backgroundColor: activeItem.accentColor }}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> ADD
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </Card3DTilt>
          </div>

          {/* Right Column: Active Item Deep Dive & Selector List */}
          <div className="lg:col-span-7 space-y-4">

            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="p-5 sm:p-7 bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 backdrop-blur-md rounded-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-[0.2em] uppercase flex items-center gap-1.5" style={{ color: activeItem.accentColor }}>
                    <TrendingUp className="w-4 h-4" /> FEATURED VIRAL RELEASE
                  </span>
                  <span className="text-xs text-gray-300 font-mono flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/10">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" /> {activeItem.viewsCount}
                  </span>
                </div>

                <h3 className="font-heading text-2xl sm:text-4xl text-white uppercase tracking-wider leading-tight font-black">
                  {activeItem.name}
                </h3>

                <p className="text-sm text-gray-200 leading-relaxed font-normal">
                  {activeItem.description}
                </p>

                {/* Specs Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 bg-black/50 border border-white/10 rounded-md">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">STOCK STATUS</span>
                    <span className="text-sm font-black text-green-400 uppercase mt-0.5 block">Only {activeItem.stock} Left</span>
                  </div>
                  <div className="p-3 bg-black/50 border border-white/10 rounded-md">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">AUTHENTICITY</span>
                    <span className="text-sm font-black text-white uppercase mt-0.5 block">100% Genuine</span>
                  </div>
                  <div className="p-3 bg-black/50 border border-white/10 rounded-md col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">RATING</span>
                    <span className="text-sm font-black text-yellow-400 flex items-center gap-1 mt-0.5">
                      ★ {activeItem.rating} <span className="text-gray-400 text-xs font-normal">({activeItem.reviews})</span>
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <button
                    onClick={() => handleQuickAdd(activeItem)}
                    className="btn-primary py-3.5 px-4 sm:px-6 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl rounded-md w-full sm:w-auto"
                    style={{ backgroundColor: activeItem.accentColor }}
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" /> SECURE THIS DROP • {formatPrice(activeItem.price)}
                  </button>

                </div>
              </motion.div>
            </AnimatePresence>

            {/* Selector Tabs: Switch between Trending Spotlights */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                SWITCH TRENDING SPOTLIGHT:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {trendingCards.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedIdx(idx)}
                    className={`p-3 text-left border rounded-lg transition-all cursor-pointer flex items-center gap-3 ${
                      idx === selectedIdx
                        ? 'text-white shadow-lg'
                        : 'bg-black/50 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                    }`}
                    style={
                      idx === selectedIdx
                        ? {
                            backgroundColor: `${item.accentColor}25`,
                            borderColor: item.accentColor,
                            boxShadow: `0 0 15px ${item.accentColor}33`,
                          }
                        : {}
                    }
                  >
                    {/* Thumbnail preview */}
                    <div className="w-12 h-12 rounded-md bg-black overflow-hidden shrink-0 border border-white/15 relative">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="48px"
                        loading="lazy"
                        decoding="async"
                        className="object-cover object-top"
                      />
                    </div>
                    <div className="truncate">
                      <span className="text-[9px] font-black uppercase tracking-widest block truncate" style={{ color: item.accentColor }}>
                        {item.badge}
                      </span>
                      <p className="font-heading text-sm text-white uppercase tracking-wide truncate mt-0.5 font-bold">
                        {item.name.split(' ')[0]} {item.name.split(' ')[1]}
                      </p>
                      <span className="text-xs font-bold text-gray-300 font-mono">{formatPrice(item.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
