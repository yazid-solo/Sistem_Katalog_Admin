import type { Product } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

function StockStatusBadge({ status }: { status: Product['stock_status'] }) {
  const config = {
    'Tersedia': { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Tersedia' },
    'Hampir Habis': { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Sisa Sedikit' },
    'Habis': { dot: 'bg-stone-400', text: 'text-stone-400', label: 'Habis' },
  }[status] ?? { dot: 'bg-stone-400', text: 'text-stone-400', label: status };

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const hasImage = Boolean(product.primary_image);
  const isOutOfStock = product.stock_status === 'Habis';
  const isLowStock = product.stock_status === 'Hampir Habis';

  return (
    <Link
      href={`/produk/${product.slug}`}
      className="group block relative cursor-pointer"
      aria-label={`Lihat ${product.title}${isOutOfStock ? ' (Stok Habis)' : ''}`}
    >
      {/* Image Container — 4:5 Aspect Ratio */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-stone-100 border border-stone-200/70 transition-all duration-300 group-hover:border-stone-400/80 group-hover:shadow-md">
        {hasImage ? (
          <Image
            src={product.primary_image!}
            alt={product.title}
            fill
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
              isOutOfStock ? 'opacity-40 grayscale' : ''
            }`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-300 gap-2">
            <svg className="w-10 h-10 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={1}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="m9 10.5 3 3 5-5" />
            </svg>
            <span className="text-[10px] uppercase tracking-wider text-stone-400">Belum Ada Foto</span>
          </div>
        )}

        {/* Low Stock Badge */}
        {isLowStock && !isOutOfStock && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 bg-amber-500/95 text-white text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm backdrop-blur-xs">
              <span>⚡</span> Sisa Sedikit
            </span>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-[1px]">
            <span className="bg-stone-900/90 text-white text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg border border-white/10">
              Stok Habis
            </span>
          </div>
        )}

        {/* Hover Sizes Quick Preview */}
        {product.available_sizes && product.available_sizes.length > 0 && (
          <div className="absolute bottom-0 inset-x-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/60 via-black/30 to-transparent hidden sm:flex items-center justify-center gap-1 flex-wrap">
            {product.available_sizes.slice(0, 8).map((s) => (
              <span
                key={s.size}
                className={`text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm transition-transform ${
                  s.available
                    ? 'bg-white/95 text-stone-900 shadow-xs'
                    : 'bg-black/50 text-white/50 line-through'
                }`}
              >
                {s.size}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="pt-3.5 space-y-1">
        {/* Category */}
        {product.category && (
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-stone-400">
            {product.category.name}
          </p>
        )}

        {/* Title */}
        <h3 className={`text-sm font-medium leading-snug line-clamp-2 transition-colors duration-200 group-hover:text-stone-600 ${
          isOutOfStock ? 'text-stone-400' : 'text-stone-900'
        }`}>
          {product.title}
        </h3>

        {/* Price & Status Row */}
        <div className="flex items-center justify-between pt-1">
          <p className={`text-sm font-semibold tracking-tight ${
            isOutOfStock ? 'text-stone-400 line-through' : 'text-stone-900'
          }`}>
            {product.formatted_price}
          </p>
          <StockStatusBadge status={product.stock_status} />
        </div>
      </div>
    </Link>
  );
}
