'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useCart } from '@/context/CartContext';
import { getShippingRates, submitCheckout } from '@/lib/api';
import type { ShippingRate, CheckoutResponse } from '@/types';

const DEFAULT_SHIPPING_RATES: ShippingRate[] = [
  { id: 1, province: 'DKI Jakarta', cost: '10000', formatted_cost: 'Rp 10.000', estimated_delivery: '1-2 Hari', sort_order: 1 },
  { id: 2, province: 'Jawa Barat', cost: '10000', formatted_cost: 'Rp 10.000', estimated_delivery: '1-2 Hari', sort_order: 2 },
  { id: 3, province: 'Banten', cost: '10000', formatted_cost: 'Rp 10.000', estimated_delivery: '1-2 Hari', sort_order: 3 },
  { id: 4, province: 'Jawa Tengah', cost: '15000', formatted_cost: 'Rp 15.000', estimated_delivery: '2-3 Hari', sort_order: 4 },
  { id: 5, province: 'D.I. Yogyakarta', cost: '15000', formatted_cost: 'Rp 15.000', estimated_delivery: '2-3 Hari', sort_order: 5 },
  { id: 6, province: 'Jawa Timur', cost: '15000', formatted_cost: 'Rp 15.000', estimated_delivery: '2-3 Hari', sort_order: 6 },
  { id: 7, province: 'Bali', cost: '20000', formatted_cost: 'Rp 20.000', estimated_delivery: '2-3 Hari', sort_order: 7 },
  { id: 8, province: 'Nusa Tenggara Barat (NTB)', cost: '25000', formatted_cost: 'Rp 25.000', estimated_delivery: '3-4 Hari', sort_order: 8 },
  { id: 9, province: 'Nusa Tenggara Timur (NTT)', cost: '30000', formatted_cost: 'Rp 30.000', estimated_delivery: '3-5 Hari', sort_order: 9 },
  { id: 10, province: 'Lampung', cost: '20000', formatted_cost: 'Rp 20.000', estimated_delivery: '2-3 Hari', sort_order: 10 },
  { id: 11, province: 'Sumatera Selatan', cost: '22000', formatted_cost: 'Rp 22.000', estimated_delivery: '2-3 Hari', sort_order: 11 },
  { id: 12, province: 'Sumatera Barat', cost: '25000', formatted_cost: 'Rp 25.000', estimated_delivery: '3-4 Hari', sort_order: 12 },
  { id: 13, province: 'Riau & Kep. Riau', cost: '25000', formatted_cost: 'Rp 25.000', estimated_delivery: '3-4 Hari', sort_order: 13 },
  { id: 14, province: 'Jambi & Bengkulu', cost: '25000', formatted_cost: 'Rp 25.000', estimated_delivery: '2-3 Hari', sort_order: 14 },
  { id: 15, province: 'Sumatera Utara', cost: '28000', formatted_cost: 'Rp 28.000', estimated_delivery: '3-4 Hari', sort_order: 15 },
  { id: 16, province: 'Aceh', cost: '32000', formatted_cost: 'Rp 32.000', estimated_delivery: '3-5 Hari', sort_order: 16 },
  { id: 17, province: 'Kalimantan Barat & Selatan', cost: '30000', formatted_cost: 'Rp 30.000', estimated_delivery: '3-4 Hari', sort_order: 17 },
  { id: 18, province: 'Kalimantan Tengah & Timur', cost: '32000', formatted_cost: 'Rp 32.000', estimated_delivery: '3-5 Hari', sort_order: 18 },
  { id: 19, province: 'Kalimantan Utara', cost: '38000', formatted_cost: 'Rp 38.000', estimated_delivery: '4-6 Hari', sort_order: 19 },
  { id: 20, province: 'Sulawesi Selatan', cost: '28000', formatted_cost: 'Rp 28.000', estimated_delivery: '3-4 Hari', sort_order: 20 },
  { id: 21, province: 'Sulawesi Lainnya', cost: '35000', formatted_cost: 'Rp 35.000', estimated_delivery: '3-5 Hari', sort_order: 21 },
  { id: 22, province: 'Maluku & Papua', cost: '50000', formatted_cost: 'Rp 50.000', estimated_delivery: '4-7 Hari', sort_order: 22 },
];

