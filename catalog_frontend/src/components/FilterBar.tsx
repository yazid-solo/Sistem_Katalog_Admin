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
    <div className={`relative z-40 md:sticky md:top-16 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/80 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10">

        {/* ── Search & Price Row ── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3.5 pb-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
            </svg>
            <input
              id="search-products"
              type="search"
              placeholder="Cari pakaian, kemeja, warna..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 rounded-full border border-stone-300/90 text-xs bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-all shadow-2xs font-medium"
            />
            {searchInput && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 transition-colors"
                aria-label="Hapus pencarian"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Price Range Filter */}
          <div className="relative" ref={priceRef}>
            <button
              id="filter-price-dropdown"
              onClick={() => setShowPriceMenu(!showPriceMenu)}
              className={`flex items-center gap-2 whitespace-nowrap text-xs font-semibold tracking-wider uppercase px-4 py-2.5 rounded-full border transition-all shadow-2xs ${
                hasPriceFilter
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'border-stone-300/90 text-stone-700 hover:border-stone-900 bg-white'
              }`}
            >
              <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{currentPriceLabel()}</span>
              <svg className={`w-3 h-3 transition-transform ${showPriceMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPriceMenu && (
              <div className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-48 max-w-[calc(100vw-2rem)] bg-white border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in p-1">
                {PRICE_PRESETS.map((preset) => {
                  const isActive = (currentMinPrice || '') === preset.min && (currentMaxPrice || '') === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        updateFilter({ min_price: preset.min || null, max_price: preset.max || null });
                        setShowPriceMenu(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-stone-900 text-white font-semibold'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Clear All Filters Button */}
          {hasFilters && (
            <button
              id="clear-all-filters"
              onClick={clearFilters}
              className="shrink-0 text-[11px] font-semibold tracking-wider uppercase text-stone-500 hover:text-rose-700 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-full border border-stone-200 bg-white hover:border-rose-300 hover:bg-rose-50 shadow-2xs"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="hidden sm:inline">Reset Filter</span>
            </button>
          )}
        </div>

        {/* ── Category & Size Selector Row ── */}
        <div className="flex items-center gap-3 py-2.5 overflow-x-auto scrollbar-hide">
          {/* Category Chips */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="filter-all-categories"
              onClick={() => updateFilter({ category: null })}
              className={`text-xs font-semibold tracking-wider uppercase px-4 py-2 transition-all duration-200 rounded-full border shadow-2xs ${
                !currentCategory
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'border-stone-300/80 text-stone-600 hover:border-stone-900 hover:text-stone-900 bg-white'
              }`}
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`filter-category-${cat.slug}`}
                onClick={() => updateFilter({ category: currentCategory === cat.slug ? null : cat.slug })}
                className={`text-xs font-semibold tracking-wider uppercase px-4 py-2 whitespace-nowrap transition-all duration-200 rounded-full border shadow-2xs ${
                  currentCategory === cat.slug
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'border-stone-300/80 text-stone-600 hover:border-stone-900 hover:text-stone-900 bg-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-stone-300/80 shrink-0" />

          {/* Size Pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-400 mr-1 hidden sm:inline">
              Ukuran
            </span>
            {SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                id={`filter-size-${size}`}
                onClick={() => updateFilter({ has_size: currentSize === size ? null : size })}
                className={`text-[11px] font-bold w-9 h-8 border transition-all duration-200 rounded-lg shadow-2xs ${
                  currentSize === size
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'border-stone-300/80 text-stone-600 hover:border-stone-900 hover:text-stone-900 bg-white'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* ── Active Filters Summary Pills ── */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pb-3 pt-1 border-t border-stone-200/60">
            <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mr-1">
              Filter Aktif:
            </span>
            {currentSearch && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-white text-[10.5px] font-semibold rounded-full shadow-2xs">
                <span>🔍 &quot;{currentSearch}&quot;</span>
                <button onClick={() => handleSearchChange('')} className="ml-1 opacity-70 hover:opacity-100">✕</button>
              </span>
            )}
            {currentCategory && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-white text-[10.5px] font-semibold rounded-full shadow-2xs">
                <span>📂 {categories.find(c => c.slug === currentCategory)?.name || currentCategory}</span>
                <button onClick={() => updateFilter({ category: null })} className="ml-1 opacity-70 hover:opacity-100">✕</button>
              </span>
            )}
            {currentSize && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-white text-[10.5px] font-semibold rounded-full shadow-2xs">
                <span>📐 Size {currentSize}</span>
                <button onClick={() => updateFilter({ has_size: null })} className="ml-1 opacity-70 hover:opacity-100">✕</button>
              </span>
            )}
            {hasPriceFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-white text-[10.5px] font-semibold rounded-full shadow-2xs">
                <span>💰 {currentPriceLabel()}</span>
                <button onClick={() => updateFilter({ min_price: null, max_price: null })} className="ml-1 opacity-70 hover:opacity-100">✕</button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
