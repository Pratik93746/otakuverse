import type { Metadata, Viewport } from 'next';
import { Inter, Bebas_Neue } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { CartDrawer } from '@/components/Cart/CartDrawer';
import { Toaster } from 'react-hot-toast';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'OTAKUVERSE — Premium Anime Collectibles & Figures',
    template: '%s | OTAKUVERSE',
  },
  description:
    'Bring your favorite anime characters to life. Shop premium anime figures, statues, collectibles, and limited editions at OTAKUVERSE.',
  keywords: [
    'anime figures',
    'anime collectibles',
    'action figures',
    'anime statues',
    'limited edition figures',
    'Goku figure',
    'Naruto figure',
    'One Piece collectibles',
    'OTAKUVERSE',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'OTAKUVERSE',
    title: 'OTAKUVERSE — Premium Anime Collectibles & Figures',
    description: 'Bring your favorite anime characters to life.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'OTAKUVERSE — Premium Anime Collectibles',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OTAKUVERSE — Premium Anime Collectibles',
    description: 'Bring your favorite anime characters to life.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <CartDrawer />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#12111A',
                color: '#E5E5E5',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '14px',
                fontFamily: 'var(--font-inter)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
