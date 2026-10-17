import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-6 text-center">
      <p className="text-[10px] font-medium tracking-[0.3em] uppercase text-stone-400 mb-6">
        404 — Tidak Ditemukan
      </p>
      <h1 className="font-serif text-4xl md:text-5xl font-medium text-zinc-900 mb-4">
        Halaman Ini Kosong
      </h1>
      <p className="text-sm font-light text-stone-400 max-w-xs mb-10 leading-relaxed">
        Produk yang Anda cari mungkin sudah tidak tersedia atau URL yang Anda masukkan tidak tepat.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-zinc-900 border-b border-zinc-900 pb-0.5 hover:gap-4 transition-all duration-300"
      >
        ← Kembali ke Koleksi
      </Link>
    </div>
  );
}
