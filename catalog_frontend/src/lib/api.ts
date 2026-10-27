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
      next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
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
// WhatsApp link generator
// ─────────────────────────────────────────
export function generateWhatsAppLink(
  productTitle: string,
  selectedSize?: string,
  selectedColor?: string,
  phoneNumber?: string
): string {
  const rawNumber = phoneNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  const number = rawNumber.replace(/[^0-9]/g, '');

  const lines = [
    `Halo, saya tertarik dengan produk:`,
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
