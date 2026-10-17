'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { totalItems } = useCart();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-stone-50/90 backdrop-blur-md border-b border-stone-200/60'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-screen-xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-none">
          <span className="text-[11px] font-light tracking-[0.25em] text-stone-400 uppercase">
            Premium
          </span>
          <span className="text-lg font-semibold tracking-tight text-zinc-900">
            KATALOG
          </span>
        </Link>

        {/* Nav Links — Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="nav-link">Koleksi</Link>
          <Link href="/?category=kemeja" className="nav-link">Kemeja</Link>
          <Link href="/?category=dress" className="nav-link">Dress</Link>
          <Link href="/?category=outer" className="nav-link">Outer</Link>
          <Link href="/lacak-pesanan" className="nav-link font-medium text-emerald-800">Lacak Pesanan</Link>
        </div>

        {/* Right — Cart & Search */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Lacak Pesanan Mobile Icon / Short Link */}
          <Link
            href="/lacak-pesanan"
            className="text-xs font-semibold text-stone-600 hover:text-zinc-900 px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors md:hidden"
          >
            Lacak
          </Link>

          {/* Cart Icon with Counter */}
          <Link
            href="/keranjang"
            id="nav-cart-btn"
            className="relative p-2.5 text-zinc-700 hover:text-zinc-900 hover:bg-stone-100 rounded-full transition-colors flex items-center justify-center"
            aria-label={`Keranjang Belanja (${totalItems} barang)`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center shadow-sm animate-scale-in">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </Link>

          {/* Admin shortcut link */}
          <Link
            href="/admin-toko"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-stone-100 transition-colors border border-stone-200"
          >
            <span>Admin Toko</span>
            <span>↗</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
