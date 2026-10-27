'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

interface OrderItemDetail {
  id: number;
  product_title: string;
  color: string;
  size: string;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
}

interface OrderDetailResponse {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  shipping_province: string;
  shipping_city: string;
  shipping_district?: string;
  shipping_address: string;
  shipping_cost: string | number;
  subtotal_items: string | number;
  total_amount: string | number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  items: OrderItemDetail[];
}

function LacakPesananContent() {
  const searchParams = useSearchParams();
  const initialOrder = searchParams.get('order') || '';

  const [orderQuery, setOrderQuery] = useState(initialOrder);
  const [orderData, setOrderData] = useState<OrderDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedResi, setCopiedResi] = useState(false);

  const fetchOrderDetail = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/orders/${cleanCode}/`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Nomor pesanan "${cleanCode}" tidak ditemukan. Pastikan format nomor pesanan sesuai (contoh: ORD-20261017-ABCDE).`);
        }
        throw new Error('Terjadi kesalahan saat memuat data pesanan.');
      }
      const data = await res.json();
      setOrderData(data);
    } catch (err: any) {
      setOrderData(null);
      setErrorMsg(err.message || 'Gagal mencari pesanan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrder) {
      setOrderQuery(initialOrder);
      fetchOrderDetail(initialOrder);
    }
  }, [initialOrder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrderDetail(orderQuery);
  };

  const handleCopyResi = async (resi: string) => {
    try {
      await navigator.clipboard.writeText(resi);
      setCopiedResi(true);
      setTimeout(() => setCopiedResi(false), 2500);
    } catch {}
  };

  // Status mapping
  const getStepProgress = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 1;
      case 'CONFIRMED':
        return 2;
      case 'SHIPPED':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0; // CANCELLED
    }
  };

  const currentStep = orderData ? getStepProgress(orderData.status) : 0;
  const isCancelled = orderData?.status === 'CANCELLED';

  const sellerPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  const waHelpUrl = orderData
    ? `https://wa.me/${sellerPhone}?text=${encodeURIComponent(
        `Halo Admin, saya ingin menanyakan status pesanan saya dengan nomor *${orderData.order_number}* atas nama *${orderData.customer_name}*. Terima kasih.`
      )}`
    : `https://wa.me/${sellerPhone}`;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 md:px-8 pt-24 pb-20 w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-stone-400">
            Realtime Tracking
          </p>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
            Lacak Status Pesanan
          </h1>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            Pantau status pesanan pakaian, verifikasi pembayaran, dan nomor resi pengiriman kurir Anda secara langsung dan realtime.
          </p>
        </div>

        {/* Search Bar Form */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200/80 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                🔍
              </span>
              <input
                type="text"
                required
                placeholder="Masukkan Nomor Pesanan (Contoh: ORD-20261017-A1B2C)"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 uppercase font-mono tracking-wider font-semibold"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !orderQuery.trim()}
              className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 disabled:bg-stone-300 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Mencari...</span>
              ) : (
                <>
                  <span>Lacak Pesanan</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3 animate-fade-in">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">Pesanan Tidak Ditemukan</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Order Result Card */}
        {orderData && (
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-4 sm:p-8 space-y-8 animate-fade-in">
            {/* Order Header Summary */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-stone-100">
              <div className="space-y-1 min-w-0">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Nomor Pesanan
                </span>
                <h2 className="text-lg min-[400px]:text-xl sm:text-2xl font-bold text-zinc-900 font-mono break-all">
                  {orderData.order_number}
                </h2>
                <p className="text-xs text-stone-500">
                  Dipesan pada {new Date(orderData.created_at).toLocaleString('id-ID', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              <div>
                {isCancelled ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    ✕ Dibatalkan (Stok Kembali)
                  </span>
                ) : orderData.status === 'COMPLETED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ✓ Pesanan Selesai
                  </span>
                ) : orderData.status === 'SHIPPED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    🚚 Sedang Dikirim Kurir
                  </span>
                ) : orderData.status === 'CONFIRMED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    📦 Lunas & Sedang Dikemas
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    ⏳ Menunggu Pembayaran WA
                  </span>
                )}
              </div>
            </div>

            {/* Stepper Timeline (if not cancelled) */}
            {!isCancelled ? (
              <div className="py-2">
                <div className="relative flex justify-between items-start">
                  {/* Progress Line */}
                  <div className="absolute top-4 left-6 right-6 h-0.5 bg-stone-200 z-0">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-500"
                      style={{
                        width:
                          currentStep === 1
                            ? '0%'
                            : currentStep === 2
                            ? '33%'
                            : currentStep === 3
                            ? '66%'
                            : '100%',
                      }}
                    />
                  </div>

                  {/* Step 1 */}
                  <div className="relative z-10 flex flex-col items-center text-center flex-1 min-w-0 sm:flex-none sm:w-24">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
                        currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {currentStep > 1 ? '✓' : '1'}
                    </div>
                    <p className="text-xs font-bold text-zinc-900 mt-2">Dipesan</p>
                    <p className="text-[10px] text-stone-400">Menunggu WA</p>
                  </div>

                  {/* Step 2 */}
                  <div className="relative z-10 flex flex-col items-center text-center flex-1 min-w-0 sm:flex-none sm:w-24">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
                        currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {currentStep > 2 ? '✓' : '2'}
                    </div>
                    <p className="text-xs font-bold text-zinc-900 mt-2">Dikemas</p>
                    <p className="text-[10px] text-stone-400">Lunas terverifikasi</p>
                  </div>

                  {/* Step 3 */}
                  <div className="relative z-10 flex flex-col items-center text-center flex-1 min-w-0 sm:flex-none sm:w-24">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
                        currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {currentStep > 3 ? '✓' : '3'}
                    </div>
                    <p className="text-xs font-bold text-zinc-900 mt-2">Dikirim</p>
                    <p className="text-[10px] text-stone-400">Kurir & No. Resi</p>
                  </div>

                  {/* Step 4 */}
                  <div className="relative z-10 flex flex-col items-center text-center flex-1 min-w-0 sm:flex-none sm:w-24">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
                        currentStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      ✓
                    </div>
                    <p className="text-xs font-bold text-zinc-900 mt-2">Selesai</p>
                    <p className="text-[10px] text-stone-400">Paket Diterima</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <p className="font-bold text-sm">Pesanan Ini Telah Dibatalkan</p>
                <p className="text-rose-700">
                  Seluruh unit stok pakaian dalam pesanan ini telah otomatis dikembalikan ke katalog toko secara realtime. Jika ada pertanyaan, hubungi layanan pelanggan kami melalui WhatsApp.
                </p>
              </div>
            )}

            {/* Tracking Number Banner (if shipped) */}
            {orderData.tracking_number && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚚</span>
                  <div>
                    <p className="text-xs text-purple-700 font-semibold uppercase tracking-wider">
                      Nomor Resi Pengiriman Kurir:
                    </p>
                    <p className="text-base font-bold text-purple-950 font-mono tracking-wider">
                      {orderData.tracking_number}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyResi(orderData.tracking_number!)}
                  className="px-3.5 py-1.5 bg-white border border-purple-300 text-purple-900 hover:bg-purple-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  {copiedResi ? <span>✓ Tersalin!</span> : <span>Salin No. Resi</span>}
                </button>
              </div>
            )}

            {/* Details Grid: Items & Shipping Destination */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
              {/* Left: Items list (md:col-span-7) */}
              <div className="md:col-span-7 space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-xs">
                  Rincian Pakaian ({orderData.items.length} item)
                </h3>
                <div className="divide-y divide-stone-100 border border-stone-200/80 rounded-xl p-4 bg-stone-50/40">
                  {orderData.items.map((item) => (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center gap-3 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-bold text-zinc-900 text-sm">{item.product_title}</p>
                        <p className="text-stone-500">
                          Warna: <span className="font-semibold text-zinc-800">{item.color}</span> · Ukuran: <span className="font-semibold text-zinc-800">{item.size}</span>
                        </p>
                        <p className="text-stone-400 text-[11px]">
                          {item.quantity} pcs x Rp {Number(item.unit_price).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <span className="font-bold text-zinc-900 text-sm shrink-0 whitespace-nowrap">
                        Rp {Number(item.subtotal).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-white border border-stone-200/80 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal Pakaian:</span>
                    <span className="font-semibold text-zinc-900">
                      Rp {Number(orderData.subtotal_items).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Daerah Pengiriman:</span>
                    <span className="font-semibold text-zinc-900">
                      {orderData.shipping_province}
                    </span>
                  </div>
                  <div className="divider my-1" />
                  <div className="flex justify-between text-base font-bold text-zinc-900">
                    <span>Total Tagihan:</span>
                    <span className="text-emerald-700">
                      Rp {Number(orderData.total_amount).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Shipping Address (md:col-span-5) */}
              <div className="md:col-span-5 space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-xs">
                  Tujuan Pengiriman
                </h3>
                <div className="border border-stone-200/80 rounded-xl p-4 bg-stone-50/40 text-xs space-y-2">
                  <div>
                    <p className="text-stone-400 text-[10px] uppercase font-bold">Nama Penerima</p>
                    <p className="font-bold text-zinc-900 text-sm">{orderData.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-stone-400 text-[10px] uppercase font-bold">Nomor WhatsApp</p>
                    <p className="font-semibold text-zinc-800">{orderData.customer_phone}</p>
                  </div>
                  <div>
                    <p className="text-stone-400 text-[10px] uppercase font-bold">Alamat Pengiriman</p>
                    <p className="text-zinc-700 leading-relaxed">{orderData.shipping_address}</p>
                    <p className="font-semibold text-zinc-900 pt-0.5">
                      {orderData.shipping_city}
                      {orderData.shipping_district ? `, Kec. ${orderData.shipping_district}` : ''}, {orderData.shipping_province}
                    </p>
                  </div>
                  {orderData.notes && (
                    <div className="pt-2 border-t border-stone-200">
                      <p className="text-stone-400 text-[10px] uppercase font-bold">Catatan Khusus</p>
                      <p className="text-stone-600 italic">&quot;{orderData.notes}&quot;</p>
                    </div>
                  )}
                </div>

                {/* Contact Help CTA */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2 text-xs">
                  <p className="font-bold text-emerald-900">Butuh Bantuan Pesanan Ini?</p>
                  <p className="text-emerald-800 text-[11px]">
                    Hubungi layanan pelanggan kami di WhatsApp untuk konfirmasi bukti bayar atau perubahan data pengiriman.
                  </p>
                  <a
                    href={waHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 w-full justify-center py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold rounded-lg shadow-sm transition-colors text-xs"
                  >
                    <span>💬</span>
                    <span>Hubungi Layanan Pelanggan (WhatsApp)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function LacakPesananPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-500">Memuat Lacak Pesanan...</div>}>
      <LacakPesananContent />
    </Suspense>
  );
}
