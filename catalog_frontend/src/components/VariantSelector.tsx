'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ProductDetail, VariantsByColor } from '@/types';
import { generateWhatsAppLink } from '@/lib/api';

interface VariantSelectorProps {
  product: ProductDetail;
}

export default function VariantSelector({ product }: VariantSelectorProps) {
  const colors = product.variants_by_color;
  const [selectedColor, setSelectedColor] = useState<string>(
    colors[0]?.color ?? ''
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const currentColorData = colors.find((c) => c.color === selectedColor);

  const whatsappUrl = generateWhatsAppLink(
    product.title,
    selectedSize ?? undefined,
    selectedColor,
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  );

  const selectedVariant = selectedSize && selectedColor
    ? product.variants.find(v => v.size === selectedSize && v.color === selectedColor)
    : null;

  return (
    <>
      {/* ── Color Selector ── */}
      {colors.length > 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-widest uppercase text-stone-400">
              Warna
            </p>
            <p className="text-xs text-zinc-700 font-medium">{selectedColor}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {colors.map(({ color }) => (
              <button
                key={color}
                id={`color-${color.replace(/\s+/g, '-')}`}
                onClick={() => {
                  setSelectedColor(color);
                  setSelectedSize(null);
                }}
                className={`
                  text-xs px-3 py-2 border transition-all duration-150 tracking-wide
                  ${selectedColor === color
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-stone-300 text-zinc-600 hover:border-zinc-700'
                  }
                `}
                aria-pressed={selectedColor === color}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Size Selector ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-widest uppercase text-stone-400">
            Ukuran
          </p>
          {selectedVariant && (
            <span className={`text-xs font-medium ${
              selectedVariant.stock_quantity === 0
                ? 'text-rust-500'
                : selectedVariant.stock_quantity <= 3
                  ? 'text-amber-600'
                  : 'text-sage-500'
            }`}>
              {selectedVariant.availability_label}
              {selectedVariant.stock_quantity > 0 && ` · ${selectedVariant.stock_quantity} pcs`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih ukuran">
          {currentColorData?.sizes.map((variant) => {
            const isSoldOut = !variant.is_available;
            const isSelected = selectedSize === variant.size;

            return (
              <button
                key={variant.size}
                id={`size-${variant.size}`}
                onClick={() => !isSoldOut && setSelectedSize(isSelected ? null : variant.size)}
                disabled={isSoldOut}
                aria-pressed={isSelected}
                aria-label={`Ukuran ${variant.size}${isSoldOut ? ' - Habis' : ''}`}
                className={`
                  size-btn
                  ${isSoldOut
                    ? 'size-btn-sold-out'
                    : isSelected
                      ? 'size-btn-selected'
                      : 'size-btn-available'
                  }
                `}
              >
                {variant.size}
              </button>
            );
          })}
        </div>

        {/* Size guide */}
        <button className="text-[11px] text-stone-400 hover:text-zinc-700 transition-colors underline underline-offset-2">
          Panduan Ukuran
        </button>
      </div>

      {/* ── Stock Warning ── */}
      {selectedVariant && selectedVariant.stock_quantity > 0 && selectedVariant.stock_quantity <= 3 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100">
          <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-xs text-amber-800">
            Hanya tersisa <strong>{selectedVariant.stock_quantity} pcs</strong> untuk ukuran ini. Segera hubungi kami!
          </p>
        </div>
      )}

      {/* ── WhatsApp CTA (Desktop) ── */}
      <div className="hidden md:block space-y-3 pt-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="whatsapp-cta-desktop"
          className={`
            btn-primary w-full
            ${!selectedSize
              ? 'opacity-70'
              : 'bg-[#25D366] hover:bg-[#1FAD56] border-[#25D366]'
            }
          `}
        >
          <WhatsAppIcon />
          {selectedSize
            ? `Tanya Stok via WhatsApp — ${selectedSize}`
            : 'Pilih Ukuran Terlebih Dahulu'
          }
        </a>
        <p className="text-[11px] text-center text-stone-400">
          Tim kami akan membalas dalam 1×24 jam
        </p>
      </div>
    </>
  );
}

// ── Sticky WhatsApp Bar (Mobile) ──
export function StickyWhatsAppBar({ product }: { product: ProductDetail }) {
  return (
    <div className="glass-bar md:hidden safe-area-bottom">
      <div className="px-5 py-4">
        <a
          href={generateWhatsAppLink(product.title, undefined, undefined)}
          target="_blank"
          rel="noopener noreferrer"
          id="whatsapp-cta-mobile"
          className="flex items-center justify-center gap-3 w-full py-3.5 bg-[#25D366] text-white text-sm font-medium tracking-wide transition-all duration-200 active:scale-[0.98]"
        >
          <WhatsAppIcon />
          Tanya via WhatsApp
        </a>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
