'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Terbaru' },
  { value: 'created_at', label: 'Terlama' },
  { value: 'base_price', label: 'Harga: Termurah' },
  { value: '-base_price', label: 'Harga: Termahal' },
  { value: 'title', label: 'Nama: A–Z' },
  { value: '-title', label: 'Nama: Z–A' },
];

interface SortSelectProps {
  defaultValue?: string;
}

export default function SortSelect({ defaultValue = '-created_at' }: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('ordering', e.target.value);
    params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-[11px] text-stone-400 whitespace-nowrap hidden sm:block">
        Urutkan:
      </label>
      <select
        id="sort-select"
        value={defaultValue}
        onChange={handleChange}
        className={`text-xs font-medium border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer transition-opacity ${
          isPending ? 'opacity-50' : ''
        }`}
        aria-label="Urutkan produk"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
