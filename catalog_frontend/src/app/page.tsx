import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getProducts, getCategories } from '@/lib/api';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import FilterBar from '@/components/FilterBar';
import { ProductGridSkeleton } from '@/components/SkeletonLoaders';
import SortSelect from '@/components/SortSelect';
import type { FilterParams } from '@/types';

export const metadata: Metadata = {
  title: 'Atelier Nusa — Katalog Pakaian Esensial & Modern',
  description: 'Koleksi busana pilihan berbahan French Linen, Oxford 40s, dan Crepe Twill. Didesain nyaman, sejuk, dan presisi untuk iklim tropis.',
};

interface PageProps {
  searchParams: {
    category?: string;
    has_size?: string;
    search?: string;
    page?: string;
    ordering?: string;
    min_price?: string;
    max_price?: string;
  };
}

async function ProductGrid({ searchParams }: PageProps) {
  const filters: FilterParams = {
    category: searchParams.category,
    has_size: searchParams.has_size,
    search: searchParams.search,
    ordering: searchParams.ordering || '-created_at',
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    min_price: searchParams.min_price,
    max_price: searchParams.max_price,
  };

  let data;
  try {
    data = await getProducts(filters);
  } catch {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in bg-white rounded-3xl border border-red-100 p-8 shadow-xs">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5 text-red-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-stone-900 mb-1.5 font-serif">Gagal Memuat Katalog</h3>
        <p className="text-xs text-stone-500 max-w-sm leading-relaxed mb-6">
          Tidak dapat terhubung ke server saat ini. Silakan muat ulang halaman atau coba beberapa saat lagi.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-full bg-stone-900 text-white hover:bg-stone-800 transition-all duration-200 shadow-xs"
        >
          <span>↻ Muat Ulang</span>
        </Link>
      </div>
    );
  }

  if (!data?.results || data.results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in bg-white rounded-3xl border border-stone-200/80 p-8 shadow-xs">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-5 text-stone-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-stone-900 mb-1.5 font-serif">Tidak Ada Pakaian yang Cocok</h3>
        <p className="text-xs text-stone-500 max-w-sm leading-relaxed mb-6">
          Tidak ditemukan produk dengan kriteria filter yang Anda pilih. Silakan atur ulang pencarian atau hapus filter.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-full bg-stone-900 text-white hover:bg-stone-800 transition-all duration-200 shadow-xs"
        >
          <span>← Kembali ke Semua Koleksi</span>
        </Link>
      </div>
    );
  }

  // Pagination numbers
  const currentPage = filters.page || 1;
  const totalPages = Math.ceil(data.count / 12);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Result Count & Sorter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/70">
        <p className="text-xs text-stone-500 tracking-wide">
          Menampilkan <span className="text-stone-900 font-semibold">{data.count}</span> pilihan busana
          {filters.search && (
            <span className="text-stone-700"> untuk kata kunci &quot;{filters.search}&quot;</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold hidden sm:inline">
            Urutkan:
          </span>
          <SortSelect defaultValue={filters.ordering} />
        </div>
      </div>

      {/* Product Grid — 2 Cols Mobile / 4 Cols Desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12">
        {data.results.map((product, idx) => (
          <ProductCard key={product.id} product={product} priority={idx < 4} />
        ))}
      </div>

      {/* Pagination */}
      {(data.next || data.previous) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-10 border-t border-stone-200/80">
          {data.previous && (
            <a
              href={`?${new URLSearchParams({
                ...(filters.category ? { category: String(filters.category) } : {}),
                ...(filters.has_size ? { has_size: String(filters.has_size) } : {}),
                ...(filters.search ? { search: String(filters.search) } : {}),
                ...(filters.ordering ? { ordering: String(filters.ordering) } : {}),
                ...(filters.min_price ? { min_price: String(filters.min_price) } : {}),
                ...(filters.max_price ? { max_price: String(filters.max_price) } : {}),
                page: String(Number(currentPage) - 1),
              }).toString()}`}
              className="inline-flex items-center gap-2 text-xs font-semibold border border-stone-300 bg-white px-5 py-2.5 rounded-full hover:border-stone-900 hover:bg-stone-900 hover:text-white transition-all duration-200 shadow-2xs"
            >
              ← Halaman Sebelumnya
            </a>
          )}
          <span className="text-xs text-stone-500 px-3 font-medium">
            Halaman {currentPage} {totalPages > 1 ? `dari ${totalPages}` : ''}
          </span>
          {data.next && (
            <a
              href={`?${new URLSearchParams({
                ...(filters.category ? { category: String(filters.category) } : {}),
                ...(filters.has_size ? { has_size: String(filters.has_size) } : {}),
                ...(filters.search ? { search: String(filters.search) } : {}),
                ...(filters.ordering ? { ordering: String(filters.ordering) } : {}),
                ...(filters.min_price ? { min_price: String(filters.min_price) } : {}),
                ...(filters.max_price ? { max_price: String(filters.max_price) } : {}),
                page: String(Number(currentPage) + 1),
              }).toString()}`}
              className="inline-flex items-center gap-2 text-xs font-semibold bg-stone-900 text-white px-5 py-2.5 rounded-full hover:bg-stone-800 transition-all duration-200 shadow-2xs"
            >
              Halaman Selanjutnya →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default async function HomePage({ searchParams }: PageProps) {
  const categories = await getCategories();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans">
      <Navbar />

      {/* ─── BESPOKE EDITORIAL LUXURY HERO ─── */}
      <section className="relative pt-24 pb-14 md:pt-28 md:pb-20 overflow-hidden border-b border-stone-200/70 bg-gradient-to-b from-[#F7F4EE] via-[#FAF8F5] to-[#FAF8F5]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column: Brand Story & Call to Action */}
            <div className="lg:col-span-7 space-y-6">
              {/* Seasonal Atelier Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10.5px] tracking-[0.25em] font-bold uppercase bg-stone-200/70 text-stone-700 border border-stone-300/80 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-900" />
                <span>EDISI KAPSUL 2026 // ATELIER NUSA</span>
              </div>

              {/* Editorial Headline */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] font-normal text-stone-900 tracking-tight leading-[1.12]">
                Koleksi Busana Esensial, <br />
                <span className="italic font-normal text-stone-600">Ditenun untuk Kenyamanan.</span>
              </h1>

              {/* Subheadline with Substance */}
              <p className="text-sm md:text-base font-light text-stone-600 max-w-xl leading-relaxed">
                Material French Linen murni, Katun Oxford 40s benang ganda, dan Crepe Twill bertekstur lembut. 
                Dipotong presisi dengan siluet kontemporer yang sejuk, adem, dan rapi untuk gaya harian di iklim tropis.
              </p>

              {/* CTA Action Row */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <a
                  href="#katalog"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-stone-900 text-white text-xs font-semibold tracking-wider uppercase transition-all duration-300 hover:bg-stone-800 hover:shadow-md active:scale-98"
                >
                  <span>Jelajahi Katalog</span>
                  <span>↓</span>
                </a>
                <Link
                  href="/lacak-pesanan"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full border border-stone-300 bg-white text-stone-800 text-xs font-semibold tracking-wider uppercase transition-all duration-300 hover:border-stone-900 hover:bg-stone-50 active:scale-98 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Lacak Pesanan Realtime</span>
                </Link>
              </div>

              {/* Micro-Features Row */}
              <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-3 sm:gap-4 pt-6 border-t border-stone-200/80 text-[11px] text-stone-600 font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-stone-900 font-bold">🌿</span>
                  <span>100% Serat Alami Terkurasi</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-900 font-bold">🔒</span>
                  <span>Stok Terkunci Otomatis</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-900 font-bold">💬</span>
                  <span>Order Cepat via WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Right Column: Editorial Visual Showcase */}
            <div className="lg:col-span-5 relative hidden md:block">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                
                {/* Primary Feature Image Card */}
                <div className="relative aspect-[4/5] w-full max-w-[340px] mx-auto lg:mx-0 lg:ml-auto rounded-3xl overflow-hidden shadow-xl border border-stone-300/80 bg-stone-200">
                  <Image
                    src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1200&q=85"
                    alt="Atelier Nusa French Linen Sage"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 340px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                    <span className="text-[10px] font-mono tracking-widest uppercase opacity-80">EDISI KHUSUS</span>
                    <p className="font-serif text-lg font-medium leading-snug">French Linen Relaxed Shirt</p>
                    <p className="text-[11px] opacity-90 font-sans mt-0.5">Sage Green · Garment Washed</p>
                  </div>
                </div>

                {/* Overlapping Secondary Look Card */}
                <div className="absolute -bottom-6 -left-6 aspect-[4/5] w-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white bg-stone-100 hidden lg:block">
                  <Image
                    src="https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=85"
                    alt="Oxford Button-Down Classic"
                    fill
                    className="object-cover"
                    sizes="192px"
                  />
                  <div className="absolute bottom-2 inset-x-2 bg-white/90 backdrop-blur-xs py-1.5 px-2.5 rounded-xl text-center shadow-xs">
                    <p className="text-[10px] font-bold text-stone-900 truncate">Oxford Classic White</p>
                    <p className="text-[9px] text-stone-500 font-mono">100% Pima Cotton 40s</p>
                  </div>
                </div>

                {/* Editorial Floating Quality Badge */}
                <div className="absolute top-6 left-2 lg:-left-4 bg-white/95 backdrop-blur-md border border-stone-200 px-3.5 py-2 rounded-2xl shadow-md flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-semibold text-stone-800 tracking-wide">
                    Stok Katalog Terverifikasi
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FILTER & SEARCH BAR ─── */}
      <FilterBar
        categories={categories}
        currentCategory={searchParams.category}
        currentSize={searchParams.has_size}
        currentSearch={searchParams.search}
        currentMinPrice={searchParams.min_price}
        currentMaxPrice={searchParams.max_price}
      />

      {/* ─── PRODUCT CATALOG GRID ─── */}
      <main id="katalog" className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-14 w-full flex-1">
        <Suspense fallback={<ProductGridSkeleton count={8} />}>
          <ProductGrid searchParams={searchParams} />
        </Suspense>
      </main>

      {/* ─── BESPOKE BOUTIQUE FOOTER ─── */}
      <footer className="border-t border-stone-200 bg-stone-900 text-stone-300 mt-auto">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-stone-800 text-xs">
            {/* Col 1: Brand Info */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] tracking-[0.25em] uppercase text-stone-400 font-mono font-bold">
                  STUDIO & BOUTIQUE
                </p>
                <p className="text-xl font-serif font-medium text-white tracking-wide mt-0.5">
                  ATELIER NUSA
                </p>
              </div>
              <p className="text-stone-400 leading-relaxed text-[11.5px]">
                Koleksi busana berkualitas tinggi dengan serat alami pilihan seperti French Linen, Pima Cotton 40s ganda, dan Crepe Twill untuk kenyamanan berbusana harian.
              </p>
            </div>

            {/* Col 2: Kategori Pakaian */}
            <div className="space-y-3">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Koleksi Pakaian</p>
              <ul className="space-y-2 text-stone-400 text-[11.5px]">
                <li><Link href="/?category=kemeja" className="hover:text-white transition-colors">Kemeja Linen & Oxford</Link></li>
                <li><Link href="/?category=celana" className="hover:text-white transition-colors">Celana Wide-Leg & Chino</Link></li>
                <li><Link href="/?category=dress" className="hover:text-white transition-colors">Dress Rayon & Satin</Link></li>
                <li><Link href="/?category=outer" className="hover:text-white transition-colors">Outerwear & Cardigan</Link></li>
                <li><Link href="/?category=atasan" className="hover:text-white transition-colors">Kaos Cotton Combed</Link></li>
              </ul>
            </div>

            {/* Col 3: Layanan Pelanggan */}
            <div className="space-y-3">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Bantuan Pelanggan</p>
              <ul className="space-y-2 text-stone-400 text-[11.5px]">
                <li>
                  <Link href="/lacak-pesanan" className="hover:text-white text-emerald-400 font-medium transition-colors flex items-center gap-1.5">
                    <span>📍</span>
                    <span>Lacak Pesanan Realtime</span>
                  </Link>
                </li>
                <li><Link href="/keranjang" className="hover:text-white transition-colors">Keranjang & Checkout</Link></li>
                <li>
                  <a
                    href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''}?text=Halo%20Admin,%20saya%20ingin%20konsultasi%20mengenai%20ukuran%20dan%20stok%20pakaian`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Konsultasi Ukuran via WhatsApp
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Keunggulan Layanan */}
            <div className="space-y-3">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Jaminan Belanja</p>
              <div className="space-y-2.5 text-stone-400 text-[11px]">
                <p className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Stok Realtime:</strong> Sistem otomatis memotong stok pesanan secara instan saat checkout.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Nomor Resi Resmi:</strong> Pengiriman didukung JNE, J&T, SiCepat dengan pelacakan langsung.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>WhatsApp Terverifikasi:</strong> Konfirmasi pesanan dan pembayaran langsung ke nomor toko resmi.</span>
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <p>© {new Date().getFullYear()} Atelier Nusa. Hak Cipta Dilindungi.</p>
            <p className="flex items-center gap-3">
              <span>Pengiriman Seluruh Indonesia</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Sistem Inventori Terintegrasi</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
