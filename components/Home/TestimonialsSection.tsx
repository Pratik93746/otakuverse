'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    rating: 5,
    review:
      'The Goku Ultra Instinct figure I ordered is absolutely stunning. The detail on the hair and eyes is mind-blowing. Quality rivals anything I\'ve seen from major retailers at half the price!',
    name: 'Arjun Sharma',
    city: 'Mumbai',
    purchase: 'Goku Ultra Instinct Figure',
    avatar: '🧑‍🦱',
  },
  {
    id: 2,
    rating: 5,
    review:
      'Fast delivery and the packaging was so secure I was impressed. My Nezuko figure arrived without a scratch. The COD option made it so much easier for me to trust the purchase.',
    name: 'Priya Nair',
    city: 'Bangalore',
    purchase: 'Nezuko Kamado Figure',
    avatar: '👩‍🦰',
  },
  {
    id: 3,
    rating: 5,
    review:
      'I\'ve been collecting anime figures for 8 years and OTAKUVERSE is now my go-to store. Huge selection, authentic products, and the Gojo Satoru figure I got is the crown jewel of my collection.',
    name: 'Rohit Verma',
    city: 'Delhi',
    purchase: 'Gojo Satoru Limited Figure',
    avatar: '🧔',
  },
  {
    id: 4,
    rating: 5,
    review:
      'Ordered the Luffy Gear 5 figure for my birthday. It exceeded all my expectations — the white hair detail and the smile captured perfectly. Will definitely order more!',
    name: 'Sneha Patel',
    city: 'Ahmedabad',
    purchase: 'Luffy Gear 5 Figure',
    avatar: '👩',
  },
  {
    id: 5,
    rating: 4,
    review:
      'Good selection and quick shipping. The Demon Slayer figures I ordered look great on my shelf. Customer support was also helpful when I had a query about my order status.',
    name: 'Karthik Rao',
    city: 'Chennai',
    purchase: 'Tanjiro Kamado Figure',
    avatar: '🧑',
  },
  {
    id: 6,
    rating: 5,
    review:
      'A true collector\'s paradise. The 360-degree view feature on the website helped me check every angle before buying. My Zoro Three Sword Style figure is a masterpiece!',
    name: 'Ananya Singh',
    city: 'Hyderabad',
    purchase: 'Roronoa Zoro Figure',
    avatar: '👩‍🦱',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 fill-gray-600'}`}
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  const [start, setStart] = useState(0);
  const visible = 3;
  const max = testimonials.length - visible;

  const prev = () => setStart((s) => Math.max(0, s - 1));
  const next = () => setStart((s) => Math.min(max, s + 1));
  const shown = testimonials.slice(start, start + visible);

  return (
    <section className="section-spacing relative overflow-hidden" style={{ backgroundColor: '#0A0A0F' }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 50% 50% at 20% 50%, rgba(230, 51, 41, 0.15) 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 80% 50%, rgba(123, 47, 190, 0.1) 0%, transparent 70%)',
        }}
      />

      <div className="container-wide relative z-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="section-title text-white">WHAT COLLECTORS SAY</h2>
          <div className="h-0.5 w-16 bg-brand-red mx-auto mt-3" />
          <p className="text-sm text-gray-400 mt-3">
            Real reviews from our collector community
          </p>
        </div>

        {/* Reviews grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {shown.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-6 border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm hover:border-white/[0.15] transition-all duration-300"
            >
              <StarRating rating={t.rating} />

              <blockquote className="mt-4 text-sm text-gray-300 leading-relaxed line-clamp-4">
                &ldquo;{t.review}&rdquo;
              </blockquote>

              <div className="mt-5 flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                <span className="text-2xl">{t.avatar}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.city}</p>
                  <p className="text-[10px] text-brand-red mt-0.5 font-medium truncate max-w-[150px]">
                    Verified Purchase: {t.purchase}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={prev}
            disabled={start === 0}
            className="w-9 h-9 border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500">
            {start + 1}–{Math.min(start + visible, testimonials.length)} of {testimonials.length}
          </span>
          <button
            onClick={next}
            disabled={start >= max}
            className="w-9 h-9 border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