export default function KeranjangPage() {
  const { items, removeFromCart, updateQuantity, clearCart, totalItems, subtotal } = useCart();

  const [shippingRates, setShippingRates] = useState<ShippingRate[]>(DEFAULT_SHIPPING_RATES);
  const [selectedProvince, setSelectedProvince] = useState<string>('DKI Jakarta');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [shippingCity, setShippingCity] = useState<string>('');
  const [shippingDistrict, setShippingDistrict] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<CheckoutResponse | null>(null);

  // Load active shipping rates from server and update list
  useEffect(() => {
    async function loadRates() {
      setIsLoadingRates(true);
      try {
        const rates = await getShippingRates();
        if (rates && rates.length > 0) {
          setShippingRates(rates);
          setSelectedProvince((prev) => {
            const match = rates.some((r) => r.province === prev);
            return match ? prev : rates[0].province;
          });
        }
      } catch (err) {
        console.error('Failed to load shipping rates:', err);
      } finally {
        setIsLoadingRates(false);
      }
    }
    loadRates();
  }, []);


  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (items.length === 0) {
      setErrorMsg('Keranjang belanja Anda masih kosong.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('Silakan isi Nama Lengkap penerima.');
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMsg('Silakan isi Nomor WhatsApp penerima.');
      return;
    }

    if (!selectedProvince) {
      setErrorMsg('Silakan pilih Provinsi tujuan.');
      return;
    }

    if (!shippingCity.trim()) {
      setErrorMsg('Silakan isi Kota / Kabupaten tujuan.');
      return;
    }

    if (!shippingAddress.trim()) {
      setErrorMsg('Silakan isi Alamat Lengkap pengiriman.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        shipping_province: selectedProvince,
        shipping_city: shippingCity.trim(),
        shipping_district: shippingDistrict.trim() || undefined,
        shipping_address: shippingAddress.trim(),
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          variant_id: i.variantId,
          quantity: i.quantity,
        })),
      };

      const res = await submitCheckout(payload);
      setOrderSuccess(res);
      clearCart();

      // Open WhatsApp in new tab/window
      if (res.whatsapp_url) {
        window.open(res.whatsapp_url, '_blank');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses pesanan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navbar />

      <main className="flex-1 max-w-screen-xl mx-auto px-4 md:px-10 pt-24 pb-20 w-full">
        {/* Header Breadcrumb */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-1">
              Checkout Pesanan
            </p>
            <h1 className="text-2xl md:text-3xl font-medium text-zinc-900 tracking-tight">
              Keranjang & Pengiriman
            </h1>
          </div>
          <Link
            href="/"
            className="shrink-0 whitespace-nowrap text-xs font-medium text-stone-600 hover:text-zinc-900 flex items-center gap-1.5 transition-colors"
          >
            <span>←</span>
            <span>Lanjut Belanja</span>
          </Link>
        </div>

        {/* ─────────────────────────────────────────
            SUCCESS SCREEN MODAL / VIEW
            ───────────────────────────────────────── */}
        {orderSuccess ? (
          <div className="max-w-xl mx-auto bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-8 shadow-sm text-center space-y-6 animate-scale-in my-4 sm:my-8">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
                Pesanan Berhasil Dicatat!
              </span>
              <h2 className="text-xl font-semibold text-zinc-900">
                {orderSuccess.order_number}
              </h2>
              <p className="text-sm text-stone-600 max-w-md mx-auto">
                Stok baju telah otomatis dikunci untuk Anda. Rincian pesanan telah diteruskan ke WhatsApp toko kami untuk verifikasi pembayaran.
              </p>
            </div>

            <div className="bg-stone-50 rounded-xl p-4 text-left text-xs space-y-2 border border-stone-200/60">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal Pakaian:</span>
                <span className="font-semibold text-zinc-900">
                  Rp {Number(orderSuccess.subtotal_items || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Daerah Tujuan:</span>
                <span className="font-semibold text-zinc-900">
                  {orderSuccess.shipping_province || selectedProvince}
                </span>
              </div>
              <div className="divider my-2" />
              <div className="flex justify-between text-sm font-bold text-zinc-900">
                <span>Total Pakaian:</span>
                <span className="text-emerald-700">
                  Rp {Number(orderSuccess.subtotal_items || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href={orderSuccess.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold rounded-xl text-sm shadow-sm transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>Buka WhatsApp Sekarang</span>
              </a>

              <Link
                href={`/lacak-pesanan?order=${orderSuccess.order_number}`}
                className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl text-xs transition-colors"
              >
                <span>📍 Lacak Status Pesanan Ini Online (Realtime)</span>
                <span>→</span>
              </Link>

              <Link
                href="/"
                className="block text-center text-xs text-stone-500 hover:text-zinc-900 py-1 transition-colors"
              >
                Kembali ke Halaman Utama
              </Link>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────
              MAIN CHECKOUT GRID
              ───────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ─────────────────────────────────────────
                LEFT: Cart Items (lg:col-span-7)
                ───────────────────────────────────────── */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                    <span>🛍️</span>
                    <span>Daftar Pakaian ({totalItems} pcs)</span>
                  </h2>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors"
                    >
                      Kosongkan Keranjang
                    </button>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-2xl text-stone-400">
                      🛒
                    </div>
                    <p className="text-sm text-stone-500">
                      Keranjang belanja Anda masih kosong.
                    </p>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors"
                    >
                      Pilih Koleksi Pakaian →
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {items.map((item) => (
                      <div key={item.variantId} className="py-4 flex flex-wrap sm:flex-nowrap gap-x-3 sm:gap-x-4 gap-y-3 items-center">
                        {/* Thumbnail */}
                        <div
                          className="relative w-16 h-20 bg-stone-100 rounded-lg overflow-hidden shrink-0 border border-stone-200"
                        >
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.productTitle}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">
                              Foto
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <Link
                            href={`/produk/${item.slug}`}
                            className="text-sm font-semibold text-zinc-900 hover:underline truncate block"
                          >
                            {item.productTitle}
                          </Link>

                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span className="bg-stone-100 px-2 py-0.5 rounded text-zinc-700 font-medium">
                              {item.color}
                            </span>
                            <span className="bg-stone-100 px-2 py-0.5 rounded text-zinc-700 font-medium">
                              Size {item.size}
                            </span>
                          </div>

                          <p className="text-xs font-medium text-zinc-900 pt-0.5">
                            Rp {item.price.toLocaleString('id-ID')} / pcs
                          </p>
                        </div>

                        {/* Quantity Controller */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0">
                          <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50/50 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                              className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200 text-xs transition-colors"
                              aria-label="Kurangi"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-xs font-semibold text-zinc-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                              disabled={item.quantity >= item.maxStock}
                              className={`w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-xs transition-colors ${
                                item.quantity >= item.maxStock
                                  ? 'text-stone-300 cursor-not-allowed'
                                  : 'text-stone-600 hover:bg-stone-200'
                              }`}
                              aria-label="Tambah"
                            >
                              +
                            </button>
                          </div>

                          {/* Line total */}
                          <span className="text-xs font-bold text-zinc-900">
                            Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.variantId)}
                            className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ─────────────────────────────────────────
                RIGHT: Shipping Form & WhatsApp Checkout (lg:col-span-5)
                ───────────────────────────────────────── */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain scrollbar-hide">
              <form
                onSubmit={handleSubmitCheckout}
                className="bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4"
              >
                <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2 pb-2 border-b border-stone-100">
                  <span>📍</span>
                  <span>Data Pengiriman & Pemesan</span>
                </h2>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium animate-fade-in">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  {/* Nama */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Nama Penerima <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Budi Santoso"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
                    />
                  </div>

                  {/* No WhatsApp */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Nomor WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
                    />
                  </div>

                  {/* Provinsi Tujuan */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Provinsi Tujuan <span className="text-rose-500">*</span>
                    </label>

                    <select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs bg-white text-zinc-900 font-medium cursor-pointer"
                    >
                      {shippingRates.map((r) => (
                        <option key={r.id || r.province} value={r.province}>
                          {r.province}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kota & Kecamatan */}
                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">
                        Kota / Kabupaten <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Surabaya"
                        value={shippingCity}
                        onChange={(e) => setShippingCity(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">
                        Kecamatan (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Gubeng"
                        value={shippingDistrict}
                        onChange={(e) => setShippingDistrict(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
                      />
                    </div>
                  </div>

                  {/* Alamat Lengkap */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Alamat Lengkap & Patokan <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Nama jalan, nomor rumah, RT/RW, atau patokan lokasi"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs resize-none"
                    />
                  </div>

                  {/* Catatan */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Catatan Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Tolong bungkus rapi untuk kado"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
                    />
                  </div>
                </div>

                {/* Ringkasan Belanja */}
                <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal Pakaian:</span>
                    <span className="font-semibold text-zinc-900">
                      Rp {subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex justify-between text-stone-600">
                    <span>Daerah Tujuan:</span>
                    <span className="font-semibold text-zinc-900">
                      {selectedProvince || 'Belum dipilih'}
                    </span>
                  </div>

                  <div className="divider my-1" />

                  <div className="flex justify-between text-base font-bold text-zinc-900 pt-1">
                    <span>Total Belanja:</span>
                    <span className="text-emerald-700">
                      Rp {subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Submit Checkout Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className={`w-full py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 text-white transition-all shadow-sm ${
                    isSubmitting || items.length === 0
                      ? 'bg-stone-300 cursor-not-allowed'
                      : 'bg-[#25D366] hover:bg-[#1EBE5D] hover:shadow-lg active:scale-98'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Memproses Pesanan...</span>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      <span>Lanjutkan Pesanan via WhatsApp 🟢</span>
                    </>
                  )}
                </button>

                <div className="space-y-1 text-center">
                  <p className="text-[11px] text-stone-400">
                    🔒 Stok otomatis dikunci & rincian pesanan langsung terhubung ke WhatsApp toko.
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
