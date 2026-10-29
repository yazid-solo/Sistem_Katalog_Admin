'use client';

import { useEffect } from 'react';
import type { SizeChartItem } from '@/types';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  sizeChart?: SizeChartItem[];
  categoryName?: string;
  productTitle?: string;
  customNotes?: string;
}

export default function SizeGuideModal({
  isOpen,
  onClose,
  sizeChart = [],
  categoryName = 'Pakaian',
  productTitle = '',
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

  const catLower = categoryName.toLowerCase();
  const titleLower = productTitle.toLowerCase();

  const isFabricRect =
    catLower.includes('kain pantai') ||
    titleLower.includes('kain pantai') ||
    titleLower.includes('hijab') ||
    titleLower.includes('kerudung') ||
    titleLower.includes('pashmina') ||
    titleLower.includes('segi empat');

  const isMukena = !isFabricRect && (titleLower.includes('mukena') || catLower.includes('mukena'));

  const isSetelan = !isFabricRect && !isMukena && (catLower.includes('setelan') || titleLower.includes('setelan'));

  const isBottoms =
    !isFabricRect &&
    !isMukena &&
    !isSetelan &&
    (catLower.includes('celana') ||
      catLower.includes('kulot') ||
      catLower.includes('bogo') ||
      catLower.includes('rok') ||
      titleLower.includes('kulot') ||
      titleLower.includes('celana') ||
      titleLower.includes('bogo'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-10 animate-slide-up max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-stone-100 bg-[#FAF9F6]">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-stone-400">
              Panduan Resmi
            </span>
            <h2 className="text-lg font-serif font-medium text-zinc-900">
              Tabel Ukuran Detail ({categoryName})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-stone-400 hover:text-zinc-900 hover:bg-stone-200/50 transition-colors"
            aria-label="Tutup panduan ukuran"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-6 text-sm">
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
            <table className="w-full min-w-[480px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Ukuran</th>
                  {isFabricRect ? (
                    <>
                      <th className="py-3 px-4">Panjang Kain</th>
                      <th className="py-3 px-4">Lebar Kain</th>
                    </>
                  ) : isMukena ? (
                    <>
                      <th className="py-3 px-4">Panjang Atasan</th>
                      <th className="py-3 px-4">Panjang Rok</th>
                      <th className="py-3 px-4">Lingkar Pinggang (LP)</th>
                    </>
                  ) : isSetelan ? (
                    <>
                      <th className="py-3 px-4">Lingkar Dada (LD)</th>
                      <th className="py-3 px-4">Panjang Baju (PB)</th>
                      <th className="py-3 px-4">LP Celana (Melar)</th>
                    </>
                  ) : isBottoms ? (
                    <>
                      <th className="py-3 px-4">Lingkar Pinggang (LP)</th>
                      <th className="py-3 px-4">Panjang Celana</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4">Lingkar Dada (LD)</th>
                      <th className="py-3 px-4">Panjang Baju (PB)</th>
                      <th className="py-3 px-4">Lebar Bahu</th>
                      <th className="py-3 px-4">Panjang Lengan</th>
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
                    {isFabricRect ? (
                      <>
                        <td className="py-3 px-4 font-medium">{row.body_length} cm</td>
                        <td className="py-3 px-4">{row.chest_width} cm</td>
                      </>
                    ) : isMukena ? (
                      <>
                        <td className="py-3 px-4 font-medium">{row.chest_width} cm</td>
                        <td className="py-3 px-4">{row.body_length} cm</td>
                        <td className="py-3 px-4">{row.waist_width} cm</td>
                      </>
                    ) : isSetelan ? (
                      <>
                        <td className="py-3 px-4 font-medium">{row.chest_width} cm</td>
                        <td className="py-3 px-4">{row.body_length} cm</td>
                        <td className="py-3 px-4">{row.waist_width} cm</td>
                      </>
                    ) : isBottoms ? (
                      <>
                        <td className="py-3 px-4 font-medium">{row.waist_width} cm</td>
                        <td className="py-3 px-4">{row.body_length} cm</td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium">{row.chest_width} cm</td>
                        <td className="py-3 px-4">{row.body_length} cm</td>
                        <td className="py-3 px-4">{row.shoulder_width} cm</td>
                        <td className="py-3 px-4">{row.sleeve_length} cm</td>
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
              <span>📏</span> Cara Mengukur {isFabricRect ? 'Dimensi Kain' : isMukena ? 'Mukena Anda' : isBottoms ? 'Celana / Kulot Anda' : 'Pakaian Anda'}
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-600">
              {isFabricRect ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-zinc-900">•</span>
                    <span><strong>Panjang Kain:</strong> Ukur bentangan kain dari ujung atas hingga ujung bawah dalam posisi rata.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-zinc-900">•</span>
                    <span><strong>Lebar Kain:</strong> Ukur bentangan sisi kiri ke kanan pada permukaan datar.</span>
                  </li>
                </>
              ) : isMukena ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-zinc-900">•</span>
                    <span><strong>Panjang Atasan:</strong> Ukur dari puncak kepala/dahi lurus ke bawah hingga ujung kain depan.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-zinc-900">•</span>
                    <span><strong>Panjang Rok &amp; LP:</strong> Ukur panjang bawahan dari karet pinggang ke mata kaki, serta rentang karet pinggang maksimal.</span>
                  </li>
                </>
              ) : isSetelan ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-zinc-900">•</span>
                    <span><strong>Lingkar Dada (LD) &amp; PB:</strong> Ukur melingkar di bagian dada terlebar dan panjang atasan dari bahu ke bawah.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-zinc-900">•</span>
                    <span><strong>LP Celana (Melar):</strong> Ukur lingkar pinggang celana saat karet ditarik nyaman.</span>
                  </li>
                </>
              ) : isBottoms ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-zinc-900">•</span>
                    <span><strong>Lingkar Pinggang (LP):</strong> Ukur melingkar di bagian pinggang; karet pinggang dapat melar mengikuti bentuk tubuh.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-zinc-900">•</span>
                    <span><strong>Panjang Celana:</strong> Ukur dari tepi atas karet pinggang lurus ke bawah hingga ujung celana.</span>
                  </li>
                </>
              ) : (
                <>
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
                </>
              )}
              <li className="flex items-start gap-2">
                <span className="font-bold text-zinc-900">•</span>
                <span><strong>Toleransi Ukuran:</strong> Wajar ada selisih ±1-2 cm karena proses pemotongan dan jahitan manual.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
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
