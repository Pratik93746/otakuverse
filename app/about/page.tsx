import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Award, ShieldCheck, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About BAKA | Premium Anime Wall Art & Posters',
  description: 'The story behind BAKA — India’s premier anime fine art poster and canvas studio.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-narrow bg-white p-8 sm:p-12 border border-gray-200 rounded-sm shadow-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-brand-red" />
          <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Our Story</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-wide mb-6">
          About BAKA Studio
        </h1>

        <div className="prose prose-sm text-gray-700 space-y-6 text-sm leading-relaxed mb-10">
          <p>
            BAKA was founded by lifelong anime enthusiasts and digital artists with a singular mission: to bring museum-grade anime wall art, premium prints, and aesthetic manga panels into homes across India.
          </p>
          <p>
            Standard commercial posters fade within months and curl on standard flimsy paper. We refused to accept that standard. Every poster we print is produced using state-of-the-art 12-color archival pigment inkjets on heavy 300 GSM matte fine art paper, rated for 50+ years of vibrant, fade-resistant color.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 border border-gray-100 bg-gray-50/50 rounded-xl text-center">
            <Award className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900">300 GSM Archival</h3>
            <p className="text-[11px] text-gray-500 mt-1">Heavy fine art paper that lies flat and never curls</p>
          </div>
          <div className="p-5 border border-gray-100 bg-gray-50/50 rounded-xl text-center">
            <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900">Hard-Tube Packed</h3>
            <p className="text-[11px] text-gray-500 mt-1">Crush-resistant cylindrical tube packaging</p>
          </div>
          <div className="p-5 border border-gray-100 bg-gray-50/50 rounded-xl text-center">
            <Heart className="w-6 h-6 text-rose-500 mx-auto mb-2" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900">Free PAN-India Ship</h3>
            <p className="text-[11px] text-gray-500 mt-1">Fast delivery to 19,000+ PIN codes across India</p>
          </div>
        </div>

        <div className="text-center pt-4 border-t border-gray-100">
          <Link href="/shop" className="btn-primary inline-flex text-xs py-3 px-6">
            Explore Poster Collections →
          </Link>
        </div>
      </div>
    </div>
  );
}
