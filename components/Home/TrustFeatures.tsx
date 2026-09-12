'use client';

import { Shield, Package, Truck, Lock, Banknote } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Shield,
    title: '100% AUTHENTIC',
    body: 'Direct Tokyo imports & licensed',
    gradient: 'from-red-500 to-orange-500',
    glow: 'rgba(239, 68, 68, 0.3)',
  },
  {
    icon: Package,
    title: 'SAFE PACKAGING',
    body: 'Double-bubble mint box guarantee',
    gradient: 'from-violet-500 to-purple-500',
    glow: 'rgba(139, 92, 246, 0.3)',
  },
  {
    icon: Truck,
    title: 'FAST SHIPPING',
    body: 'Express Pan-India delivery',
    gradient: 'from-cyan-400 to-blue-500',
    glow: 'rgba(34, 211, 238, 0.3)',
  },
  {
    icon: Lock,
    title: 'SECURE PAYMENTS',
    body: 'Cards, UPI & Net Banking',
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'rgba(52, 211, 153, 0.3)',
  },
  {
    icon: Banknote,
    title: 'COD AVAILABLE',
    body: 'Cash on delivery enabled',
    gradient: 'from-amber-400 to-yellow-500',
    glow: 'rgba(251, 191, 36, 0.3)',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function TrustFeatures() {
  return (
    <section
      className="relative overflow-hidden py-8 md:py-10"
      style={{ backgroundColor: '#0D0D14' }}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top & bottom border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

      <div className="container-wide relative z-10">
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                className="group relative flex flex-col items-center text-center px-3 py-5 rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.06]"
              >
                {/* Icon glow on hover */}
                <div
                  className="absolute top-4 w-14 h-14 rounded-full opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"
                  style={{ backgroundColor: f.glow }}
                />

                {/* Icon */}
                <div
                  className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-3 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl`}
                >
                  <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                </div>

                {/* Title — white text for dark bg */}
                <p className="font-heading text-sm font-black tracking-[0.15em] uppercase text-white whitespace-nowrap mb-1">
                  {f.title}
                </p>

                {/* Description — light gray for readability */}
                <p className="text-[11px] text-gray-400 font-medium leading-snug">
                  {f.body}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
