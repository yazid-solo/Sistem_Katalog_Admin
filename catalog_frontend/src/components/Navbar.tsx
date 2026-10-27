'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { totalItems } = useCart();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200/80 shadow-2xs'
          : 'bg-[#FAF8F5]/60 backdrop-blur-xs'
      }`}
    >
      <nav className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 h-16 flex items-center justify-between">
        {/* Brand Logo — Editorial Fashion Identity */}
        <Link href="/" className="flex items-center group select-none py-1" aria-label="Beranda DLRS">
          <div className="relative flex items-center transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/DLRS_Logo.svg"
              alt="DLRS Logo"
              width={140}
              height={55}
              className="h-9 sm:h-11 md:h-12 w-auto object-contain"
              priority
            />
          </div>
        </Link>

        {/* Nav Links — Desktop */}
        <div className="hidden lg:flex items-center gap-7 text-xs font-semibold tracking-wider uppercase text-stone-600">
          <Link href="/" className="hover:text-stone-900 transition-colors py-1">
            Semua Koleksi
          </Link>
          <Link href="/?category=kemeja" className="hover:text-stone-900 transition-colors py-1">
            Kemeja
          </Link>
          <Link href="/?category=celana" className="hover:text-stone-900 transition-colors py-1">
            Celana
          </Link>
          <Link href="/?category=dress" className="hover:text-stone-900 transition-colors py-1">
            Dress
          </Link>
          <Link href="/?category=outer" className="hover:text-stone-900 transition-colors py-1">
            Outerwear
          </Link>
          <Link
            href="/lacak-pesanan"
            className="flex items-center gap-1.5 text-stone-800 hover:text-stone-950 bg-stone-200/60 hover:bg-stone-200 px-3 py-1.5 rounded-full transition-all text-[11px]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Lacak Pesanan</span>
          </Link>
        </div>

        {/* Right Section — Quick Links & Cart */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Lacak Pesanan Mobile */}
          <Link
            href="/lacak-pesanan"
            className="inline-flex lg:hidden items-center gap-1.5 text-[11px] font-semibold text-stone-700 bg-stone-200/60 hover:bg-stone-200 px-2.5 py-1.5 rounded-full transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Lacak</span>
          </Link>

          {/* Cart Button */}
          <Link
            href="/keranjang"
            id="nav-cart-btn"
            className="relative p-2.5 text-stone-800 hover:text-stone-950 hover:bg-stone-200/50 rounded-full transition-colors flex items-center justify-center cursor-pointer"
            aria-label={`Keranjang Belanja (${totalItems} barang)`}
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 min-w-[20px] h-5 px-1 rounded-full bg-stone-900 text-white text-[10.5px] font-bold flex items-center justify-center shadow-xs animate-scale-in">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </Link>
        </div>
      </nav>
    </header>
  );
}
