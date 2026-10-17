'use client';

import { useEffect } from 'react';
import type { SizeChartItem } from '@/types';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  sizeChart?: SizeChartItem[];
  categoryName?: string;
  customNotes?: string;
}

export default function SizeGuideModal({
  isOpen,
  onClose,
  sizeChart = [],
  categoryName = 'Pakaian',
  customNotes,
}: SizeGuideModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBottoms = categoryName.toLowerCase().includes('celana') || categoryName.toLowerCase().includes('rok');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-10 animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-[#FAF9F6]">
          <div>
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-stone-400">
              Panduan Resmi
            </span>
            <h2 className="text-lg font-serif font-medium text-zinc-900">
              Tabel Ukuran Detail ({categoryName})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-zinc-900 hover:bg-stone-200/50 transition-colors"
            aria-label="Tutup panduan ukuran"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Custom Notes if any */}
          {customNotes && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <span className="text-amber-600 text-sm mt-0.5">ℹ️</span>
              <div>
                <strong className="font-semibold block mb-0.5">Catatan Khusus Produk:</strong>
                {customNotes}
              </div>
            </div>
          )}

          {/* Measurement Table */}
          <div className="overflow-x-auto rounded-xl border border-stone-200 shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Ukuran</th>
                  {!isBottoms ? (
                    <>
                      <th className="py-3 px-4">Lingkar Dada (LD)</th>
                      <th className="py-3 px-4">Panjang Baju (PB)</th>
                      <th className="py-3 px-4">Lebar Bahu</th>
                      <th className="py-3 px-4">Panjang Lengan</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4">Lingkar Pinggang (LP)</th>
                      <th className="py-3 px-4">Panjang Celana/Rok</th>
                    </>
                  )}
                  <th className="py-3 px-4">Rekomendasi BB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-zinc-700">
                {sizeChart.map((row) => (
                  <tr key={row.size} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-900 bg-stone-50/30">
                      {row.size}
                    </td>
                    {!isBottoms ? (
                      <>
                        <td className="py-3 px-4 font-medium">{row.chest_width} cm</td>
                        <td className="py-3 px-4">{row.body_length} cm</td>
                        <td className="py-3 px-4">{row.shoulder_width} cm</td>
                        <td className="py-3 px-4">{row.sleeve_length} cm</td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium">{row.waist_width} cm</td>
                        <td className="py-3 px-4">{row.body_length} cm</td>
                      </>
                    )}
                    <td className="py-3 px-4 text-stone-500 bg-stone-50/20">
                      {row.bb_recommendation || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cara Mengukur */}
          <div className="bg-[#FAF9F6] p-4 rounded-xl border border-stone-200/80 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <span>📏</span> Cara Mengukur Pakaian Anda
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-600">
              <li className="flex items-start gap-2">
                <span className="font-bold text-zinc-900">•</span>
                <span><strong>Lingkar Dada (LD):</strong> Ukur melingkar di bawah ketiak pada bagian dada yang paling bidang.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-zinc-900">•</span>
                <span><strong>Panjang Baju (PB):</strong> Ukur dari titik bahu tertinggi lurus ke bawah hingga ujung keliman bawah.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-zinc-900">•</span>
                <span><strong>Lebar Bahu:</strong> Ukur lurus dari jahitan ujung bahu kiri ke ujung bahu kanan.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-zinc-900">•</span>
                <span><strong>Toleransi Ukuran:</strong> Wajar ada selisih ±1-2 cm karena proses pemotongan dan jahitan manual.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs">
          <p className="text-stone-400">Masih ragu memilih ukuran? Konsultasikan gratis lewat WhatsApp.</p>
          <button
            onClick={onClose}
            className="btn-primary text-xs px-5 py-2 rounded-lg"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
