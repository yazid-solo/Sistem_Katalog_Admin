'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useTransition, useRef, useEffect } from 'react';
import type { Category } from '@/types';

interface FilterBarProps {
  categories: Category[];
  currentCategory?: string;
  currentSize?: string;
  currentSearch?: string;
  currentMinPrice?: string;
  currentMaxPrice?: string;
}

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const PRICE_PRESETS = [
  { label: 'Semua Harga', min: '', max: '' },
  { label: '< Rp 100rb', min: '', max: '100000' },
  { label: 'Rp 100–200rb', min: '100000', max: '200000' },
  { label: 'Rp 200–350rb', min: '200000', max: '350000' },
  { label: '> Rp 350rb', min: '350000', max: '' },
];

export default function FilterBar({
  categories,
  currentCategory,
  currentSize,
  currentSearch,
  currentMinPrice,
  currentMaxPrice,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(currentSearch || '');
  const [showPriceMenu, setShowPriceMenu] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceRef = useRef<HTMLDivElement>(null);

  // Close price dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (priceRef.current && !priceRef.current.contains(e.target as Node)) {
        setShowPriceMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updateFilter = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      updateFilter({ search: val || null });
    }, 400);
  };

  const currentPriceLabel = () => {
    const min = currentMinPrice || '';
    const max = currentMaxPrice || '';
    const found = PRICE_PRESETS.find((p) => p.min === min && p.max === max);
    return found ? found.label : 'Harga';
  };

  const hasPriceFilter = !!(currentMinPrice || currentMaxPrice);
  const hasFilters = currentCategory || currentSize || currentSearch || hasPriceFilter;

  return (
    <div className={`sticky top-16 z-40 bg-stone-50/97 backdrop-blur-sm border-b border-stone-200/80 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      <div className="max-w-screen-xl mx-auto px-4 md:px-10">

        {/* ── Search Row ── */}
        <div className="flex items-center gap-3 pt-3 pb-2">
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
            </svg>
            <input
              id="search-products"
              type="search"
              placeholder="Cari nama baju, kategori..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder-stone-400"
            />
            {searchInput && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-zinc-900 transition-colors"
                aria-label="Hapus pencarian"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Price Filter Dropdown */}
          <div className="relative" ref={priceRef}>
            <button
              id="filter-price-dropdown"
              onClick={() => setShowPriceMenu(!showPriceMenu)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-all ${
                hasPriceFilter
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'border-stone-300 text-zinc-600 hover:border-zinc-900 bg-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="hidden sm:inline">{currentPriceLabel()}</span>
              <svg className={`w-3 h-3 transition-transform ${showPriceMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPriceMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
                {PRICE_PRESETS.map((preset) => {
                  const isActive = (currentMinPrice || '') === preset.min && (currentMaxPrice || '') === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        updateFilter({ min_price: preset.min || null, max_price: preset.max || null });
                        setShowPriceMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-700 hover:bg-stone-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Clear all filters */}
          {hasFilters && (
            <button
              id="clear-all-filters"
              onClick={clearFilters}
              className="shrink-0 text-[11px] text-stone-400 hover:text-rose-600 transition-colors flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-rose-50"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="hidden sm:inline">Hapus Filter</span>
            </button>
          )}
        </div>

        {/* ── Category + Size Row ── */}
        <div className="flex items-center gap-4 py-2.5 overflow-x-auto scrollbar-hide">
          {/* Category filters */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="filter-all-categories"
              onClick={() => updateFilter({ category: null })}
              className={`text-xs font-medium tracking-wide px-3 py-1.5 transition-all duration-200 border rounded-lg ${
                !currentCategory
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'border-stone-300 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 bg-white'
              }`}
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`filter-category-${cat.slug}`}
                onClick={() => updateFilter({ category: currentCategory === cat.slug ? null : cat.slug })}
                className={`text-xs font-medium tracking-wide px-3 py-1.5 whitespace-nowrap transition-all duration-200 border rounded-lg ${
                  currentCategory === cat.slug
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'border-stone-300 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 bg-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-stone-300 shrink-0" />

          {/* Size filters */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-medium tracking-widest uppercase text-stone-400 mr-1">
              Ukuran
            </span>
            {SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                id={`filter-size-${size}`}
                onClick={() => updateFilter({ has_size: currentSize === size ? null : size })}
                className={`text-[11px] font-medium w-9 h-7 border transition-all duration-200 rounded-md ${
                  currentSize === size
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'border-stone-300 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 bg-white'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Active filters summary */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pb-2.5">
            <span className="text-[10px] text-stone-400 mr-1">Filter aktif:</span>
            {currentSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-medium rounded-full">
                🔍 &quot;{currentSearch}&quot;
                <button onClick={() => handleSearchChange('')} className="ml-0.5 opacity-70 hover:opacity-100">✕</button>
              </span>
            )}
            {currentCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-medium rounded-full">
                📂 {categories.find(c => c.slug === currentCategory)?.name || currentCategory}
                <button onClick={() => updateFilter({ category: null })} className="ml-0.5 opacity-70 hover:opacity-100">✕</button>
              </span>
            )}
            {currentSize && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-medium rounded-full">
                📐 Size {currentSize}
                <button onClick={() => updateFilter({ has_size: null })} className="ml-0.5 opacity-70 hover:opacity-100">✕</button>
              </span>
            )}
            {hasPriceFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-medium rounded-full">
                💰 {currentPriceLabel()}
                <button onClick={() => updateFilter({ min_price: null, max_price: null })} className="ml-0.5 opacity-70 hover:opacity-100">✕</button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
