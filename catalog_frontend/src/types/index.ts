// TypeScript types for the Catalog API responses

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface ProductImage {
  id: number;
  image_url: string;
  image_file?: string;
  color?: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
}

export interface SizeMeasurement {
  chest_width: number;
  body_length: number;
  shoulder_width: number;
  sleeve_length: number;
  waist_width: number;
  bb_recommendation: string;
}

export interface Variant {
  id: number;
  size: string;
  color: string;
  sku: string;
  stock_quantity: number;
  is_available: boolean;
  availability_label: 'Tersedia' | 'Sisa Sedikit' | 'Habis';
  measurements?: SizeMeasurement;
  measurements_display?: string;
}

export interface SizeAvailability {
  size: string;
  available: boolean;
}

export interface VariantsByColor {
  color: string;
  color_image?: string | null;
  sizes: Array<{
    id: number;
    size: string;
    sku: string;
    stock_quantity: number;
    is_available: boolean;
    availability_label: string;
    measurements?: SizeMeasurement;
    measurements_display?: string;
  }>;
}

export interface Product {
  id: number;
  title: string;
  slug: string;
  category: Category | null;
  base_price: string;
  formatted_price: string;
  primary_image: string | null;
  total_stock: number;
  stock_status: 'Tersedia' | 'Hampir Habis' | 'Habis';
  available_sizes: SizeAvailability[];
  is_active: boolean;
}

export interface SizeChartItem extends SizeMeasurement {
  size: string;
}

export interface ProductDetail extends Product {
  description: string;
  images: ProductImage[];
  variants: Variant[];
  variants_by_color: VariantsByColor[];
  size_guide?: string;
  size_chart?: SizeChartItem[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface FilterParams {
  category?: string;
  min_price?: number | string;
  max_price?: number | string;
  has_size?: string;
  search?: string;
  ordering?: string;
  page?: number | string;
}


export interface ShippingRate {
  id: number;
  province: string;
  cost: string;
  formatted_cost: string;
  estimated_delivery: string;
  sort_order: number;
}

export interface CartItem {
  variantId: number;
  productId: number;
  productTitle: string;
  slug: string;
  color: string;
  size: string;
  price: number;
  imageUrl: string;
  quantity: number;
  maxStock: number;
}

export interface CheckoutPayload {
  customer_name: string;
  customer_phone: string;
  shipping_province: string;
  shipping_city: string;
  shipping_district?: string;
  shipping_address: string;
  notes?: string;
  items: Array<{
    variant_id: number;
    quantity: number;
  }>;
}

export interface CheckoutResponse {
  success: boolean;
  order_number: string;
  total_amount: number;
  subtotal_items: number;
  shipping_cost: number;
  shipping_province?: string;
  whatsapp_url: string;
  whatsapp_message: string;
  error?: string;
}
