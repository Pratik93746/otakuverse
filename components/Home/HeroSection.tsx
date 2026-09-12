'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Flame, Crown, ChevronLeft, ChevronRight, ShoppingBag, Zap } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import toast from 'react-hot-toast';
import { useRequireAuth } from '@/lib/useRequireAuth';

const heroSlides = [
  {
    id: 1,
    badge: 'ALL-STAR ANIME VAULT',
    badgeIcon: Sparkles,
    badgeColor: 'bg-brand-red text-white',
    titleLine1: 'YOUR FAVORITE WORLDS.',
    titleLine2: 'BROUGHT TO LIFE.',
    tagline: 'OFFICIAL 100% AUTHENTIC JAPANESE FIGURES & STATUES',
    description: 'Direct imports from top Tokyo manufacturers. Discover museum-grade figures from One Piece, Dragon Ball, Naruto, Bleach, and more.',
    primaryCta: 'EXPLORE VAULT',
    primaryLink: '/shop',
    secondaryCta: 'SHOP BY THEME',
    secondaryLink: '#themes',
    image: '/custom/anime_allstar_bg.jpg',
    tag: 'ALL-STAR COLLECTIBLE VAULT',
    subtitle: '50+ Legendary Anime Heroes',
    accentColor: '#E63329',
    glowColor: 'rgba(230, 51, 41, 0.4)',
  },
  {
    id: 2,
    badge: 'HOT NEW DROP • IN STOCK',
    badgeIcon: Flame,
    badgeColor: 'bg-gradient-to-r from-orange-500 to-red-600 text-white',
    titleLine1: 'TANJIRO HINOKAMI KAGURA',
    titleLine2: 'SUN BREATHING 3D DROP',
    tagline: 'DEMON SLAYER KIMETSU NO YAIBA • COMBAT FIGURE',
    description: 'Dynamic translucent fire dragon effects, bloodline Nichirin sword hilt, and intense battle posture. Ready to ship in mint packaging.',
    price: 2799,
    compareAtPrice: 3499,
    discount: '20% OFF',
    primaryCta: 'ADD TO BAG • ₹2,799',
    primaryIsCart: true,
    productId: 'prod-9',
    productSlug: 'tanjiro-water-breathing-figure',
    productName: 'Tanjiro Kamado Hinokami Kagura Flame Figure',
    secondaryCta: 'INSPECT 3D FIGURE',
    secondaryLink: '/product/tanjiro-water-breathing-figure',
    image: '/custom/tanjiro_new_arrival_3d.jpg',
    tag: 'NEW ARRIVAL SPOTLIGHT',
    subtitle: 'Tanjiro Kamado Flame Edition',
    accentColor: '#F97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
  },
  {
    id: 3,
    badge: 'LIMITED COLLECTOR’S EDITION',
    badgeIcon: Crown,
    badgeColor: 'bg-gradient-to-r from-purple-600 to-red-600 text-white',
    titleLine1: 'RYOMEN SUKUNA',
    titleLine2: 'DOMAIN EXPANSION STATUE',
    tagline: 'JUJUTSU KAISEN • MALEVOLENT SHRINE RESIN',
    description: 'Strictly limited to 500 pieces worldwide. Features hand-painted cursed seal markings, skull altar throne, and holographic domain aura.',
    price: 7499,
    compareAtPrice: 9499,
    discount: '21% OFF',
    primaryCta: 'ORDER COLLECTOR STATUE',
    primaryLink: '/product/sukuna-figure',
    secondaryCta: 'VIEW DETAILS',
    secondaryLink: '/product/sukuna-figure',
    image: '/custom/sukuna_collectors_3d.png',
    tag: '1 OF 500 PIECES WORLDWIDE',
    subtitle: 'Ryomen Sukuna Malevolent Shrine',
    accentColor: '#DC2626',
    glowColor: 'rgba(220, 38, 38, 0.45)',
  },
];

