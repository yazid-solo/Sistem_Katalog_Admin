import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'DLRS — Katalog Pakaian Harian, Santai & Muslimah',
    template: '%s | DLRS Katalog Pakaian',
  },
  description: 'Koleksi lengkap Daster, Kulot, Kulot Polos, Celana Pendek, Bogo, Kaos, Setelan Panjang/Pendek, Setelan Anak, Outer, Kain Pantai, Mukena, dan Hijab.',
  keywords: ['daster', 'kulot', 'kulot polos', 'celana pendek', 'celana bogo', 'kaos', 'setelan harian', 'setelan anak', 'outer', 'kain pantai', 'mukena', 'hijab', 'katalog pakaian'],
  openGraph: {
    title: 'DLRS — Katalog Pakaian Harian, Santai & Muslimah',
    description: 'Koleksi lengkap Daster, Kulot, Kulot Polos, Setelan Dewasa & Anak, Celana Pendek, Bogo, Kaos, Outer, Kain Pantai, Mukena & Hijab.',
    type: 'website',
  },
};

import { CartProvider } from '@/context/CartContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-stone-50 text-zinc-900 font-sans antialiased">
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
