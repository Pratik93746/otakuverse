'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Swords, Trophy, ShoppingBag, Zap, ArrowRight } from 'lucide-react';
import { Card3DTilt } from '@/components/UI/Card3DTilt';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import toast from 'react-hot-toast';
import { useRequireAuth } from '@/lib/useRequireAuth';

const gamingSpotlight = {
  id: 'game-sekiro-1',
  name: 'Sekiro: Shadows Die Twice — The One-Armed Wolf & Ashina Epic Masterpiece',
  franchise: 'FromSoftware • Game of the Year Edition',
  slug: 'sekiro-shadows-die-twice-statue',
  price: 7999,
  compareAtPrice: 9999,
  discount: '20% OFF',
  image: '/custom/sekiro_gaming_3d.jpg',
  badge: '🏆 GAME OF THE YEAR MASTERPIECE',
  stock: 5,
  rating: 5.0,
  reviews: 312,
  description:
    'Hand-sculpted diorama featuring Wolf with the Shinobi Prosthetic, Divine Heir Kuro, Sword Saint Isshin Ashina, Genichiro, and the colossal Great Serpent descending upon Ashina Castle.',
  specs: [
    { label: 'Prosthetic Tool', value: 'Loaded Axe & Flame Vent' },
    { label: 'Base Material', value: 'Polystone & Translucent Resin' },
    { label: 'Edition', value: 'Exclusive Japan Collector Release' },
  ],
};

const gamingGenres = [
  { id: 'all', label: '⚔️ ALL GAMING STATUES' },
  { id: 'soulslike', label: '🩸 SOULSLIKE & ACTION RPG' },
  { id: 'goty', label: '🏆 GAME OF THE YEAR' },
  { id: 'cyberpunk', label: '⚡ SCI-FI & CYBERPUNK' },
  { id: 'fantasy', label: '🐉 JRPG & FANTASY' },
];

const otherGamingItems = [
  {
    id: 'game-elden-1',
    name: 'Elden Ring — Malenia Blade of Miquella Statue',
    price: 8499,
    compareAtPrice: 10499,
    image: '/archive/item-050.jpeg',
    tag: 'SOULSLIKE',
    rating: 5.0,
  },
  {
    id: 'game-ghost-1',
    name: 'Ghost of Tsushima — Jin Sakai Ghost Armor',
    price: 6999,
    compareAtPrice: 8499,
    image: '/archive/item-032.jpeg',
    tag: 'SAMURAI RPG',
    rating: 4.9,
  },
  {
    id: 'game-ff-1',
    name: 'Final Fantasy VII — Cloud Strife & Hardy Daytona',
    price: 9499,
    compareAtPrice: 11999,
    image: '/archive/item-088.jpeg',
    tag: 'JRPG CLASSIC',
    rating: 5.0,
  },
  {
    id: 'game-genshin-1',
    name: 'Genshin Impact — Raiden Shogun Musou no Hitotachi',
    price: 5499,
    compareAtPrice: 6999,
    image: '/archive/item-112.jpeg',
    tag: 'ANIME GAMING',
    rating: 4.8,
  },
];

