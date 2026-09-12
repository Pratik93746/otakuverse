'use client';

import Link from 'next/link';
import { Flame, ArrowRight } from 'lucide-react';

const marqueeItems = [
  '✦ 100% AUTHENTIC JAPANESE IMPORT',
  '✦ MINT CONDITION PACKAGING GUARANTEED',
  '✦ FREE EXPRESS SHIPPING ON ORDERS OVER ₹1,999',
  '✦ INTERACTIVE 3D & 360° FIGURE VIEWERS',
  '✦ CASH ON DELIVERY & ZERO COST EMI',
  '✦ DRAGON BALL • ONE PIECE • NARUTO • JUJUTSU KAISEN • DEMON SLAYER • BLEACH',
];

export function PromoBanner() {
  return (
    <div className="bg-[#0A0A0F] text-white border-y border-white/10 relative overflow-hidden" style={{ backgroundColor: '#0A0A0F' }}>
      {/* 1. Live Animated Anime Ticker Bar */}
      <div className="bg-brand-red text-white py-2.5 overflow-hidden flex items-center shadow-lg">
        <div className="flex whitespace-nowrap animate-marquee">
          {marqueeItems.concat(marqueeItems).map((text, i) => (
            <span
              key={i}
              className="text-xs font-black tracking-[0.2em] uppercase mx-6 flex items-center gap-2"
            >
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Hot Flash Drop Strip */}
      <div className="container-wide py-4 sm:py-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-600/50 flex items-center justify-center text-brand-red flex-shrink-0">
            <Flame className="w-5 h-5 text-red-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-red-500 uppercase">
                LIMITED COLLECTOR ALERT
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            </div>
            <p className="font-heading text-lg sm:text-xl tracking-wider uppercase text-white leading-tight font-black">
              NEW JAPANESE IMPORT WAVE JUST LANDED • EXTRA 10% OFF CODE: <span className="text-yellow-400 font-mono">OTAKU10</span>
            </p>
          </div>
        </div>

        <Link
          href="/shop?filter=new"
          className="btn-primary py-2.5 px-5 text-xs tracking-widest uppercase flex items-center gap-2 shadow-lg whitespace-nowrap flex-shrink-0 rounded-md"
        >
          CLAIM YOUR DROP <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
