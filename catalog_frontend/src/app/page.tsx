import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getProducts, getCategories } from '@/lib/api';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import FilterBar from '@/components/FilterBar';
import { ProductGridSkeleton } from '@/components/SkeletonLoaders';
import SortSelect from '@/components/SortSelect';
import type { FilterParams } from '@/types';

export const metadata: Metadata = {
  title: 'Koleksi — Katalog Pakaian Premium',
  description: 'Temukan koleksi pakaian premium pilihan. Kemeja, dress, outer, dan lebih banyak lagi dengan kualitas terbaik.',
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

  const data = await getProducts(filters);

  if (data.results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-2">Produk tidak ditemukan</h3>
        <p className="text-sm text-stone-400 max-w-xs leading-relaxed">
          Coba ubah kata kunci pencarian, kategori, atau hapus filter yang aktif.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-xl border border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all duration-200"
        >
          ← Lihat Semua Produk
        </a>
      </div>
    );
  }

  // Pagination numbers
  const currentPage = filters.page || 1;
  const totalPages = Math.ceil(data.count / 12); // assume 12 per page

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Result count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400 tracking-wide">
          Menampilkan <span className="text-zinc-900 font-semibold">{data.count}</span> produk
          {filters.search && (
            <span className="text-zinc-600"> untuk &quot;{filters.search}&quot;</span>
          )}
        </p>
        <SortSelect defaultValue={filters.ordering} />
      </div>

      {/* Product grid — 2 cols mobile / 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
        {data.results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Pagination */}
      {(data.next || data.previous) && (
        <div className="flex items-center justify-center gap-3 pt-8 border-t border-stone-200">
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
              className="inline-flex items-center gap-2 text-xs font-semibold border border-stone-300 px-5 py-2.5 rounded-xl hover:border-zinc-900 hover:bg-zinc-900 hover:text-white transition-all duration-200"
            >
              ← Sebelumnya
            </a>
          )}
          <span className="text-xs text-stone-400 px-3">Hal. {currentPage}{totalPages > 1 ? ` / ${totalPages}` : ''}</span>
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
              className="inline-flex items-center gap-2 text-xs font-semibold bg-zinc-900 text-white px-5 py-2.5 rounded-xl hover:bg-zinc-800 transition-all duration-200"
            >
              Selanjutnya →
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
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden bg-stone-100">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10">
          <div className="flex flex-col items-start justify-end min-h-[50vh] md:min-h-[60vh] pb-12 pt-20">
            <p className="text-[11px] font-medium tracking-[0.3em] uppercase text-stone-400 mb-4">
              Koleksi Terkini
            </p>
            <h1 className="font-serif text-4xl md:text-6xl font-medium text-zinc-900 leading-tight max-w-lg mb-6">
              Keanggunan yang
              <em className="not-italic text-stone-500"> Tak Lekang</em>
            </h1>
            <p className="text-sm font-light text-stone-500 max-w-sm leading-relaxed mb-8">
              Pakaian premium dirancang untuk keseharian Anda — dari bahan terbaik, 
              potongan yang presisi, dan warna yang abadi.
            </p>
            <a
              href="#katalog"
              className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-zinc-900 border-b border-zinc-900 pb-0.5 hover:gap-4 transition-all duration-300"
            >
              Lihat Koleksi
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Decorative element */}
        <div
          className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-stone-200/50 to-transparent"
          aria-hidden="true"
        />
      </section>

      {/* Filter Bar */}
      <FilterBar
        categories={categories}
        currentCategory={searchParams.category}
        currentSize={searchParams.has_size}
        currentSearch={searchParams.search}
        currentMinPrice={searchParams.min_price}
        currentMaxPrice={searchParams.max_price}
      />

      {/* Product Catalog */}
      <main id="katalog" className="max-w-screen-xl mx-auto px-6 md:px-10 py-12">
        <Suspense fallback={<ProductGridSkeleton count={8} />}>
          <ProductGrid searchParams={searchParams} />
        </Suspense>
      </main>

      {/* Professional Brand Footer */}
      <footer className="border-t border-stone-200 mt-20 bg-stone-900 text-stone-300">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800 text-xs">
            {/* Col 1: Brand Info */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-bold">ATELIER NUSA</p>
                <p className="text-lg font-bold text-white tracking-tight">KATALOG PAKAIAN</p>
              </div>
              <p className="text-stone-400 leading-relaxed">
                Koleksi busana berkualitas tinggi dengan material pilihan seperti French Linen, Pima Cotton, dan Crepe Twill untuk kenyamanan iklim tropis.
              </p>
            </div>

            {/* Col 2: Kategori */}
            <div className="space-y-3">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Koleksi Pakaian</p>
              <ul className="space-y-2 text-stone-400">
                <li><Link href="/?category=kemeja" className="hover:text-white transition-colors">Kemeja Linen & Oxford</Link></li>
                <li><Link href="/?category=celana" className="hover:text-white transition-colors">Celana Wide Leg & Chino</Link></li>
                <li><Link href="/?category=dress" className="hover:text-white transition-colors">Dress Rayon & Satin</Link></li>
                <li><Link href="/?category=outer" className="hover:text-white transition-colors">Blazer & Knit Cardigan</Link></li>
                <li><Link href="/?category=atasan" className="hover:text-white transition-colors">Kaos Cotton Combed</Link></li>
              </ul>
            </div>

            {/* Col 3: Layanan Pelanggan & Lacak */}
            <div className="space-y-3">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Layanan & Bantuan</p>
              <ul className="space-y-2 text-stone-400">
                <li>
                  <Link href="/lacak-pesanan" className="hover:text-white text-emerald-400 font-medium transition-colors flex items-center gap-1.5">
                    <span>📍</span>
                    <span>Lacak Pesanan Realtime</span>
                  </Link>
                </li>
                <li><Link href="/keranjang" className="hover:text-white transition-colors">Keranjang Belanja</Link></li>
                <li>
                  <a
                    href="https://wa.me/6283835782010?text=Halo%20Admin,%20saya%20ingin%20bertanya%20mengenai%20produk%20katalog%20pakaian"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Konsultasi Ukuran via WA
                  </a>
                </li>
                <li><Link href="/admin-toko" className="hover:text-white transition-colors">Portal Admin Toko</Link></li>
              </ul>
            </div>

            {/* Col 4: Keunggulan Layanan */}
            <div className="space-y-3">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Jaminan Belanja</p>
              <div className="space-y-2 text-stone-400 text-[11px]">
                <p className="flex items-start gap-2">
                  <span>✓</span>
                  <span><strong>Stok Realtime:</strong> Sistem otomatis mengunci stok pesanan Anda secara langsung.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span>✓</span>
                  <span><strong>Pengiriman Aman:</strong> Didukung kurir JNE, J&T, dan SiCepat dengan nomor resi terverifikasi.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span>✓</span>
                  <span><strong>WhatsApp Direct:</strong> Konfirmasi pembayaran mudah dan cepat langsung dengan tim toko kami.</span>
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <p>© {new Date().getFullYear()} Katalog Pakaian Premium. Hak Cipta Dilindungi.</p>
            <p className="flex items-center gap-4">
              <span>Pengiriman Seluruh Indonesia</span>
              <span>•</span>
              <span className="text-emerald-400">Sistem Inventory Otomatis</span>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
