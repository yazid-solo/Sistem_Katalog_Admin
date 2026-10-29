// API client for the Django backend

import type {
  Category,
  FilterParams,
  PaginatedResponse,
  Product,
  ProductDetail,
  ShippingRate,
  CheckoutPayload,
  CheckoutResponse,
} from '@/types';

const API_BASE = typeof window === 'undefined'
  ? (process.env.INTERNAL_API_URL || 'http://backend:8000')
  : '';

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      cache: 'no-store', // Realtime sync with database & Admin Toko changes
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`API Error ${res.status}: ${url}`);
      if (path.includes('shipping-rates') || path.includes('categories')) {
        return [] as unknown as T;
      }
      if (path.startsWith('/api/products/') && path !== '/api/products/' && !path.includes('?')) {
        throw new Error(`Item not found: ${path}`);
      }
      return { count: 0, next: null, previous: null, results: [] } as unknown as T;
    }

    return res.json();
  } catch (err) {
    console.error(`Fetch failed for ${url}:`, err);
    if (path.includes('shipping-rates') || path.includes('categories')) {
      return [] as unknown as T;
    }
    if (path.startsWith('/api/products/') && path !== '/api/products/' && !path.includes('?')) {
      throw err;
    }
    return { count: 0, next: null, previous: null, results: [] } as unknown as T;
  }
}

// ─────────────────────────────────────────
// Products
// ─────────────────────────────────────────
export async function getProducts(params: FilterParams = {}): Promise<PaginatedResponse<Product>> {
  const searchParams = new URLSearchParams();

  if (params.category) searchParams.set('category', params.category);
  if (params.min_price) searchParams.set('min_price', String(params.min_price));
  if (params.max_price) searchParams.set('max_price', String(params.max_price));
  if (params.has_size) searchParams.set('has_size', params.has_size);
  if (params.search) searchParams.set('search', params.search);
  if (params.ordering) searchParams.set('ordering', params.ordering);
  if (params.page) searchParams.set('page', String(params.page));

  const queryString = searchParams.toString();
  const path = `/api/products/${queryString ? `?${queryString}` : ''}`;

  return apiFetch<PaginatedResponse<Product>>(path);
}

export async function getProductDetail(slug: string): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(`/api/products/${slug}/`);
}

// ─────────────────────────────────────────
// Categories
// ─────────────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories/');
}

// ─────────────────────────────────────────
// WhatsApp Multi-Admin Management & Round-Robin Rotation
// ─────────────────────────────────────────

export interface AdminContact {
  id: string;
  name: string;
  number: string;
  formatted: string;
}

/**
 * Format string nomor hp ke tampilan rapi (misal: 0813-9079-6231)
 */
export function formatPhoneNumber(num: string): string {
  let clean = num.replace(/[^0-9]/g, '');
  if (clean.startsWith('62')) {
    clean = '0' + clean.slice(2);
  }
  if (clean.length >= 10) {
    return clean.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  }
  return clean;
}

/**
 * Daftar kontak admin WhatsApp yang terdaftar di sistem.
 * Mendukung Admin 1 (+62 813-9079-6231) dan Admin 2 (+62 838-3578-2010).
 */
export function getAdminWhatsAppNumbers(): AdminContact[] {
  const contacts: AdminContact[] = [];

  const raw1 = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER_1 || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '6281390796231';
  const raw2 = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER_2 || '6283835782010';

  const clean1 = raw1.replace(/[^0-9]/g, '');
  if (clean1) {
    contacts.push({
      id: 'admin-1',
      name: 'Admin 1',
      number: clean1,
      formatted: formatPhoneNumber(clean1),
    });
  }

  const clean2 = raw2.replace(/[^0-9]/g, '');
  if (clean2) {
    contacts.push({
      id: 'admin-2',
      name: 'Admin 2',
      number: clean2,
      formatted: formatPhoneNumber(clean2),
    });
  }

  return contacts;
}

let clientRotationCounter = 0;

/**
 * Rotasi Otomatis (Round-Robin / Load Balancing 50:50).
 * Menghasilkan kontak admin secara bergantian antara Admin 1 dan Admin 2
 * agar beban chat dan pesanan terbagi rata secara adil.
 */
