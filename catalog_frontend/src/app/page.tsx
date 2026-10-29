import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getProducts, getCategories, getConsultationWhatsAppLink } from '@/lib/api';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import FilterBar from '@/components/FilterBar';
import { ProductGridSkeleton } from '@/components/SkeletonLoaders';
import SortSelect from '@/components/SortSelect';
import type { FilterParams } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'DLRS — Katalog Pakaian Harian, Santai & Muslimah Lengkap',
  description: 'Pusat koleksi Daster, Kulot, Kulot Polos, Celana Pendek, Bogo, Setelan Dewasa & Anak, Kaos, Outer, Kain Pantai, Mukena, dan Hijab dengan bahan adem pilihan dan harga bersahabat.',
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

  // Pagination numbers (Backend PAGE_SIZE = 20)
  const currentPage = filters.page || 1;
  const totalPages = Math.ceil(data.count / 20);

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
            <div className="lg:col-span-7 space-y-5">
              {/* Editorial Headline */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.35rem] font-normal text-stone-900 tracking-tight leading-[1.12]">
                Koleksi Pakaian Harian, <br />
                <span className="italic font-normal text-stone-600">Sejuk, Nyaman &amp; Bersahabat.</span>
              </h1>

              {/* Subheadline with Substance */}
              <p className="text-sm md:text-base font-light text-stone-600 max-w-xl leading-relaxed">
                Hadir lengkap mulai dari <strong className="font-medium text-stone-800">Daster, Kulot &amp; Kulot Polos, Setelan Panjang/Pendek, Setelan Anak, Celana Pendek &amp; Bogo, Kaos, Outer, Kain Pantai,</strong> hingga <strong className="font-medium text-stone-800">Mukena dan Hijab</strong>. Bahan Rayon Viscose, Crinkle Airflow, dan Katun Combed yang adem untuk aktivitas sepanjang hari.
              </p>

              {/* 12 Quick Item Highlights */}
              <div className="flex flex-wrap gap-1.5 pt-1 max-w-xl">
                {[
                  { label: 'Kulot', href: '/?category=kulot' },
                  { label: 'Kulot Polos', href: '/?category=kulot&search=Polos' },
                  { label: 'Celana Pendek', href: '/?category=celana-pendek-bogo' },
                  { label: 'Bogo', href: '/?category=celana-pendek-bogo&search=Bogo' },
                  { label: 'Kaos', href: '/?category=kaos' },
                  { label: 'Daster', href: '/?category=daster' },
                  { label: 'Setelan Panjang/Pendek', href: '/?category=setelan' },
                  { label: 'Kain Pantai', href: '/?category=kain-pantai' },
                  { label: 'Outer', href: '/?category=outer' },
                  { label: 'Setelan Anak', href: '/?category=setelan-anak' },
                  { label: 'Mukena', href: '/?category=mukena-hijab&search=Mukena' },
                  { label: 'Hijab', href: '/?category=mukena-hijab&search=Hijab' },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="text-[11px] font-medium px-3 py-1 rounded-full bg-white border border-stone-200/90 text-stone-700 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all shadow-2xs"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* CTA Action Row */}
              <div className="pt-2">
                <a
                  href="#katalog"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-stone-900 text-white text-xs font-semibold tracking-wider uppercase transition-all duration-300 hover:bg-stone-800 hover:shadow-md active:scale-98"
                >
                  <span>Jelajahi Katalog Pakaian</span>
                  <span>↓</span>
                </a>
              </div>

              {/* Micro-Features Row */}
              <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-3 sm:gap-4 pt-5 border-t border-stone-200/80 text-[11px] text-stone-600 font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-stone-900 font-bold">🌿</span>
                  <span>Bahan Adem &amp; Nyaman Harian</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-900 font-bold">📐</span>
                  <span>Tersedia Semua Ukuran &amp; All Size</span>
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
                    src="/hero-one-set.jpg"
                    alt="Koleksi Daster, One Set & Kulot Harian"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 340px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                    <span className="text-[10px] font-mono tracking-widest uppercase opacity-80">FAVORIT HARIAN</span>
                    <p className="font-serif text-lg font-medium leading-snug">Daster, One Set &amp; Kulot Adem</p>
                    <p className="text-[11px] opacity-90 font-sans mt-0.5">Rayon Viscose &amp; Crinkle Airflow · Mulai Rp 25rb</p>
                  </div>
                </div>

                {/* Overlapping Secondary Look Card */}
                <div className="absolute -bottom-6 -left-6 aspect-[4/5] w-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white bg-stone-100 hidden lg:block">
                  <Image
                    src="/hero-kulot-gajah.png"
                    alt="Koleksi Kulot Motif & Celana Santai"
                    fill
                    className="object-cover object-center"
                    sizes="192px"
                  />
                  <div className="absolute bottom-2 inset-x-2 bg-white/95 backdrop-blur-xs py-1.5 px-2.5 rounded-xl text-center shadow-xs">
                    <p className="text-[10px] font-bold text-stone-900 truncate">Kulot &amp; Celana Santai</p>
                    <p className="text-[9px] text-stone-500 font-mono">All Size · Standar · Jumbo</p>
                  </div>
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
              <div className="flex items-center gap-3">
                <div className="bg-white/95 px-2.5 py-1.5 rounded-lg inline-flex items-center">
                  <img
                    src="/DLRS_Logo.svg"
                    alt="Logo Katalog Pakaian DLRS"
                    className="h-6 w-auto object-contain"
                  />
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.22em] uppercase text-stone-400 font-mono font-bold">
                    DAILY WEAR &amp; BOUTIQUE
                  </p>
                  <p className="text-base font-serif font-medium text-white tracking-wide">
                    DLRS — Katalog Pakaian
                  </p>
                </div>
              </div>
              <p className="text-stone-400 leading-relaxed text-[11.5px]">
                Pusat koleksi pakaian harian, santai, anak, dan muslimah pilihan: Daster, Kulot, Kulot Polos, Celana Pendek, Bogo, Kaos, Setelan, Outer, Kain Pantai, Mukena, dan Hijab.
              </p>
            </div>

            {/* Col 2: Kategori Pakaian */}
            <div className="space-y-3">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Koleksi Pakaian</p>
              <ul className="space-y-2 text-stone-400 text-[11.5px]">
                <li><Link href="/?category=daster" className="hover:text-white transition-colors">Daster Rayon &amp; Harian</Link></li>
                <li><Link href="/?category=kulot" className="hover:text-white transition-colors">Kulot &amp; Kulot Polos</Link></li>
                <li><Link href="/?category=setelan" className="hover:text-white transition-colors">Setelan Panjang &amp; Pendek</Link></li>
                <li><Link href="/?category=celana-pendek-bogo" className="hover:text-white transition-colors">Celana Pendek &amp; Bogo</Link></li>
                <li><Link href="/?category=kaos" className="hover:text-white transition-colors">Kaos &amp; Outer Santai</Link></li>
                <li><Link href="/?category=setelan-anak" className="hover:text-white transition-colors">Setelan Anak &amp; Kain Pantai</Link></li>
                <li><Link href="/?category=mukena-hijab" className="hover:text-white transition-colors">Mukena &amp; Hijab</Link></li>
              </ul>
            </div>

            {/* Col 3: Layanan Pelanggan */}
            <div className="space-y-3">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Bantuan Pelanggan</p>
              <ul className="space-y-2 text-stone-400 text-[11.5px]">
                <li>
                  <Link href="/lacak-pesanan" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <span>📍</span>
                    <span>Lacak Pesanan</span>
                  </Link>
                </li>
                <li><Link href="/keranjang" className="hover:text-white transition-colors">Keranjang & Checkout</Link></li>
                <li>
                  <a
                    href={getConsultationWhatsAppLink()}
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
            <p>© {new Date().getFullYear()} DLRS Katalog Pakaian. Hak Cipta Dilindungi.</p>
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
