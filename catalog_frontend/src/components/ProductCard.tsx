import type { Product } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
}

function StockStatusBadge({ status }: { status: Product['stock_status'] }) {
  const config = {
    'Tersedia': { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Tersedia', bg: '' },
    'Hampir Habis': { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Hampir Habis', bg: '' },
    'Habis': { dot: 'bg-stone-400', text: 'text-stone-500', label: 'Habis', bg: '' },
  }[status] ?? { dot: 'bg-stone-400', text: 'text-stone-400', label: status, bg: '' };

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasImage = Boolean(product.primary_image);
  const isOutOfStock = product.stock_status === 'Habis';
  const isLowStock = product.stock_status === 'Hampir Habis';

  // Color dots for available colors
  const uniqueColors = product.available_sizes
    ? Array.from(new Set(product.available_sizes.map((s) => s.size)))
    : [];

  return (
    <Link
      href={`/produk/${product.slug}`}
      className="product-card block group"
      aria-label={`Lihat ${product.title}${isOutOfStock ? ' (Stok Habis)' : ''}`}
    >
      {/* Image — 4:5 Aspect Ratio */}
      <div className="product-card-image-wrapper">
        {hasImage ? (
          <Image
            src={product.primary_image!}
            alt={product.title}
            fill
            className={`product-card-image transition-all duration-500 group-hover:scale-105 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
          />
        ) : (
          /* Placeholder when no image */
          <div className="w-full h-full flex items-center justify-center bg-stone-100">
            <svg className="w-12 h-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="m9 10.5 3 3 5-5" />
            </svg>
          </div>
        )}

        {/* OUT OF STOCK Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-stone-900/80 text-white text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full shadow-lg">
              Stok Habis
            </div>
          </div>
        )}

        {/* LOW STOCK Badge */}
        {isLowStock && !isOutOfStock && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="bg-amber-500 text-white text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm">
              ⚡ Hampir Habis
            </span>
          </div>
        )}

        {/* Overlay — Available Sizes on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/40 to-transparent hidden md:flex items-end gap-1 flex-wrap">
          {product.available_sizes.slice(0, 6).map((s) => (
            <span
              key={s.size}
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                s.available
                  ? 'bg-white/90 text-zinc-900'
                  : 'bg-stone-700/60 text-white/40 line-through'
              }`}
            >
              {s.size}
            </span>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="pt-3 space-y-1">
        {/* Category */}
        {product.category && (
          <p className="text-[10px] font-medium tracking-widest uppercase text-stone-400">
            {product.category.name}
          </p>
        )}

        {/* Title */}
        <h3 className={`text-sm font-medium leading-snug line-clamp-2 group-hover:text-zinc-600 transition-colors ${isOutOfStock ? 'text-stone-400' : 'text-zinc-900'}`}>
          {product.title}
        </h3>

        {/* Price + Status row */}
        <div className="flex items-center justify-between pt-0.5">
          <p className={`text-sm font-light tracking-wide ${isOutOfStock ? 'text-stone-400 line-through' : 'text-zinc-700'}`}>
            {product.formatted_price}
          </p>
          <StockStatusBadge status={product.stock_status} />
        </div>
      </div>
    </Link>
  );
}
