'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProductDetail, ProductImage } from '@/types';
import { generateWhatsAppLink } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import SizeGuideModal from './SizeGuideModal';

interface ProductDetailClientProps {
  product: ProductDetail;
}

// ─── Image Lightbox Modal ───────────────────────────────────
function ImageLightbox({
  src,
  alt,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  src: string;
  alt: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
        aria-label="Tutup"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Hint */}
      <p className="absolute top-5 left-1/2 -translate-x-1/2 text-white/40 text-xs">
        Klik di luar foto atau tekan Esc untuk menutup
      </p>

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          aria-label="Foto sebelumnya"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          aria-label="Foto berikutnya"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main image */}
      <div
        className="relative max-w-3xl max-h-[85vh] w-full"
        style={{ aspectRatio: '4/5' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 70vw"
          priority
        />
      </div>
    </div>
  );
}

// ─── Share Modal ─────────────────────────────────────────────
function ShareModal({ product, onClose }: { product: ProductDetail; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const productUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(`Lihat produk ini: ${product.title}\n${productUrl}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${product.title}`)}&url=${encodeURIComponent(productUrl)}`;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-3 border-b border-stone-100">
          <h3 className="font-bold text-zinc-900">Bagikan Produk</h3>
          <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{product.title}</p>
        </div>

        <div className="p-5 space-y-3">
          {/* WhatsApp */}
          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-emerald-800 transition-colors"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-sm font-semibold">Kirim via WhatsApp</span>
          </a>

          {/* Twitter/X */}
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="text-sm font-semibold">Bagikan di X / Twitter</span>
          </a>

          {/* Copy Link */}
          <button
            onClick={copyLink}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-zinc-800 transition-colors text-left"
          >
            {copied ? (
              <svg className="w-5 h-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
            <span className={`text-sm font-semibold ${copied ? 'text-emerald-700' : ''}`}>
              {copied ? '✓ Link berhasil disalin!' : 'Salin Tautan Produk'}
            </span>
          </button>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const colors = product.variants_by_color;

  // Initial color
  const initialColor = colors[0]?.color ?? '';
  const [selectedColor, setSelectedColor] = useState<string>(initialColor);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Build ordered image list for lightbox (all images)
  const allImages = useMemo(() => (product.images && product.images.length > 0 ? product.images : []), [product.images]);

  // Active gallery image
  const defaultImage =
    product.primary_image ||
    product.images.find((img) => img.is_primary)?.image_url ||
    product.images[0]?.image_url ||
    colors.find((c) => c.color === initialColor)?.color_image ||
    '';
  const [activeImage, setActiveImage] = useState<string>(defaultImage);

  // Current color's variant sizes
  const currentColorData = colors.find((c) => c.color === selectedColor) || colors[0];

  // Currently selected variant
  const selectedVariant = selectedSize && selectedColor
    ? product.variants.find((v) => v.size === selectedSize && v.color === selectedColor)
    : null;

  // When user clicks a color
  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    setSelectedSize(null);

    const matchingColorImg = product.images.find(
      (img) => img.color && img.color.toLowerCase().trim() === newColor.toLowerCase().trim()
    );

    if (matchingColorImg?.image_url) {
      setActiveImage(matchingColorImg.image_url);
    } else {
      const colorData = colors.find(
        (c) => c.color.toLowerCase().trim() === newColor.toLowerCase().trim()
      );
      if (colorData?.color_image) {
        setActiveImage(colorData.color_image);
      }
    }
  };

  const handleAddToCart = (redirectAfter = false) => {
    if (!selectedSize) {
      setToastMsg('⚠️ Silakan pilih ukuran pakaian terlebih dahulu.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    if (!selectedVariant || selectedVariant.stock_quantity <= 0) {
      setToastMsg('⚠️ Maaf, stok untuk ukuran ini sedang habis.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    addToCart({
      variantId: selectedVariant.id,
      productId: product.id,
      productTitle: product.title,
      slug: product.slug,
      color: selectedColor,
      size: selectedSize,
      price: parseFloat(product.base_price),
      imageUrl: activeImage,
      quantity: 1,
      maxStock: selectedVariant.stock_quantity,
    });

    if (redirectAfter) {
      router.push('/keranjang');
    } else {
      setToastMsg(`✓ ${product.title} (${selectedColor} - ${selectedSize}) masuk keranjang!`);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  // WhatsApp URL
  const whatsappUrl = generateWhatsAppLink(
    product.title,
    selectedSize ?? undefined,
    selectedColor || undefined,
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  );

  // Lightbox helpers
  const openLightbox = useCallback((imgUrl: string) => {
    const idx = allImages.findIndex((img) => img.image_url === imgUrl);
    setLightboxIndex(idx >= 0 ? idx : 0);
  }, [allImages]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevLightbox = useCallback(() => {
    setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  }, []);
  const nextLightbox = useCallback(() => {
    setLightboxIndex((i) => (i !== null && i < allImages.length - 1 ? i + 1 : i));
  }, [allImages.length]);

  // Sync lightbox image with gallery
  useEffect(() => {
    if (lightboxIndex !== null && allImages[lightboxIndex]) {
      setActiveImage(allImages[lightboxIndex].image_url);
    }
  }, [lightboxIndex, allImages]);

  return (
    <>
      {/* ─── BREADCRUMB ──────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs text-stone-400 mb-6" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-zinc-900 transition-colors">Beranda</Link>
        <span>›</span>
        {product.category && (
          <>
            <Link
              href={`/?category=${product.category.slug}`}
              className="hover:text-zinc-900 transition-colors"
            >
              {product.category.name}
            </Link>
            <span>›</span>
          </>
        )}
        <span className="text-zinc-700 font-medium line-clamp-1 max-w-[200px]">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 animate-fade-in">
        {/* ─────────────────────────────────────────
            LEFT: Interactive Image Gallery
            ───────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Main Large Image — click to zoom */}
          <div
            className="relative overflow-hidden bg-stone-100 rounded-2xl shadow-sm border border-stone-200/60 cursor-zoom-in group"
            style={{ aspectRatio: '4/5' }}
            onClick={() => activeImage && openLightbox(activeImage)}
            title="Klik untuk perbesar foto"
          >
            {activeImage ? (
              <Image
                src={activeImage}
                alt={product.title}
                fill
                className="object-cover transition-all duration-500 ease-out group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
                  <path d="M9 10.5l3 3 5-5" strokeWidth="1.5" />
                </svg>
              </div>
            )}

            {/* Badge Status */}
            <div className="absolute top-4 left-4 z-10">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm ${
                product.stock_status === 'Tersedia'
                  ? 'bg-white/90 text-emerald-800 border border-emerald-200'
                  : product.stock_status === 'Hampir Habis'
                  ? 'bg-amber-500/90 text-white'
                  : 'bg-stone-800/90 text-white'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  product.stock_status === 'Tersedia' ? 'bg-emerald-500' : 'bg-white'
                }`} />
                {product.stock_status}
              </span>
            </div>

            {/* Zoom hint */}
            <div className="absolute bottom-4 right-4 z-10 bg-black/50 text-white text-[10px] px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
              </svg>
              Perbesar
            </div>
          </div>

          {/* Thumbnails Row */}
          {product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
              {product.images.map((img: ProductImage, idx: number) => {
                const isSelected = activeImage === img.image_url;
                return (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => {
                      setActiveImage(img.image_url);
                      const imgColor = img.color;
                      if (imgColor) {
                        const matchingColor = colors.find(
                          (c) => c.color.toLowerCase().trim() === imgColor.toLowerCase().trim()
                        );
                        if (matchingColor && matchingColor.color !== selectedColor) {
                          setSelectedColor(matchingColor.color);
                          setSelectedSize(null);
                        }
                      }
                    }}
                    className={`relative shrink-0 w-20 rounded-xl overflow-hidden bg-stone-100 transition-all duration-200 border-2 cursor-pointer ${
                      isSelected
                        ? 'border-zinc-900 ring-2 ring-zinc-900/10 scale-95'
                        : 'border-transparent hover:border-stone-300 opacity-75 hover:opacity-100'
                    }`}
                    style={{ aspectRatio: '4/5' }}
                    aria-label={`Lihat foto ${idx + 1}`}
                  >
                    <Image
                      src={img.image_url}
                      alt={img.alt_text || `${product.title} foto ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                      loading="lazy"
                    />
                    {img.color ? (
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-medium py-0.5 text-center truncate px-1">
                        {img.color}
                      </span>
                    ) : img.is_primary ? (
                      <span className="absolute bottom-0 inset-x-0 bg-zinc-900/80 text-white text-[9px] font-medium py-0.5 text-center truncate px-1">
                        Foto Utama
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────
            RIGHT: Product Details & Selectors
            ───────────────────────────────────────── */}
        <div className="lg:sticky lg:top-24 lg:self-start space-y-6 animate-slide-up">
          {/* Category Tag */}
          {product.category && (
            <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-stone-400">
              {product.category.name}
            </p>
          )}

          {/* Product Title + Share */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-medium text-zinc-900 leading-tight tracking-tight flex-1">
              {product.title}
            </h1>
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="shrink-0 w-9 h-9 rounded-xl border border-stone-300 bg-white flex items-center justify-center text-stone-500 hover:text-zinc-900 hover:border-zinc-900 transition-all"
              title="Bagikan produk"
              aria-label="Bagikan produk ini"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-light text-zinc-900 tracking-wide">
              {product.formatted_price}
            </p>
          </div>

          <div className="divider" />

          {/* ─── COLOR SELECTOR ─── */}
          {colors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wider uppercase text-zinc-900">
                  Pilihan Warna: <span className="font-normal text-stone-500">{selectedColor}</span>
                </p>
                <span className="text-[11px] text-stone-400">Klik warna untuk lihat fotonya</span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {colors.map((c) => {
                  const isSelected = selectedColor === c.color;
                  return (
                    <button
                      key={c.color}
                      type="button"
                      id={`color-${c.color.replace(/\s+/g, '-')}`}
                      onClick={() => handleColorChange(c.color)}
                      className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 text-xs font-medium ${
                        isSelected
                          ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                          : 'border-stone-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-stone-50'
                      }`}
                      aria-pressed={isSelected}
                    >
                      {c.color_image ? (
                        <span className="relative w-6 h-6 rounded-md overflow-hidden bg-stone-200 shrink-0 border border-black/10">
                          <Image
                            src={c.color_image}
                            alt={c.color}
                            fill
                            className="object-cover"
                            sizes="24px"
                          />
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-black/10 bg-stone-300 shrink-0" />
                      )}
                      <span>{c.color}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── SIZE SELECTOR ─── */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wider uppercase text-zinc-900">
                Pilih Ukuran:
              </p>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-zinc-900 underline underline-offset-4 font-medium transition-colors cursor-pointer"
              >
                <span>📏</span>
                <span>Panduan Ukuran</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5" role="group" aria-label="Pilih ukuran baju">
              {currentColorData?.sizes.map((variant) => {
                const isSoldOut = !variant.is_available;
                const isSelected = selectedSize === variant.size;

                return (
                  <button
                    key={variant.size}
                    type="button"
                    id={`size-${variant.size}`}
                    onClick={() => !isSoldOut && setSelectedSize(isSelected ? null : variant.size)}
                    disabled={isSoldOut}
                    aria-pressed={isSelected}
                    aria-label={`Ukuran ${variant.size}${isSoldOut ? ' - Habis' : ''}`}
                    className={`
                      relative flex items-center justify-center min-w-[3.5rem] h-12 px-3.5 rounded-xl text-sm font-semibold border transition-all duration-150 select-none
                      ${isSoldOut
                        ? 'border-dashed border-stone-300 text-stone-400 bg-stone-100/50 cursor-not-allowed line-through'
                        : isSelected
                        ? 'border-zinc-900 bg-zinc-900 text-white shadow-md scale-95'
                        : 'border-stone-300 bg-white text-zinc-800 hover:border-zinc-900 hover:bg-stone-50 active:scale-95'
                      }
                    `}
                  >
                    {variant.size}
                    {isSoldOut && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">✕</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Stok semua warna untuk ukuran yang dipilih */}
            {selectedSize && colors.length > 1 && (
              <div className="mt-2 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                <p className="font-semibold text-zinc-800">Stok size {selectedSize} per warna:</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const sizeInfo = c.sizes.find((s) => s.size === selectedSize);
                    return (
                      <span
                        key={c.color}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                          !sizeInfo || sizeInfo.stock_quantity === 0
                            ? 'bg-rose-50 border-rose-200 text-rose-700 line-through'
                            : sizeInfo.stock_quantity <= 3
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}
                      >
                        {c.color}: {sizeInfo ? `${sizeInfo.stock_quantity} pcs` : 'Habis'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Detail ukuran */}
            {selectedVariant && (
              <div className="mt-3 p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl space-y-1.5 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                    <span>📐</span> Detail Ukuran {selectedVariant.size}:
                  </span>
                  <span className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                    selectedVariant.stock_quantity === 0
                      ? 'bg-rose-100 text-rose-800'
                      : selectedVariant.stock_quantity <= 3
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {selectedVariant.availability_label} (Sisa {selectedVariant.stock_quantity} pcs)
                  </span>
                </div>

                <div className="text-stone-600 font-medium">
                  {selectedVariant.measurements_display || (
                    selectedVariant.measurements
                      ? `LD: ${selectedVariant.measurements.chest_width} cm · PB: ${selectedVariant.measurements.body_length} cm · Bahu: ${selectedVariant.measurements.shoulder_width} cm`
                      : 'Ukuran standar pakaian'
                  )}
                </div>

                {selectedVariant.measurements?.bb_recommendation && (
                  <p className="text-[11px] text-stone-500">
                    💡 Rekomendasi Berat Badan: <strong>{selectedVariant.measurements.bb_recommendation}</strong>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Stock Warning */}
          {selectedVariant && selectedVariant.stock_quantity > 0 && selectedVariant.stock_quantity <= 3 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200/80 rounded-xl">
              <span className="text-amber-600 text-sm">⚠️</span>
              <p className="text-xs text-amber-900">
                Stok sangat terbatas! Hanya tersisa <strong>{selectedVariant.stock_quantity} pcs</strong> untuk ukuran {selectedVariant.size}.
              </p>
            </div>
          )}

          {/* ─── ACTION BUTTONS ─── */}
          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="add-to-cart-btn"
                onClick={() => handleAddToCart(false)}
                disabled={!selectedSize || !selectedVariant?.is_available}
                className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 border ${
                  !selectedSize || !selectedVariant?.is_available
                    ? 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
                    : 'border-zinc-900 bg-white hover:bg-stone-50 text-zinc-900 shadow-sm active:scale-98'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <span>+ Keranjang</span>
              </button>

              <button
                type="button"
                id="buy-now-btn"
                onClick={() => handleAddToCart(true)}
                disabled={!selectedSize || !selectedVariant?.is_available}
                className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 shadow-sm ${
                  !selectedSize || !selectedVariant?.is_available
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white hover:shadow-md active:scale-98'
                }`}
              >
                <span>Beli Sekarang</span>
                <span>→</span>
              </button>
            </div>

            {/* WhatsApp + Share */}
            <div className="flex items-center justify-between pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-stone-500 hover:text-emerald-700 transition-colors py-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>Tanya Admin via WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-zinc-900 transition-colors py-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Bagikan</span>
              </button>
            </div>
          </div>

          <div className="divider" />

          {/* Description */}
          {product.description && (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wider uppercase text-zinc-900">
                Deskripsi Produk
              </p>
              <p className="text-sm font-light text-stone-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── STICKY BAR (MOBILE ONLY) ─── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 md:hidden">
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => handleAddToCart(false)}
            disabled={!selectedSize || !selectedVariant?.is_available}
            className={`flex-1 py-3 px-3 rounded-xl text-xs font-semibold border ${
              !selectedSize || !selectedVariant?.is_available
                ? 'border-stone-200 bg-stone-100 text-stone-400'
                : 'border-zinc-900 bg-white text-zinc-900'
            }`}
          >
            + Keranjang
          </button>
          <button
            type="button"
            onClick={() => handleAddToCart(true)}
            disabled={!selectedSize || !selectedVariant?.is_available}
            className={`flex-1 py-3 px-3 rounded-xl text-xs font-semibold text-white ${
              !selectedSize || !selectedVariant?.is_available
                ? 'bg-stone-400'
                : 'bg-zinc-900 hover:bg-zinc-800'
            }`}
          >
            Beli Sekarang →
          </button>
        </div>
      </div>

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 max-w-sm bg-zinc-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 text-xs font-medium animate-slide-up border border-white/10">
          <span className="flex-1">{toastMsg}</span>
          <Link
            href="/keranjang"
            className="shrink-0 bg-white text-zinc-900 px-3 py-1.5 rounded-lg font-bold hover:bg-stone-100 transition-colors"
          >
            Lihat Keranjang
          </Link>
        </div>
      )}

      {/* ─── SIZE GUIDE MODAL ─── */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        sizeChart={product.size_chart}
        categoryName={product.category?.name || 'Pakaian'}
        customNotes={product.size_guide}
      />

      {/* ─── SHARE MODAL ─── */}
      {isShareOpen && (
        <ShareModal product={product} onClose={() => setIsShareOpen(false)} />
      )}

      {/* ─── LIGHTBOX ─── */}
      {lightboxIndex !== null && allImages[lightboxIndex] && (
        <ImageLightbox
          src={allImages[lightboxIndex].image_url}
          alt={product.title}
          onClose={closeLightbox}
          onPrev={prevLightbox}
          onNext={nextLightbox}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < allImages.length - 1}
        />
      )}
    </>
  );
}
