import { Suspense } from 'react';
import type { Metadata } from 'next';
import ShopClient from './ShopClient';

export const metadata: Metadata = {
  title: 'Shop All Anime Figures & Collectibles | BAKA',
  description:
    'Browse our complete collection of anime figures, statues, and collectibles. Filter by anime, character, brand, price, and more.',
};

interface ShopPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);

  return (
    <Suspense fallback={<div className="min-h-screen bg-white animate-pulse" />}>
      <ShopClient
        initialFilter={typeof resolvedSearchParams.filter === 'string' ? resolvedSearchParams.filter : undefined}
        initialCategory={typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined}
        initialAnime={typeof resolvedSearchParams.anime === 'string' ? resolvedSearchParams.anime : undefined}
      />
    </Suspense>
  );
}
