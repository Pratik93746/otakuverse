import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';

export const metadata: Metadata = {
  title: 'All Anime Characters Vault | OTAKUVERSE',
  description: 'Find official figures and statues by character: Goku, Luffy, Zoro, Gojo, Naruto, Sasuke, Tanjiro, Nezuko, Ichigo, Deku, and more.',
};

export default function CharactersHubPage() {
  // Aggregate unique characters
  const charMap = new Map<string, { name: string; slug: string; animeName: string; animeSlug: string; image: string; count: number }>();

  MOCK_PRODUCTS.forEach((p) => {
    if (p.characterName && p.characterName !== 'Anime Legend' && p.characterName !== 'Hero Alliance') {
      const slug = p.characterName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!charMap.has(slug)) {
        charMap.set(slug, {
          name: p.characterName,
          slug,
          animeName: p.animeName ?? 'Anime',
          animeSlug: p.animeSlug ?? 'anime',
          image: p.image,
          count: 1,
        });
      } else {
        const existing = charMap.get(slug)!;
        existing.count += 1;
      }
    }
  });

  const characters = Array.from(charMap.values()).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-[#0A0A0F] to-[#12111A] text-white py-12 md:py-16 border-b border-white/[0.08] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(230, 51, 41, 0.3) 0%, transparent 70%)',
          }}
        />

        <div className="container-wide relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/15 border border-red-600/40 text-red-400 text-xs font-black tracking-[0.2em] uppercase mb-4 rounded-md">
            <User className="w-3.5 h-3.5 text-brand-red" />
            CHARACTER VAULT
          </div>
          <h1 className="font-heading text-4xl sm:text-6xl tracking-widest uppercase font-black">
            BROWSE BY CHARACTER
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-3 leading-relaxed">
            Discover all figure releases, resin statues, and scale models dedicated to your favorite anime hero or villain.
          </p>
        </div>
      </div>

      {/* Character Grid */}
      <div className="container-wide py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {characters.map((char) => (
            <Link
              key={char.slug}
              href={`/characters/${char.slug}`}
              className="group relative rounded-xl overflow-hidden border border-gray-200 bg-white hover:border-brand-red hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
                <Image
                  src={char.image}
                  alt={char.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="p-3 text-center flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider truncate">
                    {char.animeName}
                  </p>
                  <h3 className="font-heading text-sm sm:text-base tracking-wide text-gray-900 uppercase font-black mt-0.5 group-hover:text-brand-red transition-colors truncate">
                    {char.name}
                  </h3>
                </div>
                <p className="text-[11px] text-gray-400 mt-2 font-medium">
                  {char.count} {char.count === 1 ? 'figure' : 'figures'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