export function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const { requireAuth } = useRequireAuth();

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const slide = heroSlides[current];
  const BadgeIcon = slide.badgeIcon;

  const handleCartAdd = (item: typeof slide) => {
    if (!item.productId) return;
    if (!requireAuth(undefined, '/shop')) return;

    addItem({
      id: item.productId,
      productId: item.productId,
      name: item.productName || item.titleLine1,
      slug: item.productSlug || 'product',
      image: item.image,
      price: item.price || 2799,
      compareAtPrice: item.compareAtPrice,
      stock: 25,
    });
    toast.success(`${item.titleLine1} added to bag!`, {
      icon: '🛍️',
      style: { borderLeft: `4px solid ${item.accentColor}` },
    });
  };

  return (
    <section 
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative bg-[#0A0A0F] text-white overflow-hidden border-b border-white/10 py-12 sm:py-16 lg:py-20"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0e0c18] via-[#0A0A0F] to-[#140b18]" />

      {/* Dynamic Ambient Radial Glow */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] rounded-full blur-[140px] opacity-25 pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: slide.accentColor }}
      />
      <div className="absolute left-0 bottom-0 w-[300px] h-[300px] rounded-full bg-red-600/10 blur-[100px] pointer-events-none" />

      {/* Subtle Grid Lines */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Main Two-Column Stage */}
      <div className="container-wide relative z-20 w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col-reverse md:flex-row items-center md:items-center justify-between w-full gap-8 lg:gap-14">

          {/* ============================================================
              LEFT COLUMN: Animated Typography & Action Controls
             ============================================================ */}
          <div className="w-full md:w-1/2 flex flex-col justify-center" style={{ minWidth: 0 }}>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex flex-col"
              >
                {/* 1. Badge Row */}
                <div className="h-9 flex items-center mb-3 sm:mb-4">
                  <div className="inline-flex items-center gap-2.5">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 ${slide.badgeColor} text-[11px] sm:text-xs font-black tracking-[0.2em] uppercase shadow-lg rounded-md`}>
                      <BadgeIcon className="w-3.5 h-3.5" />
                      {slide.badge}
                    </span>
                    {slide.discount && (
                      <span className="bg-yellow-400 text-black px-2.5 py-1 text-[11px] sm:text-xs font-black tracking-wider uppercase shadow-md rounded-md">
                        {slide.discount}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Big Headline */}
                <div className="min-h-[90px] sm:min-h-[110px] md:min-h-[130px] flex items-center">
                  <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-wider uppercase leading-[0.92] text-white font-black">
                    <span className="block drop-shadow-md">{slide.titleLine1}</span>
                    <span
                      className="block text-transparent bg-clip-text"
                      style={{
                        backgroundImage: `linear-gradient(to right, #FFFFFF 30%, ${slide.accentColor} 100%)`,
                      }}
                    >
                      {slide.titleLine2}
                    </span>
                  </h1>
                </div>

                {/* 3. Subtitle & Description */}
                <div className="mt-4 sm:mt-5 space-y-2 max-w-xl">
                  <p className="text-[11px] sm:text-xs font-black tracking-[0.25em] uppercase text-red-500">
                    {slide.tagline}
                  </p>
                  <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed font-normal">
                    {slide.description}
                  </p>
                </div>

                {/* 4. Price Row */}
                <div className="h-12 flex items-center mt-3 sm:mt-4">
                  {slide.price ? (
                    <div className="flex items-baseline gap-3.5">
                      <span className="text-3xl sm:text-4xl font-black text-white font-heading tracking-wide">
                        {formatPrice(slide.price)}
                      </span>
                      {slide.compareAtPrice && (
                        <span className="text-sm sm:text-base text-gray-400 line-through font-semibold">
                          {formatPrice(slide.compareAtPrice)}
                        </span>
                      )}
                      <span className="px-2.5 py-1 bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-black uppercase tracking-wider rounded">
                        Save {formatPrice(slide.compareAtPrice! - slide.price)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> OFFICIAL 100% JAPAN IMPORT • AUTHENTIC LICENSED
                    </span>
                  )}
                </div>

                {/* 5. Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-4 sm:pt-5">
                  {slide.primaryIsCart ? (
                    <button
                      onClick={() => handleCartAdd(slide)}
                      className="btn-primary py-3.5 sm:py-4 px-6 sm:px-8 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xl transition-all rounded-md active:scale-95"
                      style={{ backgroundColor: slide.accentColor }}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {slide.primaryCta}
                    </button>
                  ) : (
                    <Link
                      href={slide.primaryLink || '/shop'}
                      className="btn-primary py-3.5 sm:py-4 px-6 sm:px-8 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xl transition-all bg-brand-red rounded-md active:scale-95"
                    >
                      {slide.primaryCta}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}

                  <Link
                    href={slide.secondaryLink}
                    className="btn-secondary py-3.5 sm:py-4 px-5 sm:px-7 text-xs sm:text-sm font-bold transition-all rounded-md active:scale-95"
                  >
                    {slide.secondaryCta}
                  </Link>
                </div>

                {/* 6. Micro Trust Badges */}
                <div className="flex flex-wrap items-center gap-5 sm:gap-7 pt-4 sm:pt-5 border-t border-white/10 text-xs sm:text-sm text-gray-300 font-medium mt-5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>100% Authentic Japanese Import</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <span>Mint-Box Guarantee</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ============================================================
              RIGHT COLUMN: 3D Showcase Card & Controls
             ============================================================ */}
          <div className="w-full md:w-1/2 flex flex-col items-center justify-center shrink-0">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px] bg-gradient-to-b from-[#181622] via-[#0E0D14] to-black border-2 rounded-xl shadow-2xl p-3.5 sm:p-4 flex flex-col justify-between"
                style={{
                  borderColor: `${slide.accentColor}99`,
                  boxShadow: `0 20px 60px -10px ${slide.glowColor}`,
                }}
              >
                {/* 3D Image Container */}
                <div className="relative w-full bg-black overflow-hidden rounded-lg aspect-square">
                  <img
                    src={slide.image}
                    alt={slide.titleLine1}
                    className="w-full h-full object-cover object-top transition-transform duration-700 hover:scale-105"
                  />

                  {/* Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />

                  {/* Top Corner Live Tag */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-black tracking-wider uppercase text-white shadow-lg rounded-md">
                    <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
                    {slide.tag}
                  </div>
                </div>

                {/* Bottom Card Action Strip */}
                <div className="p-3 bg-[#0A0A0F]/90 backdrop-blur-md border border-white/10 flex items-center justify-between mt-3 rounded-lg">
                  <div className="truncate max-w-[170px] sm:max-w-[210px]">
                    <p className="text-[10px] font-black uppercase tracking-wider truncate" style={{ color: slide.accentColor }}>
                      {slide.subtitle}
                    </p>
                    <h3 className="font-heading text-sm sm:text-base text-white uppercase tracking-wider truncate font-black mt-0.5">
                      {slide.titleLine1}
                    </h3>
                  </div>

                  {slide.primaryIsCart ? (
                    <button
                      onClick={() => handleCartAdd(slide)}
                      className="px-3.5 py-1.5 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-md rounded-md"
                      style={{ backgroundColor: slide.accentColor }}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> ADD
                    </button>
                  ) : (
                    <Link
                      href={slide.primaryLink || '/shop'}
                      className="px-3.5 py-1.5 bg-brand-red hover:bg-white hover:text-black text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-md rounded-md"
                    >
                      EXPLORE
                    </Link>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Thumbnail Selectors underneath Right Card */}
            <div className="flex items-center gap-2 mt-4">
              {heroSlides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrent(idx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border transition-all text-[11px] font-black uppercase tracking-wider rounded-md ${
                    idx === current
                      ? 'border-brand-red bg-brand-red/25 text-white shadow-md'
                      : 'border-white/15 bg-black/50 text-gray-400 hover:border-white/40 hover:text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${idx === current ? 'bg-brand-red animate-ping' : 'bg-gray-500'}`} />
                  <span>0{s.id}</span>
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="hidden sm:flex absolute bottom-4 right-6 sm:right-10 z-30 items-center gap-2">
        <button
          onClick={() => setCurrent((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
          className="w-9 h-9 border border-white/20 bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-brand-red hover:border-brand-red transition-all rounded-md"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setCurrent((prev) => (prev + 1) % heroSlides.length)}
          className="w-9 h-9 border border-white/20 bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-brand-red hover:border-brand-red transition-all rounded-md"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
