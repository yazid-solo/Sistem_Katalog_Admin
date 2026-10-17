import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

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
    default: 'Katalog Pakaian Premium',
    template: '%s | Katalog Pakaian Premium',
  },
  description: 'Koleksi pakaian premium dengan kualitas terbaik. Temukan pilihan kemeja, dress, outer, dan aksesoris pilihan.',
  keywords: ['pakaian premium', 'fashion', 'baju wanita', 'katalog pakaian', 'quiet luxury'],
  openGraph: {
    title: 'Katalog Pakaian Premium',
    description: 'Koleksi pakaian premium dengan kualitas terbaik.',
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
