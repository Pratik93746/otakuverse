import { Suspense } from 'react';
import type { Metadata } from 'next';
import ShopClient from '@/app/shop/ShopClient';

// Re-read prices, stock and visibility from the database at most once a minute.
export const revalidate = 60;

interface CollectionPageProps {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const formatted = slug.replace(/-/g, ' ').toUpperCase();
  return {
    title: `${formatted} Collection | BAKA`,
    description: `Shop premium ${formatted.toLowerCase()} anime figures and collectibles at BAKA.`,
  };
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    Promise.resolve(params),
    Promise.resolve(searchParams),
  ]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-white animate-pulse" />}>
      <ShopClient
        initialCategory={slug}
        initialFilter={typeof resolvedSearchParams.filter === 'string' ? resolvedSearchParams.filter : undefined}
        initialAnime={typeof resolvedSearchParams.anime === 'string' ? resolvedSearchParams.anime : undefined}
      />
    </Suspense>
  );
}