export function getRotatedAdminWhatsAppNumber(): AdminContact {
  const list = getAdminWhatsAppNumbers();
  if (list.length === 0) {
    return { id: 'admin-1', name: 'Admin', number: '', formatted: '' };
  }
  if (list.length === 1) {
    return list[0];
  }

  // Gunakan sessionStorage untuk rotasi berurutan yang konsisten di browser
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = sessionStorage.getItem('wa_admin_rotation_idx');
      const currentIdx = stored !== null ? parseInt(stored, 10) : Math.floor(Math.random() * list.length);
      const nextIdx = (currentIdx + 1) % list.length;
      sessionStorage.setItem('wa_admin_rotation_idx', nextIdx.toString());
      return list[currentIdx % list.length];
    }
  } catch {
    // fallback jika storage diblokir
  }

  clientRotationCounter = (clientRotationCounter + 1) % list.length;
  return list[clientRotationCounter];
}

/**
 * Link WhatsApp untuk Tanya Jawab / Konsultasi Produk (Detail Produk).
 * Menggunakan admin yang dirotasi secara otomatis.
 */
export function generateWhatsAppLink(
  productTitle: string,
  selectedSize?: string,
  selectedColor?: string,
  phoneNumber?: string
): string {
  const chosenAdmin = phoneNumber ? { name: 'Admin', number: phoneNumber.replace(/[^0-9]/g, '') } : getRotatedAdminWhatsAppNumber();
  const number = chosenAdmin.number;

  const lines = [
    `Halo ${chosenAdmin.name || 'Admin'}, saya tertarik dengan produk:`,
    `*${productTitle}*`,
    selectedColor ? `Warna: ${selectedColor}` : '',
    selectedSize ? `Ukuran: ${selectedSize}` : '',
    ``,
    `Apakah masih tersedia? Terima kasih 🙏`,
  ]
    .filter(Boolean)
    .join('\n');

  const encodedMessage = encodeURIComponent(lines);
  return `https://wa.me/${number}?text=${encodedMessage}`;
}

/**
 * Link WhatsApp untuk Konsultasi Ukuran & Stok Umum (Halaman Beranda).
 */
export function getConsultationWhatsAppLink(topic?: string, phoneNumber?: string): string {
  const chosenAdmin = phoneNumber ? { name: 'Admin', number: phoneNumber.replace(/[^0-9]/g, '') } : getRotatedAdminWhatsAppNumber();
  const message = topic || `Halo ${chosenAdmin.name || 'Admin'}, saya ingin konsultasi mengenai ukuran dan stok pakaian.`;
  return `https://wa.me/${chosenAdmin.number}?text=${encodeURIComponent(message)}`;
}

/**
 * Link WhatsApp untuk Bantuan Lacak Pesanan (Halaman Lacak Pesanan).
 */
export function getTrackingHelpWhatsAppLink(orderNumber?: string, customerName?: string, phoneNumber?: string): string {
  const chosenAdmin = phoneNumber ? { name: 'Admin', number: phoneNumber.replace(/[^0-9]/g, '') } : getRotatedAdminWhatsAppNumber();
  const message = orderNumber
    ? `Halo ${chosenAdmin.name || 'Admin'}, saya ingin menanyakan status pesanan saya dengan nomor *${orderNumber}* atas nama *${customerName || ''}*. Terima kasih.`
    : `Halo ${chosenAdmin.name || 'Admin'}, saya butuh bantuan untuk mengecek status pesanan saya. Terima kasih.`;
  return `https://wa.me/${chosenAdmin.number}?text=${encodeURIComponent(message)}`;
}

// ─────────────────────────────────────────
// Shipping Rates & Checkout
// ─────────────────────────────────────────
export async function getShippingRates(): Promise<ShippingRate[]> {
  return apiFetch<ShippingRate[]>('/api/shipping-rates/');
}

export async function submitCheckout(payload: CheckoutPayload): Promise<CheckoutResponse> {
  const url = `${API_BASE}/api/orders/checkout/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.error || (data.items ? Object.values(data.items).join(', ') : 'Gagal memproses pesanan.');
    throw new Error(errorMsg);
  }
  return data;
}