export function GamingSection() {
  const [activeGenre, setActiveGenre] = useState('all');
  const addItem = useCartStore((s) => s.addItem);
  const { requireAuth } = useRequireAuth();

  const handleAddSekiro = () => {
    if (!requireAuth(undefined, '/shop')) return;

    addItem({
      id: gamingSpotlight.id,
      productId: gamingSpotlight.id,
      name: gamingSpotlight.name,
      slug: gamingSpotlight.slug,
      image: gamingSpotlight.image,
      price: gamingSpotlight.price,
      compareAtPrice: gamingSpotlight.compareAtPrice,
      stock: gamingSpotlight.stock,
    });
    toast.success('Sekiro: Shadows Die Twice Masterpiece added to bag!', {
      icon: '⚔️',
      style: { borderLeft: '4px solid #D97706' },
    });
  };

  const handleAddSmall = (item: (typeof otherGamingItems)[0]) => {
    if (!requireAuth(undefined, '/shop')) return;

    addItem({
      id: item.id,
      productId: item.id,
      name: item.name,
      slug: 'gaming-collectible',
      image: item.image,
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      stock: 10,
    });
    toast.success(`${item.name.split('—')[0]} added to bag!`, {
      icon: '🎮',
      style: { borderLeft: '4px solid #D97706' },
    });
  };

  return (
    <section
      id="gaming"
      className="section-spacing text-white relative overflow-hidden border-t border-amber-950/40 scroll-mt-20"
      style={{ backgroundColor: '#07070B', color: '#FFFFFF' }}
    >
      {/* Dynamic Gaming Atmosphere Backdrop */}
      <div
        className="absolute top-1/2 left-0 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full blur-[100px] sm:blur-[150px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.8) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full blur-[100px] sm:blur-[140px] opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.7) 0%, transparent 70%)' }}
      />

      <div className="container-wide relative z-10">

        {/* Gaming Mood Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 sm:mb-10 gap-4 sm:gap-6 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-400 text-[11px] sm:text-xs font-black tracking-[0.25em] uppercase mb-2 rounded-md">
              <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
              GAMING MOOD • THE LEGENDARY VAULT
            </div>
            <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl tracking-widest uppercase text-white leading-none font-black">
              GAMING MOOD
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm mt-2 max-w-xl font-normal">
              Immerse in iconic worlds from FromSoftware soulslikes to legendary JRPG masterpieces.
            </p>
          </div>

          {/* Genre Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {gamingGenres.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGenre(g.id)}
                className={`px-3 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-md border transition-all cursor-pointer ${activeGenre === g.id
                    ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-lg shadow-amber-500/30'
                    : 'bg-black/50 border-white/15 text-gray-300 hover:border-white/40 hover:text-white'
                  }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Centerpiece: Sekiro Shadows Die Twice Big 3D Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center bg-gradient-to-r from-amber-950/25 via-[#0E0D14] to-red-950/25 border border-amber-500/30 p-4 sm:p-8 rounded-xl shadow-2xl">

          {/* Left Column: Sekiro 3D Tilt Card */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <Card3DTilt intensity={14} glare={true} className="w-full max-w-[290px] sm:max-w-[340px]">
              <div className="relative w-full bg-gradient-to-b from-[#181622] via-[#0E0D14] to-black border-2 border-amber-500/70 shadow-2xl shadow-amber-900/40 rounded-xl overflow-hidden flex flex-col justify-between p-3 group">

                {/* 3D Image */}
                <Link href={`/product/${gamingSpotlight.slug}`} className="relative w-full h-[350px] sm:h-[400px] bg-black overflow-hidden rounded-lg block">
                  <img
                    src={gamingSpotlight.image}
                    alt={gamingSpotlight.name}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent pointer-events-none" />

                  {/* Top Badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 text-black text-[10px] font-black tracking-widest uppercase shadow-lg rounded-md">
                    <Trophy className="w-3.5 h-3.5 fill-black" />
                    GOTY MASTERPIECE
                  </div>

                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-black/80 backdrop-blur-md border border-white/20 text-amber-400 text-[10px] font-black tracking-wider uppercase rounded-md">
                    {gamingSpotlight.discount}
                  </div>
                </Link>

                {/* Bottom Details */}
                <div className="p-2.5 bg-[#0A0A0F]/95 backdrop-blur-md border border-white/10 flex items-center justify-between rounded-lg mt-2">
                  <div className="truncate max-w-[150px] sm:max-w-[170px]">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block truncate">
                      SEKIRO: SHADOWS DIE TWICE
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-base sm:text-lg font-black text-white font-heading">{formatPrice(gamingSpotlight.price)}</span>
                      <span className="text-xs text-gray-400 line-through">{formatPrice(gamingSpotlight.compareAtPrice)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleAddSekiro}
                    className="bg-amber-500 hover:bg-amber-400 text-black py-2 px-3 sm:px-4 text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-amber-500/30 transition-colors rounded-md cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> ADD
                  </button>
                </div>
              </div>
            </Card3DTilt>
          </div>

          {/* Right Column: Lore, Specs, & Gaming Action */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-red-600/20 border border-red-600/50 text-red-400 text-[11px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 rounded-md">
                <Swords className="w-3.5 h-3.5" /> ASHINA CASTLE SHOWDOWN
              </span>
              <span className="text-xs font-mono text-yellow-400 flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/10">
                ★ 5.0 ({gamingSpotlight.reviews} Reviews)
              </span>
            </div>

            <h3 className="font-heading text-2xl sm:text-4xl lg:text-5xl text-white uppercase tracking-wider leading-tight font-black">
              {gamingSpotlight.name}
            </h3>

            <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed font-normal">
              {gamingSpotlight.description}
            </p>

            {/* Gaming Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {gamingSpotlight.specs.map((s, idx) => (
                <div key={idx} className="p-3 bg-black/60 border border-white/10 rounded-md">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">
                    {s.label}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-300 uppercase mt-0.5 block">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Big Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={handleAddSekiro}
                className="bg-amber-500 hover:bg-amber-400 text-black py-3.5 sm:py-4 px-4 sm:px-8 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30 transition-all hover:scale-105 rounded-md cursor-pointer w-full sm:w-auto"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" /> CLAIM SEKIRO DROP • {formatPrice(gamingSpotlight.price)}
              </button>
              <Link
                href="/shop?category=gaming"
                className="btn-secondary py-3.5 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-md w-full sm:w-auto"
              >
                <Gamepad2 className="w-4 h-4 shrink-0" /> BROWSE ALL GAMING
              </Link>
            </div>
          </div>

        </div>

        {/* Supporting Gaming Collectibles Row */}
        <div className="mt-10 sm:mt-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h4 className="font-heading text-xl sm:text-2xl tracking-wider uppercase text-white flex items-center gap-2 font-black">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> MORE ICONIC GAMING DROPS
            </h4>
            <Link href="/shop" className="text-xs font-bold text-amber-400 hover:underline tracking-wider uppercase flex items-center gap-1">
              VIEW ALL <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {otherGamingItems.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-[#0E0D14] border border-white/10 hover:border-amber-500/60 rounded-lg transition-all group flex flex-col justify-between"
              >
                <div className="relative w-full h-[160px] sm:h-[220px] bg-black overflow-hidden rounded-md mb-2 sm:mb-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 border border-white/20 text-amber-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded">
                    {item.tag}
                  </div>
                </div>

                <div className="space-y-1">
                  <h5 className="font-heading text-xs sm:text-sm text-white uppercase tracking-wide truncate font-bold">
                    {item.name}
                  </h5>
                  <div className="flex items-baseline justify-between pt-0.5 sm:pt-1">
                    <span className="text-sm sm:text-base font-black text-white font-heading">{formatPrice(item.price)}</span>
                    <span className="text-[10px] sm:text-xs text-gray-400 line-through">{formatPrice(item.compareAtPrice)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleAddSmall(item)}
                  className="mt-2.5 sm:mt-3 w-full py-2 bg-white/10 hover:bg-amber-500 hover:text-black text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors rounded-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> QUICK ADD
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
