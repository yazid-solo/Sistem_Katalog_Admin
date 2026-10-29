'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@/types';
import {
  IconInbox,
  IconTag,
  IconAlertTriangle,
  IconAlertCircle,
  IconPlus,
  IconTruck,
  IconClock,
  IconTrendingUp,
  IconLayers,
  IconCamera,
  IconPrinter,
  IconCopy,
  IconCheck,
  IconWhatsApp,
  IconPencil,
  IconDownload,
  IconSearch,
  IconCalendar,
  IconMapPin,
  IconLock,
  IconRefresh,
  IconSave,
  IconX,
  IconExternalLink,
  IconPhoto,
  IconPackage,
  IconShield,
  IconMessageSquare,
  IconTrash,
  IconSparkles,
  IconEye,
  IconEyeOff,
  IconPalette,
} from '@/components/AdminIcons';

interface OrderItemData {
  id: number;
  product_title: string;
  color: string;
  size: string;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
}

interface OrderData {
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
  assigned_admin?: string;
  tracking_number?: string;
  shipping_courier?: string;
  tracking_receipt_url?: string | null;
  notes?: string;
  created_at: string;
  items: OrderItemData[];
}

interface StatsData {
  total_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  shipped_orders: number;
  completed_orders?: number;
  expired_pending_orders?: number;
  pending_revenue?: number;
  today_revenue?: number;
  today_orders?: number;
  total_revenue: number;
  total_products: number;
  out_of_stock: number;
  low_stock: number;
}

interface ShippingRateData {
  id: number;
  province: string;
  cost: string;
  estimated_delivery: string;
  is_active: boolean;
}

interface ProductVariantData {
  id: number;
  size: string;
  color: string;
  stock_quantity: number;
  is_available: boolean;
}

interface ProductImageItem {
  id: number;
  image_url: string;
  color: string;
  is_primary: boolean;
  sort_order?: number;
}

interface VariantByColorItem {
  color: string;
  color_image: string | null;
  image_id: number | null;
  is_primary?: boolean;
  sizes: {
    id: number;
    size: string;
    stock_quantity: number;
    is_available: boolean;
  }[];
}

interface ProductAdminItem {
  id: number;
  title: string;
  slug: string;
  description?: string;
  size_guide?: string;
  formatted_price: string;
  base_price: string;
  primary_image: string | null;
  total_stock: number;
  stock_status: string;
  category: { id?: number; name: string } | null;
  is_active: boolean;
  variants: ProductVariantData[];
  images?: ProductImageItem[];
  variants_by_color?: VariantByColorItem[];
  created_at?: string;
  updated_at?: string;
}

interface LowStockAlertItem {
  variant_id: number;
  product_id: number;
  product_title: string;
  product_slug: string;
  primary_image?: string | null;
  category_name?: string;
  size: string;
  color: string;
  stock_quantity: number;
  status: 'Habis' | 'Menipis';
}

interface ColorVariationInput {
  id: string;
  color: string;
  imageFile: File | null;
  imagePreviewUrl: string;
  imageUrl: string;
  sizes: { [size: string]: number };
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const COURIER_OPTIONS = [
  'JNE',
  'J&T Express',
  'SiCepat',
  'Shopee Express (SPX)',
  'Pos Indonesia',
  'AnterAja',
  'Lion Parcel',
  'ID Express',
  'Ninja Xpress',
];

const COURIER_SHORT_LABEL: { [name: string]: string } = {
  'Shopee Express (SPX)': 'SPX',
};

// Auto-detect Indonesian courier from tracking number format and/or raw receipt text
const detectCourierClient = (resi: string, rawText?: string): string => {
  const text = (rawText || '').toUpperCase();
  const r = (resi || '').trim().toUpperCase();
  if (/J&T|J\s?&\s?T|JNT/.test(text)) return 'J&T Express';
  if (/SHOPEE\s*EXPRESS|SPX/.test(text)) return 'Shopee Express (SPX)';
  if (/SICEPAT/.test(text)) return 'SiCepat';
  if (/ANTERAJA|ANTER\s*AJA/.test(text)) return 'AnterAja';
  if (/LION\s*PARCEL/.test(text)) return 'Lion Parcel';
  if (/NINJA/.test(text)) return 'Ninja Xpress';
  if (/ID\s*EXPRESS|IDEXPRESS/.test(text)) return 'ID Express';
  if (/POS\s*INDONESIA/.test(text)) return 'Pos Indonesia';
  if (/\bJNE\b/.test(text)) return 'JNE';
  if (!r) return '';
  if (/^J[PDXTB]\d{9,12}$/.test(r)) return 'J&T Express';
  if (r.startsWith('SPX')) return 'Shopee Express (SPX)';
  if (/^1000\d{8,}$/.test(r)) return 'AnterAja';
  if (/^00\d{10,13}$/.test(r)) return 'SiCepat';
  if (/^(11LP|LP)/.test(r)) return 'Lion Parcel';
  if (/^(NLIDAP|NVID)/.test(r)) return 'Ninja Xpress';
  if (/^(IDE|IDS)/.test(r)) return 'ID Express';
  if (/^(SOC|CGK|BDG|SUB|TGR|JOG|DPS|MKS|MDN|SMG|SLO|MLG|BKI|DPK|BGR|PLM|PKU|BPN|BJM)/.test(r)) return 'JNE';
  if (/^\d{16}$/.test(r)) return 'JNE';
  if (/^\d{13}$/.test(r)) return 'Pos Indonesia';
  return '';
};

export default function AdminTokoPage() {
  // Authentication & Security State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sellerToken, setSellerToken] = useState<string>('');
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab: pesanan | stok | alerts | tambah | ongkir
  const [activeTab, setActiveTab] = useState<'pesanan' | 'stok' | 'alerts' | 'tambah' | 'ongkir'>('pesanan');

  // WhatsApp Quick Reply Modal
  const [activeQuickReplyOrder, setActiveQuickReplyOrder] = useState<OrderData | null>(null);
  const [storeBankAccounts, setStoreBankAccounts] = useState<string>(
    'BCA 123-456-7890 a/n Toko DLRS\nMandiri 987-654-3210 a/n Toko DLRS'
  );
  const [isEditingBanks, setIsEditingBanks] = useState<boolean>(false);
  const [copiedTemplateIdx, setCopiedTemplateIdx] = useState<number | null>(null);

  // Stats
  const [stats, setStats] = useState<StatsData | null>(null);

  // Low Stock Alerts
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertItem[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false);
  const [alertRestockAmounts, setAlertRestockAmounts] = useState<{ [key: string]: number }>({});
  const [alertRestockingKey, setAlertRestockingKey] = useState<string | null>(null);
  const [alertStatusFilter, setAlertStatusFilter] = useState<'ALL' | 'Menipis' | 'Habis'>('ALL');
  const [alertSearch, setAlertSearch] = useState<string>('');

  // Orders
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [editingResi, setEditingResi] = useState<{ [orderNum: string]: string }>({});
  const [editingCourier, setEditingCourier] = useState<{ [orderNum: string]: string }>({});
  const [orderDateFilter, setOrderDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | 'MONTH'>('ALL');
  const [isCancellingExpired, setIsCancellingExpired] = useState<boolean>(false);
  const [editingShippedResiOrder, setEditingShippedResiOrder] = useState<string | null>(null);
  const [copiedOrderNum, setCopiedOrderNum] = useState<string | null>(null);

  // Products & Stock
  const [products, setProducts] = useState<ProductAdminItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [editingStock, setEditingStock] = useState<{ [variantId: number]: number }>({});
  const [stockUpdatingId, setStockUpdatingId] = useState<number | null>(null);
  const [isSavingBatchStock, setIsSavingBatchStock] = useState<boolean>(false);
  const [expandedStockProducts, setExpandedStockProducts] = useState<{ [productId: number]: boolean }>({});
  const [hideZeroStockSizes, setHideZeroStockSizes] = useState<boolean>(false);

  // Product Filter, Search & Sorting
  const [productSearch, setProductSearch] = useState<string>('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('ALL');
  const [productStockFilter, setProductStockFilter] = useState<string>('ALL');
  const [productSort, setProductSort] = useState<string>('newest');

  // Bulk Actions
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isPerformingBulkAction, setIsPerformingBulkAction] = useState<boolean>(false);
  const [bulkActionMsg, setBulkActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Realtime live sync & order feedback
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [orderFeedback, setOrderFeedback] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [scanningResiOrder, setScanningResiOrder] = useState<string | null>(null);
  const [resiScanStatus, setResiScanStatus] = useState<{
    [orderNum: string]: { type: 'scanning' | 'success' | 'manual'; text: string };
  }>({});
  const [autoMarkShippedOnScan, setAutoMarkShippedOnScan] = useState<boolean>(true);

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<ProductAdminItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editSizeGuide, setEditSizeGuide] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSavingEditProduct, setIsSavingEditProduct] = useState<boolean>(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  // Color Photo Modal for Existing Products
  const [activeColorModalProduct, setActiveColorModalProduct] = useState<ProductAdminItem | null>(null);
  const [colorModalUploadingColor, setColorModalUploadingColor] = useState<string | null>(null);
  const [colorModalFile, setColorModalFile] = useState<{ [color: string]: File | null }>({});
  const [colorModalPreview, setColorModalPreview] = useState<{ [color: string]: string }>({});
  const [colorModalUrl, setColorModalUrl] = useState<{ [color: string]: string }>({});
  const [colorModalSuccess, setColorModalSuccess] = useState<string | null>(null);
  const [colorModalError, setColorModalError] = useState<string | null>(null);
  const [newCustomColorName, setNewCustomColorName] = useState<string>('');
  const [newCustomColorFile, setNewCustomColorFile] = useState<File | null>(null);
  const [newCustomColorPreview, setNewCustomColorPreview] = useState<string>('');
  const [newCustomColorSizes, setNewCustomColorSizes] = useState<{ [size: string]: number }>({
    'ALL SIZE': 10,
    STANDAR: 10,
    JUMBO: 8,
    S: 5,
    M: 10,
    L: 10,
    XL: 5,
    XXL: 5,
  });
  const [isAddingNewColorPhoto, setIsAddingNewColorPhoto] = useState(false);

  // Shipping Rates
  const [shippingRates, setShippingRates] = useState<ShippingRateData[]>([]);
  const [editingRates, setEditingRates] = useState<{ [id: number]: string }>({});
  const [shippingSearch, setShippingSearch] = useState<string>('');
  const [isSavingAllRates, setIsSavingAllRates] = useState<boolean>(false);

  // New Product Form with Multi-Color Variations
  const [categories, setCategories] = useState<Category[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSizeGuide, setNewSizeGuide] = useState('');
  const [colorVariations, setColorVariations] = useState<ColorVariationInput[]>([
    {
      id: 'color-1',
      color: 'Hitam',
      imageFile: null,
      imagePreviewUrl: '',
      imageUrl: '',
      sizes: { 'ALL SIZE': 10, STANDAR: 10, JUMBO: 8, S: 5, M: 10, L: 10, XL: 5, XXL: 5 },
    },
    {
      id: 'color-2',
      color: 'Krem Susu',
      imageFile: null,
      imagePreviewUrl: '',
      imageUrl: '',
      sizes: { 'ALL SIZE': 10, STANDAR: 10, JUMBO: 8, S: 5, M: 10, L: 10, XL: 5, XXL: 5 },
    },
  ]);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);
  const [createErrorMsg, setCreateErrorMsg] = useState<string | null>(null);

  // Cek sesi saat halaman dibuka:
  // Jika sama sekali selama 24 jam off / tidak aktif -> Wajibkan login kembali!
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('seller_token');
      const lastActiveStr = localStorage.getItem('seller_last_active');
      const now = Date.now();

      if (storedToken && lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        const idleTime = now - lastActive;

        // Jika off selama 24 jam (atau lebih)
        if (idleTime >= TWENTY_FOUR_HOURS_MS || isNaN(lastActive)) {
          // Sesi 24 jam kedaluwarsa -> bersihkan dan wajibkan login kembali
          localStorage.removeItem('seller_token');
          localStorage.removeItem('seller_last_active');
          try { sessionStorage.removeItem('seller_token'); } catch (e) {}
          setSellerToken('');
          setIsAuthenticated(false);
          setLoginError('Sesi Anda telah kedaluwarsa (off lebih dari 24 jam). Silakan masukkan kata sandi kembali.');
        } else {
          // Masih dalam 24 jam aktif -> perbarui waktu aktif dan izinkan akses
          localStorage.setItem('seller_last_active', String(now));
          try { sessionStorage.setItem('seller_token', storedToken); } catch (e) {}
          setSellerToken(storedToken);
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
        setSellerToken('');
      }
      setIsCheckingAuth(false);
      try {
        const savedBanks = localStorage.getItem('dlrs_store_banks');
        if (savedBanks) setStoreBankAccounts(savedBanks);
      } catch {}
    }
  }, []);

  // Fetch initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
      syncAllData(false);
    }
  }, [isAuthenticated]);

  // Silent background sync for incoming orders & stats every 60s (never unmounts UI or resets inputs)
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchStats();
      fetchOrders(true);
      fetchLowStockAlerts(true);
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, orderStatusFilter, orderSearch]);

  // Secure Authenticated Fetch Wrapper for Admin / Seller Center
  const sellerFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const token = sellerToken || (typeof window !== 'undefined' ? localStorage.getItem('seller_token') || '' : '');
    let headers: Record<string, string> = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((val, key) => { headers[key] = val; });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, val]) => { headers[key] = val; });
      } else {
        headers = { ...(init.headers as Record<string, string>) };
      }
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401 || res.status === 403) {
      setSellerToken('');
      setIsAuthenticated(false);
      try {
        localStorage.removeItem('seller_token');
        localStorage.removeItem('seller_last_active');
        sessionStorage.removeItem('seller_token');
      } catch (e) {}
      setLoginError('Sesi login Anda telah berakhir setelah 24 jam. Silakan masukkan kata sandi kembali.');
    } else if (res.ok) {
      // Perbarui cap waktu aktivitas terbaru agar terhitung aktif
      try {
        localStorage.setItem('seller_last_active', String(Date.now()));
      } catch (e) {}
    }
    return res;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    try {
      const res = await fetch('/api/seller/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Kata sandi atau PIN admin salah.');
      }
      const now = Date.now();
      // Simpan token dan cap waktu aktivitas aktif 24 jam
      setSellerToken(data.token);
      try {
        localStorage.setItem('seller_token', data.token);
        localStorage.setItem('seller_last_active', String(now));
        sessionStorage.setItem('seller_token', data.token);
      } catch (e) {}
      setIsAuthenticated(true);
      setPasswordInput('');
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    setSellerToken('');
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('seller_token');
      localStorage.removeItem('seller_last_active');
      sessionStorage.removeItem('seller_token');
    } catch (e) {}
  };

  const fetchStats = async () => {
    try {
      const res = await sellerFetch('/api/seller/stats/');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories/');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0) setNewCategoryId(String(data[0].id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async (silent = false) => {
    if (!silent && orders.length === 0) setIsLoadingOrders(true);
    try {
      const q = new URLSearchParams();
      if (orderStatusFilter !== 'ALL') q.set('status', orderStatusFilter);
      if (orderSearch) q.set('search', orderSearch);

      const res = await sellerFetch(`/api/seller/orders/?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchOrders(orders.length > 0);
  }, [orderStatusFilter, orderSearch, isAuthenticated]);

  const syncAllData = async (silent = true) => {
    if (!silent) setIsSyncing(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchOrders(true),
        fetchProducts(true),
        fetchLowStockAlerts(true),
        fetchShippingRates(true),
      ]);
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
    } catch (e) {
      console.error('Error synchronizing admin data:', e);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };



  const handleUpdateOrderStatus = async (
    orderNumber: string,
    status: string,
    trackingNumber?: string,
    shippingCourier?: string
  ) => {
    try {
      const payload: { status: string; tracking_number?: string; shipping_courier?: string } = {
        status,
        tracking_number: trackingNumber,
      };
      const courier = (shippingCourier ?? editingCourier[orderNumber] ?? '').trim();
      if (courier) payload.shipping_courier = courier;
      const res = await sellerFetch(`/api/seller/orders/${orderNumber}/status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (status === 'CANCELLED') {
          setOrderFeedback({
            type: 'info',
            text: `Pesanan ${orderNumber} berhasil dibatalkan. Stok barang otomatis dikembalikan ke katalog toko.`,
          });
        } else if (status === 'CONFIRMED') {
          setOrderFeedback({
            type: 'success',
            text: `Pesanan ${orderNumber} dikonfirmasi lunas & sedang dikemas.`,
          });
        } else if (status === 'SHIPPED') {
          setOrderFeedback({
            type: 'success',
            text: `Pesanan ${orderNumber} ditandai sedang dikirim${courier ? ` via ${courier}` : ''} dengan no. resi ${trackingNumber || '-'}.`,
          });
        } else if (status === 'COMPLETED') {
          setOrderFeedback({
            type: 'success',
            text: `Pesanan ${orderNumber} telah ditandai selesai.`,
          });
        }
        setTimeout(() => setOrderFeedback(null), 4500);
        syncAllData(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cancel all PENDING orders older than 24h in one click & restore stock
  const handleCancelExpiredOrders = async () => {
    const count = stats?.expired_pending_orders || 0;
    if (
      !confirm(
        `Batalkan ${count} pesanan yang belum dibayar lebih dari 24 jam? Stok pakaian akan otomatis dikembalikan ke katalog.`
      )
    ) {
      return;
    }
    setIsCancellingExpired(true);
    try {
      const res = await sellerFetch('/api/seller/orders/cancel-expired/', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setOrderFeedback({
          type: 'info',
          text: data?.message || 'Pesanan kedaluwarsa berhasil dibatalkan & stok dikembalikan.',
        });
        setTimeout(() => setOrderFeedback(null), 5000);
        await syncAllData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCancellingExpired(false);
    }
  };

  // Is an order still unpaid (PENDING) after more than 24 hours?
  const isOrderExpired = (o: OrderData): boolean =>
    o.status === 'PENDING' && Date.now() - new Date(o.created_at).getTime() > TWENTY_FOUR_HOURS_MS;

  // Client-side date range filter on top of the server-side status/search filter
  const matchesOrderDateFilter = (o: OrderData): boolean => {
    if (orderDateFilter === 'ALL') return true;
    const created = new Date(o.created_at);
    const now = new Date();
    if (orderDateFilter === 'TODAY') {
      return created.toDateString() === now.toDateString();
    }
    if (orderDateFilter === '7DAYS') {
      return now.getTime() - created.getTime() <= 7 * 24 * 60 * 60 * 1000;
    }
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  };

  // Export filtered orders to a UTF-8 (BOM) CSV that opens cleanly in Excel / Google Sheets
  const handleExportOrdersCsv = (ordersToExport: OrderData[]) => {
    if (ordersToExport.length === 0) return;
    const statusLabel: { [k: string]: string } = {
      PENDING: 'Menunggu WA',
      CONFIRMED: 'Lunas / Dikemas',
      SHIPPED: 'Sedang Dikirim',
      COMPLETED: 'Selesai',
      CANCELLED: 'Dibatalkan',
    };
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'No. Pesanan',
      'Tanggal',
      'Status',
      'Nama Pembeli',
      'No. WA',
      'Provinsi',
      'Kota',
      'Kecamatan',
      'Alamat',
      'Pakaian',
      'Jumlah (pcs)',
      'Subtotal (Rp)',
      'Ongkir (Rp)',
      'Total (Rp)',
      'Ekspedisi',
      'No. Resi',
      'Catatan',
    ];
    const rows = ordersToExport.map((o) => [
      o.order_number,
      new Date(o.created_at).toLocaleString('id-ID'),
      statusLabel[o.status] || o.status,
      o.customer_name,
      o.customer_phone,
      o.shipping_province,
      o.shipping_city,
      o.shipping_district || '',
      o.shipping_address,
      o.items.map((i) => `${i.product_title} (${i.color} - ${i.size}) x${i.quantity}`).join('; '),
      o.items.reduce((a, b) => a + b.quantity, 0),
      Number(o.subtotal_items) || 0,
      Number(o.shipping_cost) || 0,
      Number(o.total_amount) || 0,
      o.shipping_courier || '',
      o.tracking_number || '',
      o.notes || '',
    ]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-pesanan-dlrs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOrderFeedback({
      type: 'success',
      text: `Rekap ${ordersToExport.length} pesanan berhasil diunduh (CSV, siap dibuka di Excel).`,
    });
    setTimeout(() => setOrderFeedback(null), 4000);
  };

  // Smart Indonesian Courier Receipt Parser (JNE, J&T, SiCepat, SPX, AnterAja, Pos, Lion, ID Express, Ninja)
  const parseCourierResiFromText = (rawText: string, orderNumber: string): string | null => {
    if (!rawText) return null;
    const normalized = rawText.replace(/\r/g, '\n');

    const isCleanResiCandidate = (token: string): boolean => {
      const clean = token.replace(/[^A-Z0-9\-]/gi, '').toUpperCase();
      if (clean.length < 8 || clean.length > 24) return false;
      if (clean === orderNumber.toUpperCase()) return false;
      if (clean.startsWith('ORD-') || clean.startsWith('INV-')) return false;
      // Ignore Indonesian phone numbers
      if (/^(?:08|628|\+628)\d{7,12}$/.test(clean)) return false;
      // Must contain at least 5 digits (all courier tracking numbers in Indonesia have digits)
      const digitCount = (clean.match(/\d/g) || []).length;
      if (digitCount < 5) return false;
      return true;
    };

    // 1. Priority 1: Explicit Keyword Anchor (No. Resi / AWB / Connote / Tracking)
    const labelRegex =
      /(?:NO\.?\s*RESI|NOMOR\s*RESI|RESI|NO\.?\s*AWB|AWB|E-?CONNOTE|CONNOTE|NO\.?\s*PAKET|TRACKING\s*(?:NO|NUMBER|ID)?)\s*[:#\-=.]*\s*([A-Z0-9][A-Z0-9\-]{7,23})/gi;
    let match: RegExpExecArray | null;
    while ((match = labelRegex.exec(normalized)) !== null) {
      const candidate = match[1].trim().toUpperCase();
      if (isCleanResiCandidate(candidate)) {
        return candidate;
      }
    }

    // 2. Priority 2: Specific Indonesian Expedition Tracking Number Formats
    const courierPatterns: RegExp[] = [
      /\b(J[PDXTB]\d{9,12})\b/i, // J&T Express (JP..., JD..., JX..., JT...)
      /\b(SPXID[A-Z0-9]{8,15})\b/i, // Shopee Express (SPXID...)
      /\b(00\d{10,13})\b/, // SiCepat (00...)
      /\b(1000\d{10,13})\b/, // AnterAja (1000...)
      /\b((?:SOC|CGK|BDG|SUB|TGR|JOG|DPS|MKS|MDN|SMG|SLO|MLG|BKI|DPK|BGR|PLM|PKU|BPN|BJM)[A-Z0-9]{8,15})\b/i, // JNE Regional Connote
      /\b((?:11LP|LP|IDE|IDS|NLIDAP|NVID|TKP)[A-Z0-9\-]{8,16})\b/i, // Lion Parcel, ID Express, Ninja, Tokopedia
    ];

    for (const pat of courierPatterns) {
      const m = normalized.match(pat);
      if (m && m[1] && isCleanResiCandidate(m[1])) {
        return m[1].toUpperCase();
      }
    }

    // 3. Priority 3: General prominent alphanumeric/numeric barcode token on the receipt
    const tokens = normalized.toUpperCase().split(/[\s,;:|/\\()[\]{}"']+/) || [];
    for (const tok of tokens) {
      const cleaned = tok.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '');
      if (/^[A-Z0-9]{10,20}$/.test(cleaned) && isCleanResiCandidate(cleaned)) {
        const digits = (cleaned.match(/\d/g) || []).length;
        if (digits >= 7) {
          return cleaned;
        }
      }
    }

    return null;
  };

  // Multi-Engine Receipt Image Scanner:
  // Engine 1: Native Browser BarcodeDetector (1D Barcode & QR on Struk Resi)
  // Engine 2: Client-side OCR (Tesseract.js) with contrast preprocessing
  const extractResiFromReceiptImage = async (file: File, orderNumber: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;

    // Engine 1: Hardware-accelerated BarcodeDetector API (if supported by browser)
    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (BarcodeDetectorClass) {
        const detector = new BarcodeDetectorClass({
          formats: ['code_128', 'code_39', 'itf', 'codabar', 'ean_13', 'qr_code'],
        });
        const bitmap = await createImageBitmap(file);
        const barcodes = await detector.detect(bitmap);
        if (Array.isArray(barcodes) && barcodes.length > 0) {
          for (const b of barcodes) {
            const raw = String(b.rawValue || '').trim();
            if (raw && !raw.startsWith('http') && raw.length >= 8 && raw.length <= 25) {
              return raw.toUpperCase();
            }
            // If QR code contains a tracking URL with ?resi= or ?awb=
            if (raw.startsWith('http')) {
              const urlMatch = raw.match(/[?&](?:resi|awb|connote|tracking)=([A-Z0-9\-]{8,24})/i);
              if (urlMatch && urlMatch[1]) return urlMatch[1].toUpperCase();
            }
          }
        }
      }
    } catch (e) {
      // Fallback to OCR if BarcodeDetector fails or isn't supported
    }

    // Engine 2: Dynamic Tesseract.js OCR on Preprocessed Receipt Canvas
    try {
      if (!(window as any).Tesseract) {
        await new Promise<void>((resolve, reject) => {
          const existingScript = document.querySelector('script[data-tesseract-ocr="true"]');
          if (existingScript) {
            existingScript.addEventListener('load', () => resolve());
            existingScript.addEventListener('error', () => reject(new Error('Gagal memuat modul OCR')));
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          script.async = true;
          script.setAttribute('data-tesseract-ocr', 'true');
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Gagal memuat modul OCR'));
          document.head.appendChild(script);
        });
      }

      const TesseractLib = (window as any).Tesseract;
      if (TesseractLib) {
        // Preprocess image on canvas for sharper thermal receipt OCR
        const imgBitmap = await createImageBitmap(file);
        const maxDim = 1600;
        const scale = imgBitmap.width > maxDim ? maxDim / imgBitmap.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(imgBitmap.width * scale);
        canvas.height = Math.round(imgBitmap.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = 'grayscale(100%) contrast(145%)';
          ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);
        }

        const result = await TesseractLib.recognize(canvas, 'eng');
        const ocrText = result?.data?.text || '';
        const parsed = parseCourierResiFromText(ocrText, orderNumber);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.warn('OCR fallback notice:', e);
    }

    return null;
  };

  const handleScanAndUploadReceiptImage = async (o: OrderData, file: File) => {
    setScanningResiOrder(o.order_number);
    setResiScanStatus((prev) => ({
      ...prev,
      [o.order_number]: {
        type: 'scanning',
        text: 'Memindai Barcode & Teks Nomor Resi dari foto struk...',
      },
    }));

    try {
      const detectedResi = await extractResiFromReceiptImage(file, o.order_number);
      const currentInputResi = (editingResi[o.order_number] ?? o.tracking_number ?? '').trim();
      const finalResi = detectedResi || currentInputResi;

      if (detectedResi) {
        setEditingResi((prev) => ({
          ...prev,
          [o.order_number]: detectedResi,
        }));
      }

      // Build FormData to save receipt photo AND update tracking_number automatically
      const formData = new FormData();
      formData.append('receipt_image', file);
      if (finalResi) {
        formData.append('tracking_number', finalResi);
        const courierName = editingCourier[o.order_number] || detectCourierClient(finalResi) || o.shipping_courier || '';
        if (courierName) {
          formData.append('shipping_courier', courierName);
          setEditingCourier((prev) => ({ ...prev, [o.order_number]: courierName }));
        }
      }

      // If order is CONFIRMED and autoMarkShippedOnScan is enabled and we have a resi, automatically transition to SHIPPED
      const shouldTransitionToShipped =
        o.status === 'CONFIRMED' && autoMarkShippedOnScan && Boolean(finalResi);
      if (shouldTransitionToShipped) {
        formData.append('status', 'SHIPPED');
      }

      const res = await sellerFetch(`/api/seller/orders/${o.order_number}/status/`, {
        method: 'PATCH',
        body: formData,
      });

      if (res.ok) {
        if (detectedResi) {
          const msg = shouldTransitionToShipped
            ? `No. Resi "${detectedResi}" otomatis terbaca dari foto struk & status diupdate ke Sedang Dikirim.`
            : `No. Resi "${detectedResi}" otomatis terbaca dari foto struk & berhasil disimpan.`;
          setResiScanStatus((prev) => ({
            ...prev,
            [o.order_number]: { type: 'success', text: msg },
          }));
          setOrderFeedback({ type: 'success', text: msg });
        } else {
          const msg =
            'Foto struk resi berhasil disimpan. Tulisan resi kurang jelas untuk dibaca otomatis — silakan cek/ketik No. Resi di bawah.';
          setResiScanStatus((prev) => ({
            ...prev,
            [o.order_number]: { type: 'manual', text: msg },
          }));
          setOrderFeedback({ type: 'info', text: msg });
        }
        setTimeout(() => setOrderFeedback(null), 5000);
        setEditingShippedResiOrder(null);
        await syncAllData(true);
      }
    } catch (err) {
      console.error(err);
      setResiScanStatus((prev) => ({
        ...prev,
        [o.order_number]: {
          type: 'manual',
          text: 'Gagal memproses foto resi. Silakan ketik nomor resi secara manual.',
        },
      }));
    } finally {
      setScanningResiOrder(null);
    }
  };

  const fetchProducts = async (silent = false) => {
    if (!silent && products.length === 0) setIsLoadingProducts(true);
    try {
      const res = await sellerFetch('/api/seller/products/');
      if (res.ok) {
        const data = await res.json();
        // Backend returns plain array (pagination_class = None), but guard for safety
        const productList: ProductAdminItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
          ? data.results
          : [];
        setProducts(productList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setIsLoadingProducts(false);
    }
  };

  const handleUpdateStock = async (variantId: number, newStock: number) => {
    setStockUpdatingId(variantId);
    try {
      const res = await sellerFetch(`/api/seller/variants/${variantId}/stock/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: newStock }),
      });
      if (res.ok) {
        setEditingStock((prev) => {
          const next = { ...prev };
          delete next[variantId];
          return next;
        });
        setOrderFeedback({
          type: 'success',
          text: `Stok variasi berhasil diperbarui menjadi ${newStock} pcs.`,
        });
        setTimeout(() => setOrderFeedback(null), 3000);
        fetchProducts(true);
        fetchStats();
        fetchLowStockAlerts(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStockUpdatingId(null);
    }
  };

  const handleSaveAllEditedStock = async (entries: { variantId: number; newStock: number }[]) => {
    if (entries.length === 0) return;
    setIsSavingBatchStock(true);
    try {
      await Promise.all(
        entries.map((item) =>
          sellerFetch(`/api/seller/variants/${item.variantId}/stock/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock_quantity: item.newStock }),
          })
        )
      );
      setEditingStock({});
      setOrderFeedback({
        type: 'success',
        text: `${entries.length} perubahan stok variasi pakaian berhasil disimpan sekaligus!`,
      });
      setTimeout(() => setOrderFeedback(null), 4000);
      await Promise.all([fetchProducts(true), fetchStats(), fetchLowStockAlerts(true)]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingBatchStock(false);
    }
  };

  const handleCopyShippingInfo = (o: OrderData) => {
    const text = `Pesanan: ${o.order_number}\nPenerima: ${o.customer_name} (${o.customer_phone})\nAlamat: ${o.shipping_address}${o.shipping_district ? `, Kec. ${o.shipping_district}` : ''}, ${o.shipping_city}, ${o.shipping_province}${o.notes ? `\nCatatan: ${o.notes}` : ''}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedOrderNum(o.order_number);
      setTimeout(() => setCopiedOrderNum(null), 2500);
    }
  };

  const handlePrintShippingLabel = (o: OrderData) => {
    if (typeof window === 'undefined') return;
    const printWin = window.open('', '_blank', 'width=640,height=760');
    if (!printWin) return;

    const escapeHtml = (val: any) => {
      if (val === null || val === undefined) return '';
      return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const totalQty = o.items.reduce((acc, i) => acc + i.quantity, 0);
    const itemsRows = o.items
      .map(
        (item, idx) =>
          `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid #e7e5e4;">${idx + 1}. <strong>${escapeHtml(item.product_title)}</strong></td>
            <td style="padding:6px 8px;border-bottom:1px solid #e7e5e4;">${escapeHtml(item.color)} / ${escapeHtml(item.size)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e7e5e4;text-align:right;font-weight:bold;">${item.quantity} pcs</td>
          </tr>`
      )
      .join('');

    const safeOrderNum = escapeHtml(o.order_number);
    const safeCustomerName = escapeHtml(o.customer_name);
    const safeCustomerPhone = escapeHtml(o.customer_phone);
    const safeCity = escapeHtml(o.shipping_city);
    const safeDistrict = o.shipping_district ? `, Kec. ${escapeHtml(o.shipping_district)}` : '';
    const safeProvince = escapeHtml(o.shipping_province);
    const safeAddress = escapeHtml(o.shipping_address);
    const safeNotes = o.notes ? `<br/><em style="color:#92400e;">Catatan: "${escapeHtml(o.notes)}"</em>` : '';
    const safeTracking = o.tracking_number ? escapeHtml(o.tracking_number) : '';
    const safeCourier = o.shipping_courier ? ` (${escapeHtml(o.shipping_courier)})` : '';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Label Pengiriman - ${safeOrderNum}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #18181b; margin: 20px; }
            .slip { border: 2px solid #18181b; border-radius: 12px; padding: 18px; max-width: 520px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #a8a29e; padding-bottom: 10px; margin-bottom: 12px; }
            .brand { font-size: 16px; font-weight: 800; letter-spacing: 0.04em; }
            .order-no { font-family: monospace; font-size: 13px; font-weight: bold; background: #f5f5f4; padding: 4px 8px; border-radius: 6px; border: 1px solid #d6d3d1; }
            .section { margin-bottom: 12px; }
            .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #78716c; font-weight: bold; margin-bottom: 4px; }
            .recipient-name { font-size: 18px; font-weight: 800; margin: 0 0 2px 0; }
            .recipient-phone { font-size: 14px; font-weight: bold; margin: 0 0 6px 0; }
            .address-box { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 10px; font-size: 13px; line-height: 1.45; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
            th { text-align: left; padding: 6px 8px; background: #f5f5f4; border-bottom: 1px solid #d6d3d1; font-size: 11px; }
            @media print { .no-print { display: none; } body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="header">
              <div>
                <div class="brand">DLRS — KATALOG PAKAIAN</div>
                <div style="font-size:11px;color:#57534e;">Slip Label Pengiriman Paket</div>
              </div>
              <div class="order-no">${safeOrderNum}</div>
            </div>
            <div class="section">
              <div class="label">Penerima Paket (Kepada):</div>
              <p class="recipient-name">${safeCustomerName}</p>
              <p class="recipient-phone">Telp/WA: ${safeCustomerPhone}</p>
              <div class="address-box">
                <strong>${safeCity}${safeDistrict} — ${safeProvince}</strong><br/>
                ${safeAddress}
                ${safeNotes}
              </div>
            </div>
            ${safeTracking ? `<div class="section"><div class="label">No. Resi Ekspedisi${safeCourier}:</div><div style="font-family:monospace;font-size:14px;font-weight:bold;">${safeTracking}</div></div>` : ''}
            <div class="section">
              <div class="label">Isi Paket Pakaian (Total ${totalQty} pcs):</div>
              <table>
                <thead>
                  <tr><th>Nama Pakaian</th><th>Warna / Ukuran</th><th style="text-align:right;">Qty</th></tr>
                </thead>
                <tbody>${itemsRows}</tbody>
              </table>
            </div>
          </div>
          <div class="no-print" style="text-align:center;margin-top:16px;">
            <button onclick="window.print()" style="padding:10px 20px;background:#18181b;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Cetak Sekarang</button>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeQuickReplyOrder) setActiveQuickReplyOrder(null);
        if (activeColorModalProduct) setActiveColorModalProduct(null);
        if (editingProduct) setEditingProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuickReplyOrder, activeColorModalProduct, editingProduct]);

  const handleAdjustColorGroupStock = (
    sizes: VariantByColorItem['sizes'],
    mode: 'zero' | 'add10'
  ) => {
    setEditingStock((prev) => {
      const next = { ...prev };
      sizes.forEach((s) => {
        const cur = prev[s.id] ?? s.stock_quantity;
        next[s.id] = mode === 'zero' ? 0 : cur + 10;
      });
      return next;
    });
  };

  const fetchLowStockAlerts = async (silent = false) => {
    if (!silent && lowStockAlerts.length === 0) setIsLoadingAlerts(true);
    try {
      const res = await sellerFetch('/api/seller/alerts/low-stock/');
      if (res.ok) {
        const data = await res.json();
        setLowStockAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setIsLoadingAlerts(false);
    }
  };

  const handleToggleProductStatus = async (p: ProductAdminItem) => {
    try {
      const newStatus = !p.is_active;
      const res = await sellerFetch(`/api/seller/products/${p.id}/update/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, is_active: newStatus } : item))
        );
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedProductIds.length === 0) return;
    if (action === 'delete') {
      if (!confirm(`Hapus ${selectedProductIds.length} produk terpilih secara permanen?`)) return;
    }
    setIsPerformingBulkAction(true);
    setBulkActionMsg(null);
    try {
      const res = await sellerFetch('/api/seller/products/bulk-action/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedProductIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menjalankan aksi massal.');
      setBulkActionMsg({ type: 'success', text: data.message || 'Aksi massal berhasil dijalankan.' });
      setSelectedProductIds([]);
      fetchProducts(true);
      fetchStats();
      fetchLowStockAlerts(true);
      setTimeout(() => setBulkActionMsg(null), 4000);
    } catch (err: any) {
      setBulkActionMsg({ type: 'error', text: err.message });
    } finally {
      setIsPerformingBulkAction(false);
    }
  };

  const handleDeleteSingleProduct = async (p: ProductAdminItem) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${p.title}"?`)) return;
    try {
      const res = await sellerFetch('/api/seller/products/bulk-action/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: [p.id] }),
      });
      if (res.ok) {
        fetchProducts(true);
        fetchStats();
        fetchLowStockAlerts(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditProduct = (p: ProductAdminItem) => {
    setEditingProduct(p);
    setEditTitle(p.title);
    setEditPrice(p.base_price ? String(parseInt(p.base_price)) : '');
    setEditCategoryId(p.category && (p.category as any).id ? String((p.category as any).id) : (categories[0]?.id ? String(categories[0].id) : ''));
    setEditDescription(p.description || '');
    setEditSizeGuide(p.size_guide || '');
    setEditIsActive(p.is_active ?? true);
    setEditSuccessMsg(null);
    setEditErrorMsg(null);
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSavingEditProduct(true);
    setEditSuccessMsg(null);
    setEditErrorMsg(null);
    try {
      const res = await sellerFetch(`/api/seller/products/${editingProduct.id}/update/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          base_price: editPrice,
          category_id: editCategoryId || null,
          description: editDescription.trim(),
          size_guide: editSizeGuide.trim(),
          is_active: editIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan perubahan produk.');
      setEditSuccessMsg('Perubahan produk berhasil disimpan!');
      fetchProducts(true);
      fetchStats();
      setTimeout(() => {
        setEditingProduct(null);
      }, 1000);
    } catch (err: any) {
      setEditErrorMsg(err.message);
    } finally {
      setIsSavingEditProduct(false);
    }
  };

  const handleQuickRestockAlertVariant = async (variantId: number, currentStock: number, addQty: number) => {
    setAlertRestockingKey(String(variantId));
    try {
      const newStock = Math.max(0, currentStock + addQty);
      const res = await sellerFetch(`/api/seller/variants/${variantId}/stock/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: newStock }),
      });
      if (res.ok) {
        setOrderFeedback({
          type: 'success',
          text: `Restock +${addQty} pcs berhasil! Stok sekarang menjadi ${newStock} pcs.`,
        });
        setTimeout(() => setOrderFeedback(null), 3000);
        fetchProducts(true);
        fetchStats();
        fetchLowStockAlerts(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAlertRestockingKey(null);
    }
  };

  const applyPresetSizesToAllColors = (presetSizes: { [size: string]: number }) => {
    setColorVariations((prev) =>
      prev.map((c) => ({
        ...c,
        sizes: { ...presetSizes },
      }))
    );
  };

  // ─────────────────────────────────────────
  // COLOR VARIATIONS STATE HELPERS (ADD FORM)
  // ─────────────────────────────────────────
  const addColorVariation = () => {
    const nextColors = ['Putih', 'Sage Green', 'Krem Susu', 'Terracotta', 'Navy', 'Cokelat Milo', 'Maroon', 'Abu-abu', 'Motif Bunga', 'Motif Tropis'];
    const usedColors = colorVariations.map((c) => c.color.toLowerCase());
    const suggestedColor = nextColors.find((c) => !usedColors.includes(c.toLowerCase())) || `Warna ${colorVariations.length + 1}`;

    const newId = `color-${Date.now()}`;
    setColorVariations([
      ...colorVariations,
      {
        id: newId,
        color: suggestedColor,
        imageFile: null,
        imagePreviewUrl: '',
        imageUrl: '',
        sizes: { 'ALL SIZE': 10, STANDAR: 10, JUMBO: 8, S: 5, M: 10, L: 10, XL: 5, XXL: 5 },
      },
    ]);
  };

  const removeColorVariation = (id: string) => {
    if (colorVariations.length <= 1) return;
    setColorVariations(colorVariations.filter((c) => c.id !== id));
  };

  const updateColorVariation = (id: string, updates: Partial<ColorVariationInput>) => {
    setColorVariations(colorVariations.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const handleColorImageFileChange = (id: string, file: File | null) => {
    if (file) {
      const preview = URL.createObjectURL(file);
      updateColorVariation(id, { imageFile: file, imagePreviewUrl: preview });
    } else {
      updateColorVariation(id, { imageFile: null, imagePreviewUrl: '' });
    }
  };

  // ─────────────────────────────────────────
  // COLOR PHOTO MODAL HELPERS (EXISTING PRODUCTS)
  // ─────────────────────────────────────────
  const refreshProductModalAndList = async (productId: number) => {
    const refreshRes = await sellerFetch('/api/seller/products/');
    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      const updatedList: ProductAdminItem[] = Array.isArray(refreshData)
        ? refreshData
        : Array.isArray(refreshData.results)
        ? refreshData.results
        : [];
      setProducts(updatedList);
      const currentUpdated = updatedList.find((p) => p.id === productId);
      if (currentUpdated) {
        setActiveColorModalProduct(currentUpdated);
      }
    }
  };

  const handleUploadColorImage = async (productId: number, color: string) => {
    const file = colorModalFile[color];
    const url = colorModalUrl[color] || '';
    setColorModalError(null);
    setColorModalSuccess(null);

    if (!file && !url) {
      setColorModalError(`Pilih file foto dari perangkat Anda terlebih dahulu untuk warna "${color}".`);
      return;
    }

    setColorModalUploadingColor(color);

    try {
      const formData = new FormData();
      formData.append('color', color);
      if (file) {
        formData.append('image_file', file);
      }
      if (url) {
        formData.append('image_url', url);
      }

      const res = await sellerFetch(`/api/seller/products/${productId}/color-image/`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengunggah foto variasi warna.');
      }

      setColorModalSuccess(`Foto untuk warna "${color}" berhasil disimpan!`);
      setColorModalFile((prev) => ({ ...prev, [color]: null }));
      setColorModalUrl((prev) => ({ ...prev, [color]: '' }));
      await refreshProductModalAndList(productId);
    } catch (err: any) {
      setColorModalError(err.message);
    } finally {
      setColorModalUploadingColor(null);
    }
  };

  const handleSetPrimaryColorImage = async (productId: number, color: string) => {
    setColorModalError(null);
    setColorModalSuccess(null);
    try {
      const res = await sellerFetch(`/api/seller/products/${productId}/color-action/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_primary', color }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menjadikan foto sampul utama.');
      setColorModalSuccess(data.message);
      await refreshProductModalAndList(productId);
    } catch (err: any) {
      setColorModalError(err.message);
    }
  };

  const handleDeleteColorVariation = async (productId: number, color: string) => {
    if (
      !confirm(
        `Hapus seluruh variasi warna "${color}" beserta 8 ukuran stok dan fotonya dari produk ini?`
      )
    )
      return;
    setColorModalError(null);
    setColorModalSuccess(null);
    try {
      const res = await sellerFetch(`/api/seller/products/${productId}/color-action/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_color', color }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus variasi warna.');
      setColorModalSuccess(data.message);
      await refreshProductModalAndList(productId);
      fetchStats();
      fetchLowStockAlerts(true);
    } catch (err: any) {
      setColorModalError(err.message);
    }
  };

  const handleDeleteProductImage = async (productId: number, imageId: number) => {
    if (!confirm('Hapus foto pada warna ini? (Variasi warna & stok ukuran tetap disimpan)')) return;
    setColorModalError(null);
    setColorModalSuccess(null);
    try {
      const res = await sellerFetch(`/api/seller/products/${productId}/images/${imageId}/`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setColorModalSuccess('Foto warna berhasil dihapus (variasi warna & ukuran tetap ada).');
        await refreshProductModalAndList(productId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNewColorPhoto = async (productId: number) => {
    const color = newCustomColorName.trim();
    setColorModalError(null);
    setColorModalSuccess(null);

    if (!color) {
      setColorModalError('Ketik atau pilih nama warna/motif baru terlebih dahulu.');
      return;
    }
    if (!newCustomColorFile) {
      setColorModalError(`Pilih file foto untuk warna "${color}" terlebih dahulu.`);
      return;
    }

    setIsAddingNewColorPhoto(true);

    try {
      const formData = new FormData();
      formData.append('color', color);
      formData.append('image_file', newCustomColorFile);
      formData.append(
        'sizes',
        JSON.stringify(
          Object.entries(newCustomColorSizes).map(([size, stock]) => ({
            size,
            stock: Number(stock) || 0,
          }))
        )
      );

      const res = await sellerFetch(`/api/seller/products/${productId}/color-image/`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menambahkan variasi warna baru.');
      }

      setColorModalSuccess(`Variasi warna "${color}" beserta foto & stok berhasil ditambahkan ke produk!`);
      setNewCustomColorName('');
      setNewCustomColorFile(null);
      setNewCustomColorPreview('');
      setNewCustomColorSizes({ 'ALL SIZE': 10, STANDAR: 10, JUMBO: 8, S: 5, M: 10, L: 10, XL: 5, XXL: 5 });

      await refreshProductModalAndList(productId);
      fetchStats();
      fetchLowStockAlerts(true);
    } catch (err: any) {
      setColorModalError(err.message);
    } finally {
      setIsAddingNewColorPhoto(false);
    }
  };

  const fetchShippingRates = async (silent = false) => {
    try {
      const res = await fetch('/api/shipping-rates/');
      if (res.ok) {
        const data = await res.json();
        setShippingRates(data);
        const map: { [id: number]: string } = {};
        data.forEach((r: ShippingRateData) => {
          map[r.id] = r.cost;
        });
        setEditingRates((prev) => (silent && Object.keys(prev).length > 0 ? { ...map, ...prev } : map));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateShippingRate = async (id: number) => {
    const cost = editingRates[id] ?? shippingRates.find((r) => r.id === id)?.cost;
    if (cost === undefined) return;
    try {
      const res = await sellerFetch(`/api/seller/shipping-rates/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost }),
      });
      if (res.ok) {
        fetchShippingRates();
        setOrderFeedback({
          type: 'success',
          text: 'Tarif ongkos kirim berhasil diperbarui!',
        });
        setTimeout(() => setOrderFeedback(null), 3500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAllShippingRates = async (changedRateIds: number[]) => {
    if (changedRateIds.length === 0) return;
    setIsSavingAllRates(true);
    try {
      await Promise.all(
        changedRateIds.map((id) =>
          sellerFetch(`/api/seller/shipping-rates/${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cost: editingRates[id] }),
          })
        )
      );
      await fetchShippingRates();
      setOrderFeedback({
        type: 'success',
        text: `${changedRateIds.length} tarif ongkos kirim provinsi berhasil disimpan sekaligus!`,
      });
      setTimeout(() => setOrderFeedback(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingAllRates(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingProduct(true);
    setCreateSuccessMsg(null);
    setCreateErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('title', newTitle);
      formData.append('base_price', newPrice);
      formData.append('category_id', newCategoryId);
      formData.append('description', newDescription);
      formData.append('size_guide', newSizeGuide);

      const colorsData = colorVariations.map((c, idx) => {
        const fileKey = `color_image_${idx}`;
        if (c.imageFile) {
          formData.append(fileKey, c.imageFile);
        }
        return {
          color: c.color.trim() || `Warna ${idx + 1}`,
          file_key: fileKey,
          image_url: c.imageUrl.trim(),
          is_primary: idx === 0,
          sizes: c.sizes,
        };
      });

      formData.append('colors_data', JSON.stringify(colorsData));

      const res = await sellerFetch('/api/seller/products/create/', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menambahkan produk.');
      }

      setCreateSuccessMsg(`Produk "${newTitle}" berhasil ditambahkan lengkap dengan foto variasi warna!`);
      setOrderFeedback({
        type: 'success',
        text: `Produk "${newTitle}" berhasil ditambahkan ke katalog!`,
      });
      setTimeout(() => setOrderFeedback(null), 5000);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setNewTitle('');
      setNewPrice('');
      setNewDescription('');
      setNewSizeGuide('');
      setColorVariations([
        {
          id: 'color-1',
          color: 'Hitam',
          imageFile: null,
          imagePreviewUrl: '',
          imageUrl: '',
          sizes: { 'ALL SIZE': 10, STANDAR: 10, JUMBO: 8, S: 5, M: 10, L: 10, XL: 5, XXL: 5 },
        },
        {
          id: 'color-2',
          color: 'Krem Susu',
          imageFile: null,
          imagePreviewUrl: '',
          imageUrl: '',
          sizes: { 'ALL SIZE': 10, STANDAR: 10, JUMBO: 8, S: 5, M: 10, L: 10, XL: 5, XXL: 5 },
        },
      ]);
      fetchProducts(true);
      fetchStats();
      fetchLowStockAlerts(true);
    } catch (err: any) {
      setCreateErrorMsg(err.message);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // ─────────────────────────────────────────
  // CHECKING AUTH STATE
  // ─────────────────────────────────────────
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-stone-500">Memeriksa izin akses admin...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // GERBANG KEAMANAN / LOGIN SCREEN (AKSES TERKUNCI)
  // ─────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-100 via-stone-100 to-stone-200 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-stone-200/90 p-6 sm:p-10 space-y-6 sm:space-y-7 relative overflow-hidden">
          {/* Top security accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-zinc-800 via-zinc-950 to-zinc-800" />

          {/* Header & Lock Icon */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 text-white shadow-lg mx-auto mb-1">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 border border-stone-200 rounded-full">
              <IconLock className="w-3 h-3 text-stone-600" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-stone-600 uppercase">
                Area Terproteksi • Admin Toko
              </span>
            </div>

            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Autentikasi Pemilik Toko
            </h1>
            <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
              Dashboard toko saat ini <strong className="text-zinc-700">terkunci</strong>. Masukkan Kata Sandi atau PIN Admin Anda untuk membuka data pesanan, omset, dan stok.
            </p>
          </div>

          {/* Security Notice Box */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-left">
            <IconShield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900/90 leading-tight">
              Sesi login Anda berlaku selama <strong>24 jam</strong>. Jika sama sekali tidak ada aktivitas/off selama 24 jam, sistem akan mengunci kembali demi keamanan data toko.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-semibold flex items-center gap-2">
              <IconAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Kata Sandi / PIN Admin
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Masukkan kata sandi atau PIN admin..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 text-sm transition-all shadow-sm font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Buka Kunci & Masuk Dashboard</span>
              <span>→</span>
            </button>
          </form>

          <div className="text-center pt-1 border-t border-stone-100">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-zinc-900 font-medium transition-colors"
            >
              <span>←</span>
              <span>Kembali ke Katalog Pakaian</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filtered & sorted products for Tab 2
  const filteredProducts = products.filter((p) => {
    if (productSearch.trim()) {
      const term = productSearch.toLowerCase().trim();
      const matchesTitle = p.title.toLowerCase().includes(term);
      const matchesCategory = p.category?.name?.toLowerCase().includes(term);
      const matchesColor = p.variants?.some((v) => v.color.toLowerCase().includes(term));
      if (!matchesTitle && !matchesCategory && !matchesColor) return false;
    }
    if (productCategoryFilter !== 'ALL') {
      const catId = (p.category as any)?.id;
      if (String(catId) !== productCategoryFilter && p.category?.name !== productCategoryFilter) {
        return false;
      }
    }
    if (productStockFilter === 'draft') {
      if (p.is_active !== false) return false;
    } else if (productStockFilter === 'out_of_stock') {
      if (p.total_stock > 0) return false;
    } else if (productStockFilter === 'low_stock') {
      const hasLowVariant = p.variants?.some((v) => v.stock_quantity > 0 && v.stock_quantity <= 5);
      if ((p.total_stock === 0 || p.total_stock > 10) && !hasLowVariant) return false;
    } else if (productStockFilter === 'in_stock') {
      if (p.total_stock <= 0) return false;
    }
    return true;
  }).sort((a, b) => {
    if (productSort === 'oldest') return a.id - b.id;
    if (productSort === 'title_asc') return a.title.localeCompare(b.title);
    if (productSort === 'title_desc') return b.title.localeCompare(a.title);
    if (productSort === 'stock_high') return b.total_stock - a.total_stock;
    if (productSort === 'stock_low') return a.total_stock - b.total_stock;
    return b.id - a.id; // newest default
  });

  const allFilteredIds = filteredProducts.map((p) => p.id);
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedProductIds.includes(id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(allFilteredIds);
    }
  };
  const toggleSelectProduct = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Derived helpers for unsaved stock changes, alerts & shipping rates
  const variantStockMap: { [variantId: number]: number } = {};
  products.forEach((p) => {
    p.variants?.forEach((v) => {
      variantStockMap[v.id] = v.stock_quantity;
    });
  });

  const unsavedStockEntries = Object.entries(editingStock)
    .map(([idStr, val]) => ({ variantId: Number(idStr), newStock: val }))
    .filter((item) => variantStockMap[item.variantId] !== undefined && variantStockMap[item.variantId] !== item.newStock);

  const filteredAlerts = lowStockAlerts.filter((item) => {
    if (alertStatusFilter !== 'ALL' && item.status !== alertStatusFilter) return false;
    if (alertSearch.trim()) {
      const q = alertSearch.toLowerCase().trim();
      const matchTitle = item.product_title.toLowerCase().includes(q);
      const matchColor = item.color.toLowerCase().includes(q);
      const matchSize = item.size.toLowerCase().includes(q);
      const matchCat = (item.category_name || '').toLowerCase().includes(q);
      if (!matchTitle && !matchColor && !matchSize && !matchCat) return false;
    }
    return true;
  });

  const groupedAlertsByProduct = Object.values(
    filteredAlerts.reduce((acc, item) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = {
          product_id: item.product_id,
          product_title: item.product_title,
          product_slug: item.product_slug,
          primary_image: item.primary_image || null,
          category_name: item.category_name || 'Katalog Pakaian',
          variants: [] as LowStockAlertItem[],
        };
      }
      acc[item.product_id].variants.push(item);
      return acc;
    }, {} as Record<number, { product_id: number; product_title: string; product_slug: string; primary_image: string | null; category_name: string; variants: LowStockAlertItem[] }>)
  );

  const displayedOrders = orders.filter(matchesOrderDateFilter);

  // Quick courier selector chips shown in the resi input sections
  const renderCourierChips = (o: OrderData) => {
    const selected = editingCourier[o.order_number] ?? o.shipping_courier ?? '';
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Ekspedisi:</p>
        <div className="flex flex-wrap gap-1">
          {COURIER_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() =>
                setEditingCourier((prev) => ({ ...prev, [o.order_number]: selected === c ? '' : c }))
              }
              className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-colors ${
                selected === c
                  ? 'bg-purple-700 border-purple-700 text-white'
                  : 'bg-white border-stone-300 text-stone-700 hover:bg-purple-50'
              }`}
            >
              {COURIER_SHORT_LABEL[c] || c}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const filteredShippingRates = shippingRates.filter((r) => {
    if (!shippingSearch.trim()) return true;
    return r.province.toLowerCase().includes(shippingSearch.toLowerCase().trim());
  });

  const changedShippingRateIds = shippingRates
    .filter((r) => editingRates[r.id] !== undefined && Number(editingRates[r.id]) !== Number(r.cost))
    .map((r) => r.id);

  // ─────────────────────────────────────────
  // MAIN SELLER DASHBOARD
  // ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-100/90 flex flex-col font-sans text-zinc-900">
      {/* Top Navbar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-stone-200/90 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin-toko" className="flex items-center gap-3 group">
              <div className="relative h-7 sm:h-8 w-auto flex-shrink-0">
                <Image
                  src="/DLRS_Logo.svg"
                  alt="DLRS Logo"
                  width={90}
                  height={36}
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              </div>
              <div className="border-l border-stone-200 pl-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm font-extrabold text-zinc-900 tracking-tight leading-none">
                    SELLER CENTER
                  </p>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-900 text-white">
                    ADMIN
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-0.5 truncate">
                  DLRS — Manajemen Katalog Pakaian
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Realtime Live Sync Status */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-full text-[11px] font-semibold text-emerald-800 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Auto-Sync Aktif</span>
              {lastSyncTime && (
                <span className="text-emerald-700/80 font-mono text-[10px] pl-1.5 border-l border-emerald-300">
                  {lastSyncTime}
                </span>
              )}
            </div>

            {/* 24-Hour Active Session Badge */}
            <div
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200/90 rounded-full text-[11px] font-semibold text-stone-700 shadow-sm"
              title="Sesi aktif selama 24 jam. Jika off selama 24 jam, sistem akan mengunci kembali."
            >
              <IconShield className="w-3.5 h-3.5 text-stone-500" />
              <span>Sesi Aman 24 Jam</span>
            </div>

            {/* Quick Refresh Button */}
            <button
              type="button"
              onClick={() => syncAllData(false)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-white hover:bg-stone-50 border border-stone-200 transition-all cursor-pointer shadow-sm disabled:opacity-60"
              title="Sinkronkan data pesanan dan stok terbaru dari database"
            >
              <IconRefresh className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-stone-100 border border-stone-200 transition-colors"
            >
              <span>Lihat Toko</span>
              <IconExternalLink className="w-3 h-3 text-stone-400" />
            </Link>

            <Link
              href="/lacak-pesanan"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-zinc-900 hover:bg-stone-100 border border-stone-200/70 transition-colors"
            >
              <span>Lacak Pesanan</span>
              <IconExternalLink className="w-3 h-3 text-stone-400" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Kunci sesi dan keluar dari dashboard admin"
            >
              <IconLock className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Kunci & Keluar</span>
              <span className="sm:hidden">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 w-full flex-1 space-y-5 sm:space-y-6">
        {/* Global Feedback Toast */}
        {orderFeedback && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-md animate-fade-in ${
              orderFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                {orderFeedback.type === 'success' ? (
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <IconAlertCircle className="w-3.5 h-3.5 text-amber-600" />
                )}
              </span>
              <span>{orderFeedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setOrderFeedback(null)}
              className="text-stone-400 hover:text-zinc-800 p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Metric KPI Cards (Statistik Utama Toko) */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('pesanan');
                setOrderStatusFilter('PENDING');
              }}
              className={`bg-white p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer group relative overflow-hidden ${
                activeTab === 'pesanan'
                  ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                  : 'border-stone-200/90 shadow-sm hover:border-amber-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
                <span>Pesanan Menunggu WA</span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center">
                  <IconClock className="w-4 h-4 text-amber-700" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-900 tracking-tight">
                  {stats.pending_orders}
                </p>
                <span className="text-xs font-semibold text-stone-500">perlu konfirmasi</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                <span className="text-stone-500">
                  Dikemas: <strong className="text-zinc-800">{stats.confirmed_orders}</strong> · Dikirim:{' '}
                  <strong className="text-zinc-800">{stats.shipped_orders}</strong>
                </span>
                <span className="font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                  Proses →
                </span>
              </div>
            </button>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
                  <span>Total Omset Lunas</span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center">
                    <IconTrendingUp className="w-4 h-4 text-emerald-700" />
                  </span>
                </div>
                <p className="text-lg min-[400px]:text-xl sm:text-2xl font-extrabold text-emerald-700 tracking-tight break-words">
                  Rp {Number(stats?.total_revenue || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">Hanya pesanan yang sudah dibayar</p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1 text-[11px] text-stone-500">
                <div className="flex items-center justify-between gap-2">
                  <span>Hari ini ({stats.today_orders ?? 0} pesanan)</span>
                  <strong className="text-zinc-800">
                    Rp {Number(stats.today_revenue || 0).toLocaleString('id-ID')}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Menunggu bayar</span>
                  <strong className="text-amber-700">
                    Rp {Number(stats.pending_revenue || 0).toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('stok')}
              className={`bg-white p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer group flex flex-col justify-between ${
                activeTab === 'stok'
                  ? 'border-zinc-900 ring-2 ring-zinc-900/10 shadow-md'
                  : 'border-stone-200/90 shadow-sm hover:border-zinc-400 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
                  <span>Katalog Pakaian Aktif</span>
                  <span className="w-8 h-8 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center">
                    <IconLayers className="w-4 h-4 text-zinc-800" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                    {stats.total_products}
                  </p>
                  <span className="text-xs font-semibold text-stone-500">
                    dari {products.length} model baju
                  </span>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                <span className="text-stone-500">{categories.length} kategori pakaian</span>
                <span className="font-bold text-zinc-800 group-hover:translate-x-0.5 transition-transform">
                  Kelola Stok →
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`bg-white p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer group flex flex-col justify-between ${
                activeTab === 'alerts'
                  ? 'border-rose-500 ring-2 ring-rose-500/15 shadow-md'
                  : 'border-stone-200/90 shadow-sm hover:border-rose-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
                  <span>Peringatan Stok Varian</span>
                  <span className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center">
                    <IconAlertTriangle className="w-4 h-4 text-rose-700" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 tracking-tight">
                    {lowStockAlerts.filter((a) => a.status === 'Menipis').length}
                  </p>
                  <span className="text-xs font-semibold text-stone-500">
                    menipis · {lowStockAlerts.filter((a) => a.status === 'Habis').length} habis
                  </span>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                <span className="text-stone-500">Total {lowStockAlerts.length} ukuran perlu dicek</span>
                <span className="font-bold text-rose-700 group-hover:translate-x-0.5 transition-transform">
                  Restock →
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Unified Full-Width Sticky Tab Navigation & Gudang Summary Bar */}
        <div className="sticky top-16 z-30 bg-stone-100/95 backdrop-blur-md py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="bg-white p-2 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
            {/* 5 Structured Navigation Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 xl:pb-0">
              {[
                {
                  id: 'pesanan' as const,
                  icon: <IconInbox className="w-4 h-4 shrink-0" />,
                  label: 'Pesanan Masuk',
                  sub: 'Konfirmasi WA & Resi',
                  badge: stats?.pending_orders || 0,
                  badgeColor: 'bg-amber-500 text-white',
                },
                {
                  id: 'stok' as const,
                  icon: <IconTag className="w-4 h-4 shrink-0" />,
                  label: 'Produk & Stok',
                  sub: 'Katalog, Warna & Ukuran',
                  badge: products.length,
                  badgeColor: 'bg-stone-200 text-zinc-800',
                },
                {
                  id: 'alerts' as const,
                  icon: <IconAlertCircle className="w-4 h-4 shrink-0" />,
                  label: 'Alert Stok Menipis',
                  sub: 'Restock cepat (≤ 5 pcs)',
                  badge: lowStockAlerts.length,
                  badgeColor: 'bg-rose-500 text-white',
                },
                {
                  id: 'tambah' as const,
                  icon: <IconPlus className="w-4 h-4 shrink-0" />,
                  label: 'Tambah Baju Baru',
                  sub: 'Upload model & warna',
                  badge: 0,
                  badgeColor: '',
                },
                {
                  id: 'ongkir' as const,
                  icon: <IconTruck className="w-4 h-4 shrink-0" />,
                  label: 'Tarif Ongkir Daerah',
                  sub: 'Ongkir flat provinsi',
                  badge: shippingRates.length,
                  badgeColor: 'bg-stone-200 text-zinc-800',
                },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2.5 rounded-xl text-left flex items-center gap-2.5 shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-zinc-700 hover:bg-stone-100 hover:text-zinc-900'
                    }`}
                  >
                    <span className="shrink-0">{tab.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold whitespace-nowrap">{tab.label}</span>
                        {tab.badge > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold leading-none ${
                              isActive ? 'bg-white/20 text-white' : tab.badgeColor
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </div>
                      <p
                        className={`hidden md:block text-[10px] whitespace-nowrap mt-0.5 ${
                          isActive ? 'text-stone-300' : 'text-stone-400'
                        }`}
                      >
                        {tab.sub}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Quick Warehouse Summary Pills & Unsaved Stock Save Button */}
            <div className="hidden sm:flex flex-wrap items-center gap-2 pl-1 xl:pl-3 border-t xl:border-t-0 xl:border-l border-stone-200/80 pt-2 xl:pt-0 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200/80 text-[11px] flex items-center gap-1.5">
                <span className="text-stone-500 font-medium">Total Stok Fisik:</span>
                <strong className="font-extrabold text-zinc-900">
                  {products.reduce((acc, p) => acc + (p.total_stock || 0), 0).toLocaleString('id-ID')} pcs
                </strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200/80 text-[11px] flex items-center gap-1.5">
                <span className="text-stone-500 font-medium">Foto Warna:</span>
                <strong className="font-extrabold text-zinc-900">
                  {products.reduce((acc, p) => acc + (p.images?.length || 0), 0)} foto
                </strong>
              </div>
              {unsavedStockEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSaveAllEditedStock(unsavedStockEntries)}
                  disabled={isSavingBatchStock}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-extrabold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <IconSave className="w-3.5 h-3.5" />
                  <span>
                    {isSavingBatchStock
                      ? 'Menyimpan...'
                      : `Simpan (${unsavedStockEntries.length})`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width Main Workspace Content */}
        <div className="w-full">
          <main className="w-full min-w-0">
            {/* ─────────────────────────────────────────
                TAB 1: PESANAN MASUK
                ───────────────────────────────────────── */}
            {activeTab === 'pesanan' && (
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200/90 shadow-sm space-y-5 animate-fade-in">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-zinc-900">
                      Daftar Pesanan Masuk
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Pantau pesanan dari checkout keranjang, konfirmasi pembayaran via WhatsApp, dan input nomor resi pengiriman.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <span className="px-3 py-1.5 rounded-xl bg-stone-100 text-zinc-800 text-xs font-bold">
                      Menampilkan {displayedOrders.length} pesanan
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExportOrdersCsv(displayedOrders)}
                      disabled={displayedOrders.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-zinc-800 text-xs font-bold cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Unduh rekap pesanan yang sedang ditampilkan sebagai file CSV (bisa dibuka di Excel / Google Sheets)"
                    >
                      <IconDownload className="w-3.5 h-3.5" />
                      <span>Unduh Rekap (CSV)</span>
                    </button>
                  </div>
                </div>

                {/* Expired Pending Orders Warning Banner */}
                {(stats?.expired_pending_orders || 0) > 0 && (
                  <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 text-xs text-orange-950">
                      <IconClock className="w-4 h-4 text-orange-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold">
                          {stats?.expired_pending_orders} pesanan belum dibayar lebih dari 24 jam
                        </p>
                        <p className="text-orange-900/80 mt-0.5">
                          Stok pakaian pada pesanan ini masih terkunci. Batalkan agar stok kembali tersedia untuk pembeli lain.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelExpiredOrders}
                      disabled={isCancellingExpired}
                      className="inline-flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer shadow-sm disabled:opacity-60"
                    >
                      <IconRefresh className={`w-3.5 h-3.5 ${isCancellingExpired ? 'animate-spin' : ''}`} />
                      <span>
                        {isCancellingExpired
                          ? 'Membatalkan...'
                          : 'Batalkan Pesanan Kedaluwarsa (>24 Jam) & Kembalikan Stok'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Filter & Search Bar */}
                <div className="bg-stone-50/90 p-3.5 rounded-2xl border border-stone-200/80 flex flex-col xl:flex-row justify-between gap-3 items-stretch xl:items-center">
                  <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                    {[
                      { label: 'Semua', val: 'ALL' },
                      { label: 'Menunggu WA', val: 'PENDING' },
                      { label: 'Lunas / Dikemas', val: 'CONFIRMED' },
                      { label: 'Sedang Dikirim', val: 'SHIPPED' },
                      { label: 'Selesai', val: 'COMPLETED' },
                      { label: 'Dibatalkan', val: 'CANCELLED' },
                    ].map((f) => (
                      <button
                        key={f.val}
                        type="button"
                        onClick={() => setOrderStatusFilter(f.val)}
                        className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          orderStatusFilter === f.val
                            ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-zinc-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full xl:w-72 shrink-0">
                    <input
                      type="text"
                      placeholder="Cari No. Pesanan / Nama / No. WA..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-2 rounded-xl border border-stone-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                      <IconSearch className="w-3.5 h-3.5" />
                    </span>
                    {orderSearch && (
                      <button
                        type="button"
                        onClick={() => setOrderSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-zinc-800 text-xs cursor-pointer"
                      >
                        <IconX className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold -mt-2">
                  <span className="text-[11px] text-stone-500 font-medium mr-1 inline-flex items-center gap-1">
                    <IconCalendar className="w-3.5 h-3.5" />
                    <span>Periode:</span>
                  </span>
                  {[
                    { label: 'Semua Waktu', val: 'ALL' as const },
                    { label: 'Hari Ini', val: 'TODAY' as const },
                    { label: '7 Hari Terakhir', val: '7DAYS' as const },
                    { label: 'Bulan Ini', val: 'MONTH' as const },
                  ].map((f) => (
                    <button
                      key={f.val}
                      type="button"
                      onClick={() => setOrderDateFilter(f.val)}
                      className={`px-3 py-1 rounded-full border transition-all cursor-pointer ${
                        orderDateFilter === f.val
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Orders List */}
                {isLoadingOrders ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-7 h-7 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-stone-500">Memuat data pesanan...</p>
                  </div>
                ) : displayedOrders.length === 0 ? (
                  <div className="py-16 text-center space-y-3 bg-stone-50/70 rounded-2xl border border-dashed border-stone-200">
                    <div className="w-14 h-14 bg-white rounded-2xl border border-stone-200 flex items-center justify-center mx-auto shadow-sm">
                      <IconInbox className="w-6 h-6 text-stone-400" />
                    </div>
                    <p className="text-sm font-bold text-zinc-800">Tidak ada pesanan yang sesuai.</p>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                      Pesanan dari customer yang melakukan checkout di katalog pakaian akan otomatis tampil secara realtime di halaman ini.
                    </p>
                    {(orderStatusFilter !== 'ALL' || orderSearch || orderDateFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderStatusFilter('ALL');
                          setOrderSearch('');
                          setOrderDateFilter('ALL');
                        }}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Tampilkan Semua Pesanan
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedOrders.map((o) => {
                      const statusColors = {
                        PENDING: {
                          bg: 'bg-amber-50',
                          text: 'text-amber-900',
                          border: 'border-amber-200',
                          label: 'Menunggu Konfirmasi WA',
                          step: 1,
                        },
                        CONFIRMED: {
                          bg: 'bg-blue-50',
                          text: 'text-blue-900',
                          border: 'border-blue-200',
                          label: 'Lunas & Sedang Dikemas',
                          step: 2,
                        },
                        SHIPPED: {
                          bg: 'bg-purple-50',
                          text: 'text-purple-900',
                          border: 'border-purple-200',
                          label: 'Sedang Dikirim Kurir',
                          step: 3,
                        },
                        COMPLETED: {
                          bg: 'bg-emerald-50',
                          text: 'text-emerald-900',
                          border: 'border-emerald-200',
                          label: 'Pesanan Selesai',
                          step: 4,
                        },
                        CANCELLED: {
                          bg: 'bg-rose-50',
                          text: 'text-rose-900',
                          border: 'border-rose-200',
                          label: 'Dibatalkan (Stok Kembali)',
                          step: 0,
                        },
                      }[o.status];

                      const cleanPhone = o.customer_phone.replace(/[^0-9]/g, '');
                      const formattedPhone = cleanPhone.startsWith('0')
                        ? '62' + cleanPhone.slice(1)
                        : cleanPhone;
                      const computedSubtotal =
                        Number(o.subtotal_items) ||
                        o.items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
                      const waItemsSummary = o.items
                        .map((i, idx) => `${idx + 1}. ${i.product_title} (${i.color} - Size ${i.size}) x ${i.quantity} pcs`)
                        .join('\n');
                      const waChatUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                        `Halo Kak ${o.customer_name},\n\nTerima kasih telah memesan di *DLRS — Katalog Pakaian*.\nBerikut rincian pesanan Anda (*${o.order_number}*):\n${waItemsSummary}\n\n• Subtotal Pakaian: Rp ${computedSubtotal.toLocaleString('id-ID')}\n• Ongkir (${o.shipping_province}): Rp ${Number(o.shipping_cost).toLocaleString('id-ID')}\n• *Total Tagihan: Rp ${Number(o.total_amount).toLocaleString('id-ID')}*\n\nAlamat Pengiriman:\n${o.shipping_address}, ${o.shipping_city}${o.shipping_district ? `, Kec. ${o.shipping_district}` : ''}, ${o.shipping_province}`
                      )}`;

                      return (
                        <div
                          key={o.id}
                          className="border border-stone-200/90 rounded-2xl p-4 sm:p-5 hover:border-stone-300 hover:shadow-sm transition-all bg-white space-y-4"
                        >
                          {/* Order Header & Stepper */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="font-mono font-extrabold text-zinc-900 text-sm bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                                {o.order_number}
                              </span>
                              {o.assigned_admin && (
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                    o.assigned_admin.includes('2')
                                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  }`}
                                  title="Admin yang menerima pesanan WhatsApp ini"
                                >
                                  {o.assigned_admin}
                                </span>
                              )}
                              <span
                                className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                              >
                                {statusColors.label}
                              </span>
                              {isOrderExpired(o) && (
                                <span
                                  className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-orange-100 text-orange-900 border-orange-300 inline-flex items-center gap-1"
                                  title="Pesanan belum dibayar lebih dari 24 jam dan masih mengunci stok"
                                >
                                  <IconClock className="w-3 h-3 text-orange-800" />
                                  <span>Belum Bayar &gt; 24 Jam (Stok Terkunci)</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-stone-500">
                              <span className="inline-flex items-center gap-1">
                                <IconCalendar className="w-3.5 h-3.5 text-stone-400" />
                                <span>
                                  {new Date(o.created_at).toLocaleString('id-ID', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Visual Order Progress Bar (for non-cancelled orders) */}
                          {o.status !== 'CANCELLED' && (
                            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-0.5">
                              {[
                                { s: 1, title: '1. Menunggu WA' },
                                { s: 2, title: '2. Lunas & Dikemas' },
                                { s: 3, title: '3. Dikirim Kurir' },
                                { s: 4, title: '4. Selesai' },
                              ].map((st) => {
                                const active = statusColors.step >= st.s;
                                return (
                                  <div key={st.s} className="space-y-1">
                                    <div
                                      className={`h-1.5 rounded-full transition-colors ${
                                        active ? 'bg-zinc-900' : 'bg-stone-200'
                                      }`}
                                    />
                                    <p
                                      className={`text-[10px] font-bold truncate ${
                                        active ? 'text-zinc-900' : 'text-stone-400'
                                      }`}
                                    >
                                      {st.title}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Order Details Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 text-xs">
                            {/* Column 1: Customer & Shipping Address (lg:col-span-5) */}
                            <div className="lg:col-span-5 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/70 space-y-2.5 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                      Data Penerima
                                    </p>
                                    <p className="font-extrabold text-zinc-900 text-sm">
                                      {o.customer_name}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handlePrintShippingLabel(o)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 text-zinc-800 border border-stone-200 font-semibold text-[11px] transition-colors cursor-pointer shadow-sm"
                                      title="Cetak slip label pengiriman untuk ditempel di paket"
                                    >
                                      <IconPrinter className="w-3.5 h-3.5" />
                                      <span>Cetak Label</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyShippingInfo(o)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 text-zinc-700 border border-stone-200 font-semibold text-[11px] transition-colors cursor-pointer shadow-sm"
                                      title="Salin nama, nomor HP, dan alamat lengkap untuk label pengiriman"
                                    >
                                      {copiedOrderNum === o.order_number ? (
                                        <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <IconCopy className="w-3.5 h-3.5" />
                                      )}
                                      <span>
                                        {copiedOrderNum === o.order_number ? 'Tersalin!' : 'Salin Alamat'}
                                      </span>
                                    </button>
                                    <a
                                      href={waChatUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366]/15 text-emerald-900 hover:bg-[#25D366]/25 border border-emerald-300/60 font-bold text-[11px] transition-colors"
                                      title="Hubungi pembeli via WhatsApp lengkap dengan rincian pesanan"
                                    >
                                      <IconWhatsApp className="w-3.5 h-3.5 text-emerald-800" />
                                      <span>WA</span>
                                      <IconExternalLink className="w-2.5 h-2.5 text-emerald-700" />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => setActiveQuickReplyOrder(o)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-sm"
                                      title="Buka template balasan cepat WhatsApp (Tagihan, Rekening, Pengingat Bayar, Resi Pengiriman)"
                                    >
                                      <IconMessageSquare className="w-3.5 h-3.5" />
                                      <span>Template WA</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="text-stone-600 bg-white p-3 rounded-xl border border-stone-200/70 space-y-1">
                                  <p className="font-bold text-zinc-800 inline-flex items-center gap-1">
                                    <IconMapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                    <span>
                                      {o.shipping_city}
                                      {o.shipping_district ? `, Kec. ${o.shipping_district}` : ''},{' '}
                                      {o.shipping_province}
                                    </span>
                                  </p>
                                  <p className="text-stone-600 leading-relaxed">{o.shipping_address}</p>
                                  <p className="text-[11px] text-stone-400 pt-0.5">
                                    No. HP/WA: <strong className="text-zinc-700">{o.customer_phone}</strong>
                                  </p>
                                  {o.notes && (
                                    <p className="text-amber-900 bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200/70 mt-1.5 font-medium italic inline-flex items-center gap-1">
                                      <IconMessageSquare className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                      <span>Catatan Pembeli: &quot;{o.notes}&quot;</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Column 2: Items Purchased (lg:col-span-4) */}
                            <div className="lg:col-span-4 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/70 space-y-2 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">
                                    Rincian Pakaian ({o.items.reduce((a, b) => a + b.quantity, 0)} pcs)
                                  </p>
                                </div>
                                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                                  {o.items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-start gap-2.5 bg-white p-2.5 rounded-xl border border-stone-200/70 text-xs"
                                    >
                                      <div className="min-w-0">
                                        <p className="font-bold text-zinc-900 truncate">
                                          {item.product_title}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                                          <span className="px-1.5 py-0.5 rounded bg-stone-100 text-zinc-700 font-semibold">
                                            {item.color}
                                          </span>
                                          <span className="px-1.5 py-0.5 rounded bg-stone-100 text-zinc-700 font-semibold">
                                            Size {item.size}
                                          </span>
                                          <span className="text-stone-500 font-bold">
                                            × {item.quantity} pcs
                                          </span>
                                        </div>
                                      </div>
                                      <span className="font-bold text-zinc-900 shrink-0 whitespace-nowrap">
                                        Rp {Number(item.subtotal).toLocaleString('id-ID')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Column 3: Payment Breakdown & Status Action Buttons (lg:col-span-3) */}
                            <div className="lg:col-span-3 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/70 flex flex-col justify-between space-y-3">
                              <div className="bg-white p-3 rounded-xl border border-stone-200/70 space-y-1.5">
                                <div className="flex justify-between text-stone-500 text-[11px]">
                                  <span>Subtotal Pakaian:</span>
                                  <span className="font-semibold text-zinc-800">
                                    Rp {computedSubtotal.toLocaleString('id-ID')}
                                  </span>
                                </div>
                                <div className="flex justify-between text-stone-500 text-[11px]">
                                  <span>Ongkir ({o.shipping_province}):</span>
                                  <span className="font-semibold text-zinc-800">
                                    Rp {Number(o.shipping_cost).toLocaleString('id-ID')}
                                  </span>
                                </div>
                                <div className="flex justify-between items-baseline font-extrabold text-zinc-900 text-sm pt-1.5 border-t border-stone-100">
                                  <span>Total Tagihan:</span>
                                  <span className="text-emerald-700">
                                    Rp {Number(o.total_amount).toLocaleString('id-ID')}
                                  </span>
                                </div>
                              </div>

                              {/* Action Buttons depending on status */}
                              <div className="space-y-2">
                                {o.status === 'PENDING' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateOrderStatus(o.order_number, 'CONFIRMED')}
                                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer inline-flex items-center justify-center gap-1.5"
                                    >
                                      <IconCheck className="w-3.5 h-3.5" />
                                      <span>Konfirmasi Lunas & Dikemas</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (
                                          confirm(
                                            'Batalkan pesanan ini? Stok baju akan otomatis dikembalikan ke katalog.'
                                          )
                                        ) {
                                          handleUpdateOrderStatus(o.order_number, 'CANCELLED');
                                        }
                                      }}
                                      className="w-full py-2 px-3 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl font-semibold text-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                                    >
                                      <IconX className="w-3.5 h-3.5" />
                                      <span>Batalkan (Stok Kembali)</span>
                                    </button>
                                  </>
                                )}

                                {o.status === 'CONFIRMED' && (
                                  <div className="space-y-2.5">
                                    {/* Smart Foto / Scan Struk Resi Box */}
                                    <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200/90 space-y-2">
                                      <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-[10px] font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                                          <IconCamera className="w-3.5 h-3.5 text-purple-700" />
                                          <span>Scan / Foto Struk Resi Otomatis</span>
                                        </span>
                                      </div>

                                      <label
                                        className={`w-full py-2 px-3 rounded-xl border border-dashed border-purple-400 bg-white hover:bg-purple-100/50 text-purple-900 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                                          scanningResiOrder === o.order_number ? 'opacity-60 pointer-events-none' : ''
                                        }`}
                                      >
                                        {scanningResiOrder === o.order_number ? (
                                          <IconRefresh className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <IconCamera className="w-3.5 h-3.5" />
                                        )}
                                        <span>
                                          {scanningResiOrder === o.order_number
                                            ? 'Memindai Struk Resi...'
                                            : 'Pilih / Foto Struk Resi Ekspedisi'}
                                        </span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          capture="environment"
                                          className="hidden"
                                          disabled={scanningResiOrder === o.order_number}
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              handleScanAndUploadReceiptImage(o, e.target.files[0]);
                                              e.target.value = '';
                                            }
                                          }}
                                        />
                                      </label>

                                      <label className="flex items-center gap-1.5 text-[10px] text-purple-900 font-medium cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={autoMarkShippedOnScan}
                                          onChange={(e) => setAutoMarkShippedOnScan(e.target.checked)}
                                          className="rounded border-purple-300 text-purple-700 focus:ring-purple-600 cursor-pointer"
                                        />
                                        <span>Otomatis tandai &ldquo;Sedang Dikirim&rdquo; jika resi terbaca</span>
                                      </label>

                                      {resiScanStatus[o.order_number] && (
                                        <div
                                          className={`p-2 rounded-lg text-[10px] font-semibold leading-snug ${
                                            resiScanStatus[o.order_number].type === 'scanning'
                                              ? 'bg-amber-50 text-amber-900 border border-amber-200 animate-pulse'
                                              : resiScanStatus[o.order_number].type === 'success'
                                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                              : 'bg-white text-stone-700 border border-stone-200'
                                          }`}
                                        >
                                          {resiScanStatus[o.order_number].text}
                                        </div>
                                      )}

                                      {o.tracking_receipt_url && (
                                        <div className="flex items-center gap-2 pt-1 border-t border-purple-200/60">
                                          <a
                                            href={o.tracking_receipt_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 rounded-lg overflow-hidden border border-purple-300 bg-white shrink-0"
                                          >
                                            <img
                                              src={o.tracking_receipt_url}
                                              alt="Struk Resi"
                                              className="w-full h-full object-cover"
                                            />
                                          </a>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-purple-950 truncate inline-flex items-center gap-1">
                                              <IconCheck className="w-3 h-3 text-purple-800" />
                                              <span>Foto Struk Tersimpan</span>
                                            </p>
                                            <a
                                              href={o.tracking_receipt_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[10px] text-purple-700 underline font-semibold inline-flex items-center gap-0.5"
                                            >
                                              <span>Lihat Foto Struk</span>
                                              <IconExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-1">
                                      <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider">
                                        Atau Ketik / Cek No. Resi Ekspedisi:
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="Ketik resi dari JNE / J&T / SiCepat / SPX..."
                                        value={editingResi[o.order_number] ?? (o.tracking_number || '')}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setEditingResi({
                                            ...editingResi,
                                            [o.order_number]: val,
                                          });
                                          const guessed = detectCourierClient(val);
                                          if (guessed && !editingCourier[o.order_number]) {
                                            setEditingCourier((prev) => ({ ...prev, [o.order_number]: guessed }));
                                          }
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                                      />
                                    </div>
                                    {renderCourierChips(o)}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateOrderStatus(
                                          o.order_number,
                                          'SHIPPED',
                                          editingResi[o.order_number] ?? o.tracking_number,
                                          editingCourier[o.order_number] ||
                                            detectCourierClient(editingResi[o.order_number] ?? o.tracking_number ?? '') ||
                                            o.shipping_courier ||
                                            ''
                                        )
                                      }
                                      className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-sm inline-flex items-center justify-center gap-1.5"
                                    >
                                      <IconTruck className="w-3.5 h-3.5" />
                                      <span>Tandai Sedang Dikirim</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (
                                          confirm(
                                            `Batalkan pesanan ${o.order_number}? Stok pakaian yang dipesan akan otomatis dikembalikan ke etalase.`
                                          )
                                        ) {
                                          handleUpdateOrderStatus(o.order_number, 'CANCELLED');
                                        }
                                      }}
                                      className="w-full py-1.5 px-3 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center justify-center gap-1"
                                    >
                                      <IconX className="w-3 h-3" />
                                      <span>Batalkan (Stok Kembali)</span>
                                    </button>
                                  </div>
                                )}

                                {o.status === 'SHIPPED' && (
                                  <div className="space-y-2">
                                    <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] text-purple-700 font-bold uppercase">
                                          No. Resi Kurir:
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <label className="text-[10px] font-bold text-purple-800 hover:underline cursor-pointer flex items-center gap-1">
                                            <IconCamera className="w-3 h-3 text-purple-800" />
                                            <span>
                                              {scanningResiOrder === o.order_number ? 'Memindai...' : 'Scan Foto Resi'}
                                            </span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              capture="environment"
                                              className="hidden"
                                              disabled={scanningResiOrder === o.order_number}
                                              onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                  handleScanAndUploadReceiptImage(o, e.target.files[0]);
                                                  e.target.value = '';
                                                }
                                              }}
                                            />
                                          </label>
                                          <span className="text-purple-300">•</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (editingShippedResiOrder === o.order_number) {
                                                setEditingShippedResiOrder(null);
                                              } else {
                                                setEditingResi((prev) => ({
                                                  ...prev,
                                                  [o.order_number]: o.tracking_number || '',
                                                }));
                                                setEditingCourier((prev) => ({
                                                  ...prev,
                                                  [o.order_number]: o.shipping_courier || '',
                                                }));
                                                setEditingShippedResiOrder(o.order_number);
                                              }
                                            }}
                                            className="text-[10px] font-bold text-purple-800 hover:underline cursor-pointer inline-flex items-center gap-1"
                                          >
                                            {editingShippedResiOrder === o.order_number ? (
                                              'Batal'
                                            ) : (
                                              <>
                                                <IconPencil className="w-2.5 h-2.5" />
                                                <span>Ubah Resi</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      {editingShippedResiOrder === o.order_number ? (
                                        <div className="space-y-2 pt-1">
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="text"
                                            value={editingResi[o.order_number] ?? (o.tracking_number || '')}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setEditingResi({
                                                ...editingResi,
                                                [o.order_number]: val,
                                              });
                                              const guessed = detectCourierClient(val);
                                              if (guessed) {
                                                setEditingCourier((prev) => ({ ...prev, [o.order_number]: guessed }));
                                              }
                                            }}
                                            placeholder="Masukkan No. Resi baru..."
                                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-purple-300 bg-white text-xs font-mono font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-600"
                                          />
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              await handleUpdateOrderStatus(
                                                o.order_number,
                                                'SHIPPED',
                                                editingResi[o.order_number] ?? o.tracking_number,
                                                editingCourier[o.order_number] ??
                                                  o.shipping_courier ??
                                                  ''
                                              );
                                              setEditingShippedResiOrder(null);
                                            }}
                                            className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[11px] font-bold cursor-pointer shrink-0"
                                          >
                                            Simpan
                                          </button>
                                        </div>
                                        {renderCourierChips(o)}
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {o.shipping_courier && (
                                            <span className="px-2 py-0.5 rounded-md bg-purple-700 text-white text-[10px] font-bold">
                                              {o.shipping_courier}
                                            </span>
                                          )}
                                          <p className="font-mono font-extrabold text-purple-950 text-xs">
                                            {o.tracking_number || '—'}
                                          </p>
                                        </div>
                                      )}

                                      {resiScanStatus[o.order_number] && (
                                        <div
                                          className={`p-2 rounded-lg text-[10px] font-semibold leading-snug ${
                                            resiScanStatus[o.order_number].type === 'scanning'
                                              ? 'bg-amber-50 text-amber-900 border border-amber-200 animate-pulse'
                                              : resiScanStatus[o.order_number].type === 'success'
                                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                              : 'bg-white text-stone-700 border border-stone-200'
                                          }`}
                                        >
                                          {resiScanStatus[o.order_number].text}
                                        </div>
                                      )}

                                      {o.tracking_receipt_url && (
                                        <div className="flex items-center gap-2 pt-1.5 border-t border-purple-200/70">
                                          <a
                                            href={o.tracking_receipt_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 rounded-lg overflow-hidden border border-purple-300 bg-white shrink-0"
                                          >
                                            <img
                                              src={o.tracking_receipt_url}
                                              alt="Struk Resi"
                                              className="w-full h-full object-cover"
                                            />
                                          </a>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-purple-950 truncate inline-flex items-center gap-1">
                                              <IconPhoto className="w-3 h-3 text-purple-800" />
                                              <span>Bukti Foto Struk Resi</span>
                                            </p>
                                            <a
                                              href={o.tracking_receipt_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[10px] text-purple-700 underline font-semibold inline-flex items-center gap-0.5"
                                            >
                                              <span>Buka Foto Struk</span>
                                              <IconExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <a
                                      href={`https://wa.me/${
                                        cleanPhone.startsWith('0')
                                          ? '62' + cleanPhone.slice(1)
                                          : cleanPhone
                                      }?text=${encodeURIComponent(
                                        `Halo Kak ${o.customer_name},\n\nPesanan pakaian Anda (*${o.order_number}*) telah kami kirimkan${o.shipping_courier ? ` melalui *${o.shipping_courier}*` : ''} dengan nomor resi kurir: *${o.tracking_number || 'Terlampir di Foto Struk'}*.\n\nAnda dapat memantau status & melihat foto bukti struk resi di tautan:\n${
                                          typeof window !== 'undefined'
                                            ? window.location.origin
                                            : 'http://localhost'
                                        }/lacak-pesanan?order=${o.order_number}\n\nTerima kasih telah berbelanja di DLRS — Katalog Pakaian!`
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full py-2 px-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                      <IconWhatsApp className="w-3.5 h-3.5" />
                                      <span>Kirim Resi ke WA Pembeli</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateOrderStatus(o.order_number, 'COMPLETED')
                                      }
                                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-sm inline-flex items-center justify-center gap-1.5"
                                    >
                                      <IconCheck className="w-3.5 h-3.5" />
                                      <span>Tandai Pesanan Selesai</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────
                TAB 2: PRODUK & STOK
                ───────────────────────────────────────── */}
            {activeTab === 'stok' && (
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200/90 shadow-sm space-y-5 animate-fade-in">
                {/* Header Title & CTA */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-stone-100">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-zinc-900">
                      Kelola Katalog & Stok Pakaian
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Struktur matriks stok terkelompok per variasi warna & ukuran pakaian. Klik tombol plus/minus untuk mengatur stok gudang.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setHideZeroStockSizes(!hideZeroStockSizes)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        hideZeroStockSizes
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                      title="Sembunyikan kotak ukuran yang stoknya 0 agar tampilan lebih ringkas"
                    >
                      {hideZeroStockSizes ? (
                        <IconEyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <IconLayers className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {hideZeroStockSizes ? 'Fokus Ukuran Berstok (> 0)' : 'Tampil Semua 8 Ukuran'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('tambah')}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <IconPlus className="w-3.5 h-3.5" />
                      <span>Tambah Baju Baru</span>
                    </button>
                  </div>
                </div>

                {/* Unsaved Stock Changes Banner */}
                {unsavedStockEntries.length > 0 && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm animate-fade-in">
                    <div className="flex items-center gap-2.5 text-xs text-amber-950 font-bold">
                      <span className="w-6 h-6 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center text-xs font-extrabold">
                        {unsavedStockEntries.length}
                      </span>
                      <span>
                        Anda memiliki {unsavedStockEntries.length} perubahan angka stok yang belum disimpan.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingStock({})}
                        className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                      >
                        <IconRefresh className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                      <button
                        type="button"
                        disabled={isSavingBatchStock}
                        onClick={() => handleSaveAllEditedStock(unsavedStockEntries)}
                        className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <IconSave className="w-3.5 h-3.5" />
                        <span>{isSavingBatchStock ? 'Menyimpan...' : 'Simpan Semua Perubahan Stok'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Filter, Search & Sorting Bar */}
                <div className="bg-stone-50/90 p-3.5 rounded-2xl border border-stone-200/80 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
                  {/* Search input */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Cari nama pakaian, kategori, atau warna..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-2 rounded-xl border border-stone-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-stone-400"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                      <IconSearch className="w-3.5 h-3.5" />
                    </span>
                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => setProductSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                      >
                        <IconX className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Filters & Sorter */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={productCategoryFilter}
                      onChange={(e) => setProductCategoryFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="ALL">Semua Kategori ({categories.length})</option>
                      {categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={productStockFilter}
                      onChange={(e) => setProductStockFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="ALL">Semua Status Stok</option>
                      <option value="in_stock">Tersedia (&gt; 0)</option>
                      <option value="low_stock">Menipis (Varian ≤ 5 / Total ≤ 10)</option>
                      <option value="out_of_stock">Stok Habis (0)</option>
                      <option value="draft">Draft (Disembunyikan)</option>
                    </select>

                    <select
                      value={productSort}
                      onChange={(e) => setProductSort(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="newest">Urutan: Terbaru</option>
                      <option value="oldest">Urutan: Terlama</option>
                      <option value="title_asc">Nama (A - Z)</option>
                      <option value="title_desc">Nama (Z - A)</option>
                      <option value="stock_high">Stok Terbanyak</option>
                      <option value="stock_low">Stok Tersedikit</option>
                    </select>

                    {(productSearch ||
                      productCategoryFilter !== 'ALL' ||
                      productStockFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch('');
                          setProductCategoryFilter('ALL');
                          setProductStockFilter('ALL');
                        }}
                        className="px-3 py-2 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* Bulk Action Bar (When >= 1 item selected) */}
                {selectedProductIds.length > 0 && (
                  <div className="bg-zinc-900 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-fade-in">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-xs font-bold">
                        {selectedProductIds.length} pakaian dipilih
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <button
                        type="button"
                        disabled={isPerformingBulkAction}
                        onClick={() => handleBulkAction('activate')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <IconCheck className="w-3.5 h-3.5" />
                        <span>Aktifkan (Publish)</span>
                      </button>
                      <button
                        type="button"
                        disabled={isPerformingBulkAction}
                        onClick={() => handleBulkAction('deactivate')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <IconPackage className="w-3.5 h-3.5" />
                        <span>Jadikan Draft</span>
                      </button>
                      <button
                        type="button"
                        disabled={isPerformingBulkAction}
                        onClick={() => handleBulkAction('delete')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                        <span>Hapus Terpilih</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProductIds([])}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-stone-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <IconX className="w-3 h-3" />
                        <span>Batal</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Bulk Action Message Alert */}
                {bulkActionMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold border flex items-center justify-between ${
                      bulkActionMsg.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <span>{bulkActionMsg.text}</span>
                    <button
                      type="button"
                      onClick={() => setBulkActionMsg(null)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Select All & Expand/Collapse All Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 px-1">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-700 select-none">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-stone-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                    />
                    <span>Pilih Semua ({filteredProducts.length} pakaian)</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const allCollapsed = filteredProducts.every(
                          (p) => expandedStockProducts[p.id] === false
                        );
                        const nextMap: { [id: number]: boolean } = {};
                        filteredProducts.forEach((p) => {
                          nextMap[p.id] = allCollapsed;
                        });
                        setExpandedStockProducts(nextMap);
                      }}
                      className="text-zinc-700 hover:text-zinc-900 font-bold underline cursor-pointer"
                    >
                      {filteredProducts.every((p) => expandedStockProducts[p.id] === false)
                        ? '▼ Buka Semua Tabel Stok'
                        : '▲ Ringkas Semua Kartu'}
                    </button>
                    <span className="text-stone-300">|</span>
                    <span>
                      Menampilkan <strong>{filteredProducts.length}</strong> dari {products.length} produk
                    </span>
                  </div>
                </div>

                {isLoadingProducts ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-7 h-7 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-stone-500">Memuat daftar pakaian...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-16 text-center space-y-3 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    <IconSearch className="w-8 h-8 text-stone-300 stroke-1 mx-auto block mb-1" />
                    <p className="text-sm font-semibold text-zinc-800">
                      Tidak ada produk yang sesuai dengan filter.
                    </p>
                    <p className="text-xs text-stone-400">
                      Coba ubah kata kunci pencarian atau reset filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch('');
                        setProductCategoryFilter('ALL');
                        setProductStockFilter('ALL');
                      }}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Lihat Semua Produk
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProducts.map((p) => {
                      const isChecked = selectedProductIds.includes(p.id);
                      const isExpanded = expandedStockProducts[p.id] ?? true;

                      // Build color groups cleanly from variants_by_color (with fallback to grouping p.variants)
                      const colorGroups: VariantByColorItem[] =
                        p.variants_by_color && p.variants_by_color.length > 0
                          ? p.variants_by_color
                          : Object.values(
                              (p.variants || []).reduce((acc, v) => {
                                if (!acc[v.color]) {
                                  acc[v.color] = {
                                    color: v.color,
                                    color_image: null,
                                    image_id: null,
                                    sizes: [],
                                  };
                                }
                                acc[v.color].sizes.push({
                                  id: v.id,
                                  size: v.size,
                                  stock_quantity: v.stock_quantity,
                                  is_available: v.is_available,
                                });
                                return acc;
                              }, {} as Record<string, VariantByColorItem>)
                            );

                      const productUnsavedEntries = (p.variants || [])
                        .filter(
                          (v) =>
                            editingStock[v.id] !== undefined &&
                            editingStock[v.id] !== v.stock_quantity
                        )
                        .map((v) => ({ variantId: v.id, newStock: editingStock[v.id] }));

                      return (
                        <div
                          key={p.id}
                          className={`rounded-2xl border transition-all overflow-hidden ${
                            isChecked
                              ? 'border-amber-400 bg-amber-50/20 shadow-sm'
                              : p.is_active === false
                              ? 'border-stone-200 bg-stone-50/60 opacity-90'
                              : 'border-stone-200/90 bg-white hover:border-stone-300 shadow-sm'
                          }`}
                        >
                          {/* TOP ZONE: Product Header, Meta & Action Toolbar */}
                          <div className="p-4 sm:p-5 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                            {/* Left: Checkbox + Thumbnail + Product Details */}
                            <div className="flex gap-3.5 sm:gap-4 items-start min-w-0 flex-1">
                              <div className="pt-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectProduct(p.id)}
                                  className="w-4 h-4 rounded border-stone-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                                />
                              </div>

                              {/* Thumbnail */}
                              <div className="relative w-16 h-20 sm:w-20 sm:h-24 bg-stone-100 rounded-xl overflow-hidden shrink-0 border border-stone-200 shadow-sm">
                                {p.primary_image ? (
                                  <Image
                                    src={p.primary_image}
                                    alt={p.title}
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">
                                    Foto
                                  </div>
                                )}
                              </div>

                              {/* Title, Price, Badges & Color Pills */}
                              <div className="space-y-2 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/produk/${p.slug}`}
                                    target="_blank"
                                    className="font-extrabold text-zinc-900 text-sm sm:text-base hover:underline flex items-center gap-1"
                                    title="Lihat halaman produk di web (tab baru)"
                                  >
                                    <span>{p.title}</span>
                                    <IconExternalLink className="w-3 h-3 text-stone-400" />
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleProductStatus(p)}
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                      p.is_active !== false
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-stone-200 text-stone-700 border-stone-300 hover:bg-stone-300'
                                    }`}
                                    title="Klik untuk ubah status Aktif/Draft produk"
                                  >
                                    <span className="inline-flex items-center gap-1.5">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          p.is_active !== false ? 'bg-emerald-500' : 'bg-stone-400'
                                        }`}
                                      />
                                      <span>{p.is_active !== false ? 'Aktif' : 'Draft (Sembunyi)'}</span>
                                    </span>
                                  </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-extrabold text-emerald-700 text-sm">
                                    {p.formatted_price}
                                  </span>
                                  <span className="text-stone-300">·</span>
                                  <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-200/70">
                                    {p.category?.name || 'Umum'}
                                  </span>
                                  <span className="text-stone-300">·</span>
                                  <span
                                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                      p.total_stock === 0
                                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                                        : p.total_stock <= 15
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-emerald-50/70 text-emerald-800 border-emerald-200'
                                    }`}
                                  >
                                    Total Stok: {p.total_stock} pcs
                                  </span>
                                </div>

                                {/* Color summary chips */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {colorGroups.map((c) => {
                                    const colorTotal = c.sizes.reduce(
                                      (acc, s) => acc + (editingStock[s.id] ?? s.stock_quantity),
                                      0
                                    );
                                    return (
                                      <div
                                        key={c.color}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-stone-50 border border-stone-200/90 text-[11px]"
                                      >
                                        {c.color_image ? (
                                          <img
                                            src={c.color_image}
                                            alt={c.color}
                                            className="w-3.5 h-3.5 rounded-full object-cover border border-black/15"
                                          />
                                        ) : (
                                          <span className="w-2.5 h-2.5 rounded-full bg-stone-300 inline-block" />
                                        )}
                                        <span className="font-semibold text-zinc-800">{c.color}</span>
                                        <span className="text-[10px] text-stone-500 font-bold">
                                          ({colorTotal})
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Right: Action Buttons Toolbar */}
                            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                              <Link
                                href={`/produk/${p.slug}`}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold transition-colors shadow-sm"
                              >
                                <IconExternalLink className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(p)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                              >
                                <IconPencil className="w-3.5 h-3.5" />
                                <span>Edit Info</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveColorModalProduct(p);
                                  setColorModalSuccess(null);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                              >
                                <IconPhoto className="w-3.5 h-3.5" />
                                <span>Foto Warna ({p.images?.length || 0})</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedStockProducts((prev) => ({
                                    ...prev,
                                    [p.id]: !isExpanded,
                                  }))
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm ${
                                  isExpanded
                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                    : 'bg-white text-zinc-800 border-stone-300 hover:bg-stone-100'
                                }`}
                              >
                                <IconLayers className="w-3.5 h-3.5" />
                                <span>{isExpanded ? 'Tutup Stok ▲' : 'Atur Stok ▼'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSingleProduct(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                title="Hapus produk ini"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* BOTTOM ZONE: Structured Stock Matrix Grouped by Color */}
                          {isExpanded && (
                            <div className="bg-stone-50/80 border-t border-stone-200/80 p-3.5 sm:p-4 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                <span className="font-bold text-stone-500 uppercase tracking-wider">
                                  Matriks Stok Ukuran per Variasi Warna ({colorGroups.length} Warna):
                                </span>
                                {productUnsavedEntries.length > 0 && (
                                  <button
                                    type="button"
                                    disabled={isSavingBatchStock}
                                    onClick={() => handleSaveAllEditedStock(productUnsavedEntries)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-extrabold text-xs cursor-pointer shadow-sm"
                                  >
                                    <IconSave className="w-3.5 h-3.5" />
                                    <span>Simpan {productUnsavedEntries.length} Perubahan pada Baju Ini</span>
                                  </button>
                                )}
                              </div>

                              <div className="space-y-2.5">
                                {colorGroups.map((cGroup) => {
                                  const visibleSizes = hideZeroStockSizes
                                    ? cGroup.sizes.filter(
                                        (s) =>
                                          (editingStock[s.id] ?? s.stock_quantity) > 0 ||
                                          editingStock[s.id] !== undefined
                                      )
                                    : cGroup.sizes;

                                  const colorStockSum = cGroup.sizes.reduce(
                                    (sum, s) => sum + (editingStock[s.id] ?? s.stock_quantity),
                                    0
                                  );

                                  return (
                                    <div
                                      key={cGroup.color}
                                      className="bg-white rounded-xl border border-stone-200/90 p-3 space-y-2.5"
                                    >
                                      {/* Color Row Header */}
                                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-100">
                                        <div className="flex items-center gap-2.5">
                                          {cGroup.color_image ? (
                                            <img
                                              src={cGroup.color_image}
                                              alt={cGroup.color}
                                              className="w-7 h-7 rounded-lg object-cover border border-stone-300 shrink-0"
                                            />
                                          ) : (
                                            <div className="w-7 h-7 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                                              <IconPalette className="w-3.5 h-3.5 text-stone-400" />
                                            </div>
                                          )}
                                          <div>
                                            <span className="font-extrabold text-zinc-900 text-xs">
                                              Warna: {cGroup.color}
                                            </span>
                                            <span className="ml-2 text-[11px] font-semibold text-stone-500">
                                              (Subtotal: <strong className="text-zinc-800">{colorStockSum} pcs</strong>)
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                          <button
                                            type="button"
                                            disabled={isSavingBatchStock}
                                            onClick={() => handleAdjustColorGroupStock(cGroup.sizes, 'add10')}
                                            className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px] transition-colors cursor-pointer disabled:opacity-50"
                                            title={`Tambah +10 pcs ke seluruh ukuran untuk warna ${cGroup.color}`}
                                          >
                                            +10 Semua Size
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isSavingBatchStock}
                                            onClick={() => {
                                              if (
                                                confirm(
                                                  `Kosongkan stok (Set 0 pcs) untuk seluruh ukuran pada warna "${cGroup.color}"?`
                                                )
                                              ) {
                                                handleAdjustColorGroupStock(cGroup.sizes, 'zero');
                                              }
                                            }}
                                            className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] transition-colors cursor-pointer disabled:opacity-50"
                                            title={`Kosongkan stok untuk warna ${cGroup.color}`}
                                          >
                                            Habiskan Warna (0)
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveColorModalProduct(p);
                                              setColorModalSuccess(null);
                                              setColorModalError(null);
                                            }}
                                            className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer ml-1 inline-flex items-center gap-1"
                                          >
                                            {cGroup.color_image ? (
                                              <>
                                                <IconCamera className="w-3 h-3 text-amber-700" />
                                                <span>Ganti Foto Warna</span>
                                              </>
                                            ) : (
                                              <>
                                                <IconPhoto className="w-3 h-3 text-amber-700" />
                                                <span>Upload Foto Warna</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      {/* 8-Size Responsive Grid */}
                                      {visibleSizes.length === 0 ? (
                                        <div className="py-2 text-[11px] text-stone-400 italic flex items-center justify-between">
                                          <span>Semua ukuran pada warna ini memiliki stok 0 pcs.</span>
                                          <button
                                            type="button"
                                            onClick={() => setHideZeroStockSizes(false)}
                                            className="text-zinc-800 font-bold underline cursor-pointer not-italic"
                                          >
                                            Tampilkan Semua Ukuran
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                          {visibleSizes.map((v) => {
                                            const currentVal = editingStock[v.id] ?? v.stock_quantity;
                                            const isDirty =
                                              editingStock[v.id] !== undefined &&
                                              editingStock[v.id] !== v.stock_quantity;
                                            const isUpdating = stockUpdatingId === v.id;

                                            return (
                                              <div
                                                key={v.id}
                                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                                                  isDirty
                                                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30 shadow-sm'
                                                    : currentVal === 0
                                                    ? 'bg-stone-50/70 border-stone-200 text-stone-400'
                                                    : currentVal <= 5
                                                    ? 'bg-amber-50/40 border-amber-200 text-amber-950'
                                                    : 'bg-stone-50/40 border-stone-200 text-zinc-900 hover:border-stone-300'
                                                }`}
                                              >
                                                {/* Left: Size & Color Label */}
                                                <div className="min-w-0 pr-1">
                                                  <div className="flex items-center gap-1.5">
                                                    <span
                                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                                        currentVal === 0
                                                          ? 'bg-rose-400'
                                                          : currentVal <= 5
                                                          ? 'bg-amber-400'
                                                          : 'bg-emerald-500'
                                                      }`}
                                                    />
                                                    <span
                                                      className={`font-extrabold text-xs whitespace-nowrap ${
                                                        currentVal === 0 && !isDirty
                                                          ? 'text-stone-500'
                                                          : 'text-zinc-900'
                                                      }`}
                                                    >
                                                      {v.size}
                                                    </span>
                                                  </div>
                                                  <span
                                                    className="block text-[10.5px] text-stone-500 truncate mt-0.5"
                                                    title={cGroup.color}
                                                  >
                                                    {cGroup.color}
                                                  </span>
                                                </div>

                                                {/* Right: [-] [Input] [+] [Simpan] */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setEditingStock({
                                                        ...editingStock,
                                                        [v.id]: Math.max(0, currentVal - 1),
                                                      })
                                                    }
                                                    className="w-6 h-7 bg-white hover:bg-stone-100 text-zinc-800 rounded-lg border border-stone-300 text-xs font-extrabold flex items-center justify-center cursor-pointer shrink-0 shadow-sm"
                                                    title="Kurang 1"
                                                  >
                                                    -
                                                  </button>
                                                  <input
                                                    type="number"
                                                    min={0}
                                                    value={currentVal}
                                                    onChange={(e) =>
                                                      setEditingStock({
                                                        ...editingStock,
                                                        [v.id]: Math.max(
                                                          0,
                                                          parseInt(e.target.value) || 0
                                                        ),
                                                      })
                                                    }
                                                    className="w-12 px-1 py-1 text-center font-extrabold bg-white rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-zinc-900 text-xs text-zinc-900"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setEditingStock({
                                                        ...editingStock,
                                                        [v.id]: currentVal + 1,
                                                      })
                                                    }
                                                    className="w-6 h-7 bg-white hover:bg-stone-100 text-zinc-800 rounded-lg border border-stone-300 text-xs font-extrabold flex items-center justify-center cursor-pointer shrink-0 shadow-sm"
                                                    title="Tambah 1"
                                                  >
                                                    +
                                                  </button>
                                                  <button
                                                    type="button"
                                                    disabled={isUpdating}
                                                    onClick={() => handleUpdateStock(v.id, currentVal)}
                                                    className={`ml-0.5 px-2.5 h-7 rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0 ${
                                                      isDirty
                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                                        : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                                                    }`}
                                                  >
                                                    {isUpdating ? '...' : 'Simpan'}
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────
                TAB 3: ALERT STOK MENIPIS & HABIS
                ───────────────────────────────────────── */}
            {activeTab === 'alerts' && (
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200/90 shadow-sm space-y-5 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-stone-100">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-zinc-900 flex flex-wrap items-center gap-2">
                      <IconAlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>Peringatan Stok Variasi Menipis & Habis</span>
                      {lowStockAlerts.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-extrabold">
                          {lowStockAlerts.length} Variasi Ukuran
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Daftar variasi pakaian yang hampir habis (1–5 pcs) atau stok kosong (0 pcs), dikelompokkan rapi per model baju.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchLowStockAlerts(false)}
                    className="self-start sm:self-auto px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-zinc-800 text-xs font-bold rounded-xl border border-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <IconRefresh className="w-3.5 h-3.5" />
                    <span>Refresh Alert</span>
                  </button>
                </div>

                {/* Interactive Filter Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAlertStatusFilter('ALL')}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      alertStatusFilter === 'ALL'
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-zinc-900 hover:bg-stone-100'
                    }`}
                  >
                    <div>
                      <p
                        className={`text-xs font-semibold ${
                          alertStatusFilter === 'ALL' ? 'text-stone-300' : 'text-stone-500'
                        }`}
                      >
                        Semua Peringatan Stok
                      </p>
                      <p className="text-xl font-extrabold mt-0.5">
                        {lowStockAlerts.length}{' '}
                        <span className="text-xs font-normal opacity-80">variasi</span>
                      </p>
                    </div>
                    <IconInbox className="w-6 h-6 text-stone-400 stroke-1" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setAlertStatusFilter('Menipis')}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      alertStatusFilter === 'Menipis'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-amber-50/80 border-amber-200 text-amber-950 hover:bg-amber-100/70'
                    }`}
                  >
                    <div>
                      <p
                        className={`text-xs font-semibold ${
                          alertStatusFilter === 'Menipis' ? 'text-amber-50' : 'text-amber-800'
                        }`}
                      >
                        Stok Menipis (1 – 5 pcs)
                      </p>
                      <p className="text-xl font-extrabold mt-0.5">
                        {lowStockAlerts.filter((a) => a.status === 'Menipis').length}{' '}
                        <span className="text-xs font-normal opacity-80">variasi</span>
                      </p>
                    </div>
                    <IconAlertTriangle className="w-6 h-6 text-amber-500 stroke-1" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setAlertStatusFilter('Habis')}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      alertStatusFilter === 'Habis'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-rose-50/80 border-rose-200 text-rose-950 hover:bg-rose-100/70'
                    }`}
                  >
                    <div>
                      <p
                        className={`text-xs font-semibold ${
                          alertStatusFilter === 'Habis' ? 'text-rose-100' : 'text-rose-800'
                        }`}
                      >
                        Stok Habis (0 pcs)
                      </p>
                      <p className="text-xl font-extrabold mt-0.5">
                        {lowStockAlerts.filter((a) => a.status === 'Habis').length}{' '}
                        <span className="text-xs font-normal opacity-80">variasi</span>
                      </p>
                    </div>
                    <IconAlertCircle className="w-6 h-6 text-rose-500 stroke-1" />
                  </button>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-stone-50/90 p-3.5 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Cari nama baju, warna, ukuran, atau kategori..."
                      value={alertSearch}
                      onChange={(e) => setAlertSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-2 rounded-xl border border-stone-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                      <IconSearch className="w-3.5 h-3.5" />
                    </span>
                    {alertSearch && (
                      <button
                        type="button"
                        onClick={() => setAlertSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-zinc-800 text-xs cursor-pointer"
                      >
                        <IconX className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 font-medium shrink-0">
                    Menampilkan <strong>{filteredAlerts.length}</strong> variasi pada{' '}
                    <strong>{groupedAlertsByProduct.length}</strong> pakaian
                  </div>
                </div>

                {/* Alert List Grouped by Product */}
                {isLoadingAlerts ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-7 h-7 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-stone-500">
                      Memeriksa stok varian pakaian...
                    </p>
                  </div>
                ) : groupedAlertsByProduct.length === 0 ? (
                  <div className="py-16 text-center space-y-3 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    <IconCheck className="w-10 h-10 text-emerald-500 stroke-1 mx-auto block mb-2" />
                    <h3 className="text-base font-bold text-zinc-900">
                      {lowStockAlerts.length === 0
                        ? 'Semua Stok Pakaian Aman!'
                        : 'Tidak Ada Variasi yang Cocok dengan Filter'}
                    </h3>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                      {lowStockAlerts.length === 0
                        ? 'Tidak ada variasi warna maupun ukuran yang kehabisan stok saat ini.'
                        : 'Coba ubah filter status stok atau kata kunci pencarian di atas.'}
                    </p>
                    {(alertStatusFilter !== 'ALL' || alertSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAlertStatusFilter('ALL');
                          setAlertSearch('');
                        }}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Tampilkan Semua Alert
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedAlertsByProduct.map((group) => (
                      <div
                        key={group.product_id}
                        className="rounded-2xl border border-stone-200/90 bg-white overflow-hidden shadow-sm"
                      >
                        {/* Product Group Header */}
                        <div className="p-3.5 sm:p-4 bg-stone-50/80 border-b border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-12 h-14 bg-stone-200 rounded-xl overflow-hidden shrink-0 border border-stone-300">
                              {group.primary_image ? (
                                <Image
                                  src={group.primary_image}
                                  alt={group.product_title}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-400 text-[10px]">
                                  Foto
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/produk/${group.product_slug}`}
                                target="_blank"
                                className="font-extrabold text-zinc-900 text-sm hover:underline flex items-center gap-1"
                              >
                                <span className="truncate">{group.product_title}</span>
                                <span className="text-stone-400 text-xs">↗</span>
                              </Link>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-stone-500">
                                <span className="px-2 py-0.5 rounded bg-white border border-stone-200 font-semibold text-zinc-700">
                                  {group.category_name}
                                </span>
                                <span>·</span>
                                <span className="font-semibold text-rose-700">
                                  {group.variants.length} ukuran perlu dicek
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('stok');
                              setProductSearch(group.product_title);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-zinc-800 border border-stone-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Buka di Katalog & Stok →
                          </button>
                        </div>

                        {/* Variants List inside this Product */}
                        <div className="divide-y divide-stone-100">
                          {group.variants.map((item) => {
                            const isRestocking = alertRestockingKey === String(item.variant_id);
                            const customAmount = alertRestockAmounts[item.variant_id] ?? 15;

                            return (
                              <div
                                key={item.variant_id}
                                className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors"
                              >
                                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                                      item.status === 'Habis'
                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                        : 'bg-amber-100 text-amber-900 border-amber-300'
                                    }`}
                                  >
                                    {item.status === 'Habis'
                                      ? 'HABIS (0 pcs)'
                                      : `MENIPIS (${item.stock_quantity} pcs)`}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-zinc-800 font-bold">
                                    Warna: {item.color}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white font-bold">
                                    Size: {item.size}
                                  </span>
                                </div>

                                {/* Quick Restock Action Buttons */}
                                <div className="flex flex-wrap items-center gap-1.5 bg-stone-50 p-1.5 rounded-xl border border-stone-200 self-start sm:self-auto">
                                  <span className="text-[11px] font-bold text-stone-500 px-1.5">
                                    Tambah Cepat:
                                  </span>
                                  {[5, 10, 20].map((addVal) => (
                                    <button
                                      key={addVal}
                                      type="button"
                                      disabled={isRestocking}
                                      onClick={() =>
                                        handleQuickRestockAlertVariant(
                                          item.variant_id,
                                          item.stock_quantity,
                                          addVal
                                        )
                                      }
                                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 text-zinc-900 border border-stone-200 rounded-lg text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50"
                                      title={`Tambah ${addVal} pcs`}
                                    >
                                      +{addVal}
                                    </button>
                                  ))}

                                  <div className="h-4 w-px bg-stone-200 mx-0.5" />

                                  <input
                                    type="number"
                                    min="0"
                                    value={customAmount}
                                    onChange={(e) =>
                                      setAlertRestockAmounts({
                                        ...alertRestockAmounts,
                                        [item.variant_id]: Math.max(
                                          0,
                                          parseInt(e.target.value) || 0
                                        ),
                                      })
                                    }
                                    className="w-12 px-1 py-1 text-center font-extrabold bg-white rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                                    title="Set angka stok langsung"
                                  />
                                  <button
                                    type="button"
                                    disabled={isRestocking}
                                    onClick={() => handleUpdateStock(item.variant_id, customAmount)}
                                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {isRestocking ? '...' : 'Set Stok'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────
                TAB 4: TAMBAH BAJU BARU (2-COLUMN STRUCTURED FORM)
                ───────────────────────────────────────── */}
            {activeTab === 'tambah' && (
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200/90 shadow-sm space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-zinc-900">
                      Tambah Koleksi Pakaian Baru ke Katalog
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Lengkapi informasi dasar di kolom kiri, lalu atur variasi warna, foto per warna, dan stok ukuran di kolom kanan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('stok')}
                    className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-bold text-zinc-700 hover:bg-stone-100 cursor-pointer"
                  >
                    ← Lihat Daftar Katalog ({products.length})
                  </button>
                </div>

                {createSuccessMsg && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex flex-wrap items-center justify-between gap-3">
                    <span>{createSuccessMsg}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCreateSuccessMsg(null);
                          setActiveTab('stok');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer transition-colors"
                      >
                        Lihat di Produk &amp; Stok →
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateSuccessMsg(null)}
                        className="text-emerald-700 font-bold px-2 cursor-pointer"
                      >
                        <IconX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {createErrorMsg && (
                  <div className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl text-xs font-bold flex items-center justify-between">
                    <span>{createErrorMsg}</span>
                    <button
                      type="button"
                      onClick={() => setCreateErrorMsg(null)}
                      className="text-rose-700 font-bold px-2"
                    >
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleCreateProduct} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
                  {/* LEFT COLUMN (lg:col-span-5): Langkah 1 - Info Dasar & Preset Ukuran */}
                  <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-36">
                    <div className="p-4 sm:p-5 bg-stone-50/80 rounded-2xl border border-stone-200/90 space-y-4">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-stone-200/80">
                        <span className="w-6 h-6 rounded-lg bg-zinc-900 text-white text-xs font-extrabold flex items-center justify-center">
                          1
                        </span>
                        <h3 className="font-extrabold text-zinc-900 text-sm">
                          Informasi Dasar Pakaian
                        </h3>
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-800 mb-1.5">
                          Nama Pakaian / Model Baju <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Daster Rayon Busui / Kulot Crinkle Airflow"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-medium focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-zinc-800 mb-1.5">
                            Harga Jual (Rp) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min={0}
                            placeholder="Contoh: 65000"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-bold focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                          />
                          {newPrice && (
                            <p className="text-[11px] font-bold text-emerald-700 mt-1">
                              Format: Rp {Number(newPrice || 0).toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block font-bold text-zinc-800 mb-1.5">
                            Kategori Pakaian
                          </label>
                          <select
                            value={newCategoryId}
                            onChange={(e) => setNewCategoryId(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-800 mb-1.5">
                          Deskripsi Bahan, Karakteristik & Ukuran
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Contoh: Bahan rayon premium / crinkle airflow adem, jatuh, tidak menerawang, jahitan rapi, nyaman dipakai harian."
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none resize-y"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-800 mb-1.5">
                          Panduan Ukuran Khusus (LD / Panjang Baju / Lingkar Pinggang) <span className="text-stone-400 font-normal">(Opsional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: All Size LD 110cm, PB 115cm | Standar LP 60-95cm, Jumbo LP 70-115cm"
                          value={newSizeGuide}
                          onChange={(e) => setNewSizeGuide(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-medium focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                        />
                        <p className="text-[10px] text-stone-500 mt-1">
                          Jika dikosongkan, sistem menggunakan panduan ukuran standar sesuai kategori pakaian.
                        </p>
                      </div>
                    </div>

                    {/* Quick Garment Type Size Presets for All Colors */}
                    <div className="p-4 sm:p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                      <div>
                        <h4 className="font-extrabold text-amber-950 text-xs flex items-center gap-1.5">
                          <IconSparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Template Ukuran Cepat (Terapkan ke Semua Warna)</span>
                        </h4>
                        <p className="text-[11px] text-amber-900/80 mt-0.5">
                          Klik jenis pakaian di bawah ini untuk mengisi otomatis stok ukuran yang sesuai ke seluruh variasi warna sekaligus:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            applyPresetSizesToAllColors({
                              'ALL SIZE': 20,
                              STANDAR: 0,
                              JUMBO: 0,
                              S: 0,
                              M: 0,
                              L: 0,
                              XL: 0,
                              XXL: 0,
                            })
                          }
                          className="p-2.5 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-200 text-left transition-colors cursor-pointer"
                        >
                          <p className="font-bold text-zinc-900 text-xs">Daster / Kain Pantai</p>
                          <p className="text-[10px] text-stone-500">Fokus All Size (20 pcs)</p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            applyPresetSizesToAllColors({
                              'ALL SIZE': 0,
                              STANDAR: 15,
                              JUMBO: 15,
                              S: 0,
                              M: 0,
                              L: 0,
                              XL: 0,
                              XXL: 0,
                            })
                          }
                          className="p-2.5 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-200 text-left transition-colors cursor-pointer"
                        >
                          <p className="font-bold text-zinc-900 text-xs">Mukena / Hijab</p>
                          <p className="text-[10px] text-stone-500">Standar & Jumbo (15 pcs)</p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            applyPresetSizesToAllColors({
                              'ALL SIZE': 0,
                              STANDAR: 0,
                              JUMBO: 0,
                              S: 10,
                              M: 15,
                              L: 15,
                              XL: 10,
                              XXL: 8,
                            })
                          }
                          className="p-2.5 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-200 text-left transition-colors cursor-pointer"
                        >
                          <p className="font-bold text-zinc-900 text-xs">Kaos / Outer / Anak</p>
                          <p className="text-[10px] text-stone-500">Size S, M, L, XL, XXL</p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            applyPresetSizesToAllColors({
                              'ALL SIZE': 15,
                              STANDAR: 12,
                              JUMBO: 10,
                              S: 8,
                              M: 12,
                              L: 12,
                              XL: 8,
                              XXL: 6,
                            })
                          }
                          className="p-2.5 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-200 text-left transition-colors cursor-pointer"
                        >
                          <p className="font-bold text-zinc-900 text-xs">Setelan / Kulot / Bogo</p>
                          <p className="text-[10px] text-stone-500">Lengkap Semua 8 Ukuran</p>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN (lg:col-span-7): Langkah 2 - Variasi Warna, Upload Foto & Stok */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50/80 p-4 rounded-2xl border border-stone-200/90">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-zinc-900 text-white text-xs font-extrabold flex items-center justify-center">
                          2
                        </span>
                        <div>
                          <h3 className="font-extrabold text-zinc-900 text-sm">
                            Variasi Warna, Foto & Stok Ukuran ({colorVariations.length} Warna)
                          </h3>
                          <p className="text-[11px] text-stone-500">
                            Total stok awal seluruh warna:{' '}
                            <strong className="text-zinc-900">
                              {colorVariations.reduce(
                                (sum, c) =>
                                  sum +
                                  Object.values(c.sizes).reduce((a, b) => a + (Number(b) || 0), 0),
                                0
                              )}{' '}
                              pcs
                            </strong>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={addColorVariation}
                        className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <IconPlus className="w-3.5 h-3.5" />
                        <span>Tambah Warna</span>
                      </button>
                    </div>

                    {colorVariations.map((cVar, idx) => (
                      <div
                        key={cVar.id}
                        className="p-4 sm:p-5 bg-stone-50/70 rounded-2xl border border-stone-200/90 space-y-4 transition-all"
                      >
                        {/* Header Variation */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-extrabold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-extrabold text-zinc-900 text-xs sm:text-sm">
                              Warna: <span className="text-emerald-800">{cVar.color || 'Belum dinamai'}</span>
                            </span>
                            {idx === 0 && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                                Foto Cover Utama
                              </span>
                            )}
                          </div>

                          {colorVariations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeColorVariation(cVar.id)}
                              className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                            >
                              <IconTrash className="w-3 h-3" />
                              <span>Hapus Warna</span>
                            </button>
                          )}
                        </div>

                        {/* Nama Warna & Presets */}
                        <div className="space-y-1.5">
                          <label className="block font-bold text-zinc-700 text-[11px]">
                            Nama Warna / Motif <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Misal: Hitam, Putih, Sage Green, Krem Susu, Motif Bunga..."
                            value={cVar.color}
                            onChange={(e) => updateColorVariation(cVar.id, { color: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                          />
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-stone-400 font-medium">Pilihan Cepat:</span>
                            {[
                              'Hitam',
                              'Putih',
                              'Sage Green',
                              'Krem Susu',
                              'Terracotta',
                              'Navy',
                              'Cokelat Milo',
                              'Maroon',
                              'Motif Bunga',
                              'Motif Tropis',
                            ].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => updateColorVariation(cVar.id, { color: preset })}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                                  cVar.color.toLowerCase() === preset.toLowerCase()
                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Upload Foto untuk Warna Ini */}
                        <div className="space-y-2 p-3.5 bg-white rounded-xl border border-stone-200">
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-zinc-800 text-[11px] flex items-center gap-1.5">
                              <IconCamera className="w-3.5 h-3.5 text-stone-500" />
                              <span>Foto Pakaian untuk Warna {cVar.color || `#${idx + 1}`}</span>
                            </label>
                            {cVar.imagePreviewUrl && (
                              <span className="text-[10px] text-emerald-700 font-bold inline-flex items-center gap-1">
                                <IconCheck className="w-3 h-3" />
                                <span>Foto siap diunggah</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-stone-100 border border-stone-300 shrink-0 flex items-center justify-center">
                              {cVar.imagePreviewUrl || cVar.imageUrl ? (
                                <img
                                  src={cVar.imagePreviewUrl || cVar.imageUrl}
                                  alt={cVar.color}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center p-1 text-stone-400 text-[10px] leading-tight">
                                  <span>Foto {cVar.color || `#${idx + 1}`}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 space-y-2 w-full">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleColorImageFileChange(cVar.id, e.target.files[0]);
                                  }
                                }}
                                className="w-full text-[11px] text-stone-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
                              />
                              <input
                                type="url"
                                placeholder="Atau tempel link URL foto online (Opsional)..."
                                value={cVar.imageUrl}
                                onChange={(e) =>
                                  updateColorVariation(cVar.id, { imageUrl: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-[11px] bg-stone-50 focus:bg-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Stok Ukuran untuk Warna Ini */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="block font-bold text-zinc-700 text-[11px]">
                              Stok per Ukuran ({cVar.color || `#${idx + 1}`}):
                            </label>
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateColorVariation(cVar.id, {
                                    sizes: {
                                      'ALL SIZE': 15,
                                      STANDAR: 12,
                                      JUMBO: 10,
                                      S: 8,
                                      M: 12,
                                      L: 12,
                                      XL: 8,
                                      XXL: 6,
                                    },
                                  })
                                }
                                className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 text-white font-semibold hover:bg-zinc-800 cursor-pointer"
                              >
                                Semua Size
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateColorVariation(cVar.id, {
                                    sizes: {
                                      'ALL SIZE': 20,
                                      STANDAR: 0,
                                      JUMBO: 0,
                                      S: 0,
                                      M: 0,
                                      L: 0,
                                      XL: 0,
                                      XXL: 0,
                                    },
                                  })
                                }
                                className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 cursor-pointer"
                              >
                                Hanya All Size
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateColorVariation(cVar.id, {
                                    sizes: {
                                      'ALL SIZE': 0,
                                      STANDAR: 15,
                                      JUMBO: 15,
                                      S: 0,
                                      M: 0,
                                      L: 0,
                                      XL: 0,
                                      XXL: 0,
                                    },
                                  })
                                }
                                className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 cursor-pointer"
                              >
                                Standar &amp; Jumbo
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateColorVariation(cVar.id, {
                                    sizes: {
                                      'ALL SIZE': 0,
                                      STANDAR: 0,
                                      JUMBO: 0,
                                      S: 10,
                                      M: 15,
                                      L: 15,
                                      XL: 10,
                                      XXL: 8,
                                    },
                                  })
                                }
                                className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 cursor-pointer"
                              >
                                S–XXL
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {['ALL SIZE', 'STANDAR', 'JUMBO', 'S', 'M', 'L', 'XL', 'XXL'].map(
                              (size) => (
                                <div
                                  key={size}
                                  className="bg-white p-2 rounded-xl border border-stone-200 text-center space-y-1"
                                >
                                  <span className="font-extrabold text-zinc-800 text-[10.5px] block truncate">
                                    {size}
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={cVar.sizes[size] ?? 0}
                                    onChange={(e) =>
                                      updateColorVariation(cVar.id, {
                                        sizes: {
                                          ...cVar.sizes,
                                          [size]: Math.max(0, parseInt(e.target.value) || 0),
                                        },
                                      })
                                    }
                                    className="w-full px-1 py-1 rounded-lg border border-stone-300 text-center font-extrabold text-xs"
                                  />
                                  <span className="text-[9px] text-stone-400 block">pcs</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addColorVariation}
                      className="w-full py-3 border-2 border-dashed border-stone-300 hover:border-zinc-800 hover:bg-stone-50 rounded-2xl text-xs font-bold text-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="text-base">+</span>
                      <span>Tambah Variasi Warna Pakaian Lain</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isCreatingProduct}
                      className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-extrabold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      <IconCheck className="w-4 h-4" />
                      <span>
                        {isCreatingProduct
                          ? 'Menyimpan Produk ke Katalog...'
                          : 'Simpan & Tayangkan Pakaian di Katalog'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ─────────────────────────────────────────
                TAB 5: TARIF ONGKIR DAERAH (RESPONSIVE CARD GRID)
                ───────────────────────────────────────── */}
            {activeTab === 'ongkir' && (
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200/90 shadow-sm space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-zinc-900">
                      Tarif Ongkos Kirim per Provinsi ({shippingRates.length} Provinsi)
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Tarif flat ini otomatis terhitung pada saat pembeli memilih provinsi tujuan di halaman Keranjang & Checkout.
                    </p>
                  </div>

                  {changedShippingRateIds.length > 0 && (
                    <button
                      type="button"
                      disabled={isSavingAllRates}
                      onClick={() => handleSaveAllShippingRates(changedShippingRateIds)}
                      className="self-start sm:self-auto px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-extrabold rounded-xl text-xs transition-colors cursor-pointer shadow-sm inline-flex items-center gap-1.5"
                    >
                      <IconSave className="w-3.5 h-3.5" />
                      <span>
                        {isSavingAllRates
                          ? 'Menyimpan...'
                          : `Simpan Semua (${changedShippingRateIds.length} Provinsi)`}
                      </span>
                    </button>
                  )}
                </div>

                {/* Search Province Bar */}
                <div className="bg-stone-50/90 p-3.5 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Cari nama provinsi (misal: Bali, Jawa Timur, DKI Jakarta)..."
                      value={shippingSearch}
                      onChange={(e) => setShippingSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-2 rounded-xl border border-stone-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                      <IconSearch className="w-3.5 h-3.5" />
                    </span>
                    {shippingSearch && (
                      <button
                        type="button"
                        onClick={() => setShippingSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-zinc-800 text-xs cursor-pointer"
                      >
                        <IconX className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-stone-500 font-medium">
                    Menampilkan <strong>{filteredShippingRates.length}</strong> dari{' '}
                    {shippingRates.length} provinsi
                  </span>
                </div>

                {/* Responsive 3-Column Card Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {filteredShippingRates.map((r) => {
                    const currentRateVal = editingRates[r.id] ?? r.cost;
                    const isChanged = Number(currentRateVal) !== Number(r.cost);

                    return (
                      <div
                        key={r.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isChanged
                            ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-400/20'
                            : 'bg-stone-50/50 border-stone-200/90 hover:border-stone-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-extrabold text-zinc-900 text-sm">{r.province}</p>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              Tarif Ongkir Pengiriman Daerah
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs shrink-0">
                            Rp {Number(currentRateVal || 0).toLocaleString('id-ID')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-stone-200/70">
                          <span className="text-stone-500 font-bold text-xs">Rp</span>
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={currentRateVal}
                            onChange={(e) =>
                              setEditingRates({ ...editingRates, [r.id]: e.target.value })
                            }
                            className="flex-1 min-w-0 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-extrabold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateShippingRate(r.id)}
                            className={`px-3.5 py-1.5 font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0 ${
                              isChanged
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                            }`}
                          >
                            Simpan
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          MODAL: KELOLA FOTO VARIASI WARNA (PRODUK TERDAFTAR)
          ───────────────────────────────────────── */}
      {activeColorModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92dvh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 flex items-center justify-between gap-3 bg-stone-50/80">
              <div className="min-w-0">
                <h3 className="font-bold text-zinc-900 text-base flex items-center gap-2">
                  <IconPhoto className="w-5 h-5 text-zinc-800" />
                  <span>Kelola Foto Variasi Warna</span>
                </h3>
                <p className="text-xs text-stone-500 line-clamp-1">
                  Produk: <strong>{activeColorModalProduct.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveColorModalProduct(null)}
                className="w-8 h-8 shrink-0 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-5 sm:space-y-6">
              {colorModalSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-fade-in">
                  {colorModalSuccess}
                </div>
              )}

              {colorModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold animate-fade-in">
                  {colorModalError}
                </div>
              )}

              <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl text-amber-900 text-xs inline-flex items-start gap-2">
                <IconAlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Tips:</strong> Foto yang diunggah di sini akan otomatis tampil saat pembeli mengklik tombol pilihan warna di katalog atau halaman produk. Anda juga dapat memilih warna mana yang menjadi <strong>Cover Utama Katalog</strong>.
                </span>
              </div>

              {/* Daftar Warna yang Ada */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider">
                  Foto per Variasi Warna Pakaian:
                </h4>

                {(!activeColorModalProduct.variants_by_color || activeColorModalProduct.variants_by_color.length === 0) ? (
                  <p className="text-xs text-stone-400 italic">Belum ada variasi warna yang terdaftar pada produk ini.</p>
                ) : (
                  activeColorModalProduct.variants_by_color.map((c) => {
                    const isUploading = colorModalUploadingColor === c.color;
                    const preview = colorModalPreview[c.color];
                    const displayImg = preview || c.color_image;
                    const canDeleteColor = (activeColorModalProduct.variants_by_color?.length || 0) > 1;

                    return (
                      <div
                        key={c.color}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${
                          c.is_primary
                            ? 'border-amber-300 bg-amber-50/30'
                            : 'border-stone-200 bg-stone-50/50'
                        }`}
                      >
                        {/* Info Warna & Foto */}
                        <div className="flex items-center gap-3">
                          <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-stone-200 border border-stone-300 shrink-0 flex items-center justify-center">
                            {displayImg ? (
                              <img
                                src={displayImg}
                                alt={c.color}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-stone-400 text-center px-1">
                                Belum ada foto
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-zinc-900 text-sm">{c.color}</span>
                              {c.is_primary && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950 font-extrabold text-[10px] inline-flex items-center gap-1">
                                  <IconSparkles className="w-3 h-3" />
                                  <span>Cover Utama Katalog</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              {c.color_image ? (
                                <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                                  <IconCheck className="w-3 h-3" />
                                  <span>Foto terpasang</span>
                                </span>
                              ) : (
                                <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                                  <IconAlertCircle className="w-3 h-3" />
                                  <span>Belum ada foto</span>
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-stone-400">
                              Ukuran: {c.sizes.map((s) => `${s.size} (${s.stock_quantity})`).join(', ')}
                            </p>
                          </div>
                        </div>

                        {/* Input Upload & Simpan */}
                        <div className="w-full sm:w-auto space-y-2">
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const f = e.target.files[0];
                                  setColorModalFile((prev) => ({ ...prev, [c.color]: f }));
                                  setColorModalPreview((prev) => ({
                                    ...prev,
                                    [c.color]: URL.createObjectURL(f),
                                  }));
                                }
                              }}
                              className="text-[11px] text-stone-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
                            />

                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => handleUploadColorImage(activeColorModalProduct.id, c.color)}
                                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isUploading ? 'Menyimpan...' : 'Simpan Foto'}
                              </button>

                              {c.image_id && !c.is_primary && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryColorImage(activeColorModalProduct.id, c.color)}
                                  className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Jadikan foto warna ini sebagai sampul utama produk di etalase"
                                >
                                  <IconSparkles className="w-3 h-3 text-amber-900" />
                                  <span>Jadikan Cover</span>
                                </button>
                              )}

                              {c.image_id && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProductImage(activeColorModalProduct.id, c.image_id!)}
                                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Hapus foto saja (variasi warna dan ukuran tetap ada)"
                                >
                                  <IconTrash className="w-3 h-3" />
                                  <span>Hapus Foto</span>
                                </button>
                              )}

                              {canDeleteColor && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteColorVariation(activeColorModalProduct.id, c.color)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Hapus variasi warna ini beserta seluruh ukuran dan fotonya"
                                >
                                  <IconTrash className="w-3 h-3" />
                                  <span>Hapus Warna</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Tambah Variasi Warna Baru ke Produk Ini */}
              <div className="p-4 bg-stone-100/90 rounded-2xl border border-stone-200/90 space-y-4">
                <div>
                  <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <IconSparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tambah Variasi Warna / Motif Baru ke Produk Ini:</span>
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Tambahkan warna atau motif baru (misal: Sage Green, Krem Susu, Motif Bunga, Motif Tropis) lengkap dengan foto dan stok ukurannya.
                  </p>
                </div>

                {/* Nama Warna & Chips */}
                <div className="space-y-1.5">
                  <label className="block font-semibold text-zinc-700 text-[11px]">
                    Nama Warna / Motif Baru <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ketik nama warna atau motif (misal: Sage Green, Krem Susu, Motif Bunga)..."
                    value={newCustomColorName}
                    onChange={(e) => setNewCustomColorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-stone-400">Pilihan Cepat:</span>
                    {['Hitam', 'Putih', 'Sage Green', 'Krem Susu', 'Terracotta', 'Navy', 'Cokelat Milo', 'Maroon', 'Motif Bunga', 'Motif Tropis'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewCustomColorName(preset)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors cursor-pointer ${
                          newCustomColorName.toLowerCase() === preset.toLowerCase()
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Foto Warna Baru */}
                <div className="space-y-2 p-3 bg-white rounded-xl border border-stone-200">
                  <label className="font-semibold text-zinc-800 text-[11px] flex items-center gap-1.5">
                    <IconCamera className="w-3.5 h-3.5 text-stone-600" />
                    <span>Upload Foto untuk Warna {newCustomColorName || 'Baru'} <span className="text-rose-500">*</span></span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-300 shrink-0 flex items-center justify-center">
                      {newCustomColorPreview ? (
                        <img src={newCustomColorPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-stone-400 text-center px-1">Pratinjau</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const f = e.target.files[0];
                            setNewCustomColorFile(f);
                            setNewCustomColorPreview(URL.createObjectURL(f));
                          }
                        }}
                        className="w-full text-[11px] text-stone-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Stok Ukuran */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block font-semibold text-zinc-700 text-[11px]">
                      Stok Ukuran Awal untuk Warna Ini (pcs):
                    </label>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setNewCustomColorSizes({ 'ALL SIZE': 15, STANDAR: 12, JUMBO: 10, S: 8, M: 12, L: 12, XL: 8, XXL: 6 })
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-white font-semibold hover:bg-zinc-800 cursor-pointer"
                      >
                        Semua Size
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewCustomColorSizes({ 'ALL SIZE': 20, STANDAR: 0, JUMBO: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 })
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 cursor-pointer"
                      >
                        Hanya All Size
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewCustomColorSizes({ 'ALL SIZE': 0, STANDAR: 15, JUMBO: 15, S: 0, M: 0, L: 0, XL: 0, XXL: 0 })
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 cursor-pointer"
                      >
                        Standar &amp; Jumbo
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewCustomColorSizes({ 'ALL SIZE': 0, STANDAR: 0, JUMBO: 0, S: 10, M: 15, L: 15, XL: 10, XXL: 8 })
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 cursor-pointer"
                      >
                        S–XXL
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['ALL SIZE', 'STANDAR', 'JUMBO', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                      <div key={s} className="bg-white p-2 rounded-xl border border-stone-200 text-center">
                        <span className="block text-[10px] font-bold text-zinc-500 mb-1 truncate">{s}</span>
                        <input
                          type="number"
                          min="0"
                          value={newCustomColorSizes[s] ?? 0}
                          onChange={(e) =>
                            setNewCustomColorSizes((prev) => ({
                              ...prev,
                              [s]: Math.max(0, parseInt(e.target.value) || 0),
                            }))
                          }
                          className="w-full text-center font-bold text-xs py-1 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAddingNewColorPhoto}
                  onClick={() => handleAddNewColorPhoto(activeColorModalProduct.id)}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <IconCheck className="w-3.5 h-3.5 text-white" />
                  <span>{isAddingNewColorPhoto ? 'Menyimpan Warna & Foto Baru...' : 'Simpan Variasi Warna Baru'}</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-stone-200 bg-stone-50 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveColorModalProduct(null)}
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          MODAL EDIT PRODUK LENGKAP
          ───────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 flex justify-between items-center gap-3 bg-stone-50">
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                  <IconPencil className="w-4 h-4 text-sky-800" />
                  <span>Edit Informasi Produk</span>
                </h3>
                <p className="text-xs text-stone-500 line-clamp-1">
                  Ubah data dasar, harga, kategori, atau status publikasi pakaian.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 shrink-0 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditProduct} className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4">
              {editSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-fade-in">
                  {editSuccessMsg}
                </div>
              )}

              {editErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold animate-fade-in">
                  {editErrorMsg}
                </div>
              )}

              {/* Nama Baju */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-800">
                  Nama Pakaian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Misal: Daster Rayon Busui / Kulot Crinkle Airflow / Celana Bogo"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                />
              </div>

              {/* Harga & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Harga Dasar (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="Contoh: 55000"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Kategori Pakaian
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                  >
                    <option value="">Pilih Kategori...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Publikasi (Aktif vs Draft) */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-zinc-900">Status Publikasi</p>
                  <p className="text-[11px] text-stone-500">
                    {editIsActive
                      ? 'Produk tampil di katalog pembeli dan dapat dipesan.'
                      : 'Produk disembunyikan (draft) dan tidak terlihat oleh pembeli.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    editIsActive
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-200 text-stone-700 border-stone-300'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        editIsActive ? 'bg-emerald-400' : 'bg-stone-400'
                      }`}
                    />
                    <span>{editIsActive ? 'Aktif (Tampil)' : 'Draft (Sembunyi)'}</span>
                  </span>
                </button>
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-800">
                  Deskripsi Bahan & Pakaian
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Keterangan bahan kain, jahitan, atau petunjuk perawatan..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white resize-y"
                />
              </div>

              {/* Panduan Ukuran Khusus (LD / Panjang Baju) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-800">
                  Panduan Ukuran Khusus (LD / Panjang Baju / Lingkar Pinggang) <span className="text-stone-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={editSizeGuide}
                  onChange={(e) => setEditSizeGuide(e.target.value)}
                  placeholder="Contoh: All Size LD 110cm, PB 115cm | Standar LP 60-95cm"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditProduct}
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <IconCheck className="w-3.5 h-3.5 text-white" />
                  <span>{isSavingEditProduct ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          MODAL TEMPLATE BALASAN CEPAT WHATSAPP
          ───────────────────────────────────────── */}
      {activeQuickReplyOrder && (() => {
        const o = activeQuickReplyOrder;
        const cleanPhone = o.customer_phone.replace(/[^0-9]/g, '');
        const targetPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
        const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const trackingUrl = `${originUrl}/lacak-pesanan?order=${o.order_number}`;
        const itemsSummary = o.items
          .map((i, idx) => `${idx + 1}. ${i.product_title} (${i.color} - ${i.size}) x ${i.quantity} pcs`)
          .join('\n');

        const templates = [
          {
            id: 1,
            title: 'Info Rekening & Tagihan Pembayaran',
            badge: 'Menunggu Pembayaran',
            badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
            description: 'Kirim saat pembeli baru saja checkout dan membutuhkan nomor rekening untuk transfer.',
            text: `Halo Kak ${o.customer_name}, terima kasih sudah memesan di *DLRS — Katalog Pakaian* 🙏\n\n📋 *RINCIAN PESANAN: ${o.order_number}*\n${itemsSummary}\n\n• Subtotal Pakaian: Rp ${Number(o.subtotal_items || 0).toLocaleString('id-ID')}\n• Ongkir (${o.shipping_province}): Rp ${Number(o.shipping_cost || 0).toLocaleString('id-ID')}\n• *Total Tagihan: Rp ${Number(o.total_amount || 0).toLocaleString('id-ID')}*\n\nAlamat Pengiriman:\n${o.shipping_address}, ${o.shipping_city}${o.shipping_district ? `, Kec. ${o.shipping_district}` : ''}, ${o.shipping_province}\n\nSilakan transfer ke rekening resmi kami:\n${storeBankAccounts}\n\nJika sudah melakukan pembayaran, mohon kirimkan bukti transfernya di sini ya kak agar pesanan segera kami siapkan. Terima kasih! ✨`,
          },
          {
            id: 2,
            title: 'Pengingat Pembayaran (Follow-up Reminder)',
            badge: 'Pengingat Ramah',
            badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
            description: 'Kirim jika pembeli belum konfirmasi pembayaran setelah beberapa jam agar stok tidak kedaluwarsa.',
            text: `Halo Kak ${o.customer_name}, apa kabar? 😊\n\nSekadar mengingatkan untuk pesanan baju Kakak (*${o.order_number}*) sebesar *Rp ${Number(o.total_amount || 0).toLocaleString('id-ID')}*.\n\nStok pakaiannya masih kami simpankan untuk Kakak. Apakah ada kendala dalam proses transfer atau rincian pesanan? Mohon infonya ya kak agar bisa kami bantu. Terima kasih banyak! 🙏`,
          },
          {
            id: 3,
            title: 'Konfirmasi Lunas & Baju Sedang Dikemas',
            badge: 'Pembayaran Diterima',
            badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
            description: 'Kirim setelah bukti transfer diverifikasi masuk ke rekening toko.',
            text: `Halo Kak ${o.customer_name}, terima kasih banyak! ❤️\n\nPembayaran untuk pesanan *${o.order_number}* telah kami terima lunas.\nBaju pesanan Kakak saat ini sedang masuk antrean persiapan dan pengemasan rapi oleh tim kami.\n\nNanti setelah paket diserahkan ke pihak kurir ekspedisi, nomor resi pengiriman akan segera kami infokan ya kak. Terima kasih sudah berbelanja di DLRS! ✨`,
          },
          {
            id: 4,
            title: 'Konfirmasi Pengiriman & Resi Kurir',
            badge: 'Sedang Dikirim',
            badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
            description: 'Kirim setelah baju diserahkan ke ekspedisi dan nomor resi kurir telah diinput.',
            text: `Halo Kak ${o.customer_name}, kabar baik! Paket baju Kakak (*${o.order_number}*) telah berhasil kami kirimkan 📦\n\n🚚 Ekspedisi: *${o.shipping_courier || 'Kurir Ekspedisi'}*\n🔖 No. Resi: *${o.tracking_number || '(Terlampir di Sistem)'}*\n\nKakak juga bisa memantau posisi pengiriman dan melihat foto bukti struk resi secara langsung di tautan:\n🔗 ${trackingUrl}\n\nSemoga bajunya lekas sampai dengan selamat dan pas di hati Kakak. Jika paket sudah tiba, mohon kabari kami ya kak. Terima kasih banyak! 🙏`,
          },
        ];

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-3.5 border-b border-stone-200 flex justify-between items-center gap-3 bg-stone-50">
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                    <IconWhatsApp className="w-4 h-4 text-emerald-600" />
                    <span>Template Balasan WhatsApp Cepat</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Pesanan <span className="font-mono font-bold text-zinc-800">{o.order_number}</span> • Kak {o.customer_name} ({o.customer_phone})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveQuickReplyOrder(null)}
                  className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-500 transition-colors"
                  title="Tutup (Esc)"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4">
                {/* Store Bank Setting Box */}
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                      <span>🏦</span>
                      <span>Rekening Toko (Digunakan pada Template Tagihan)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingBanks(!isEditingBanks)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      {isEditingBanks ? 'Tutup Edit' : 'Ubah Nomor Rekening'}
                    </button>
                  </div>

                  {isEditingBanks ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={storeBankAccounts}
                        onChange={(e) => setStoreBankAccounts(e.target.value)}
                        rows={3}
                        placeholder="Contoh:&#10;BCA 1234567890 a/n Toko Pakaian&#10;Mandiri 0987654321 a/n Toko Pakaian"
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-xs font-mono text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            localStorage.setItem('dlrs_store_banks', storeBankAccounts);
                          } catch {}
                          setIsEditingBanks(false);
                        }}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        Simpan Rekening
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-stone-700 whitespace-pre-line bg-white p-2 rounded-lg border border-stone-200/80">
                      {storeBankAccounts}
                    </p>
                  )}
                </div>

                {/* Templates List */}
                <div className="space-y-3 pt-1">
                  {templates.map((t) => {
                    const waLink = `https://wa.me/${targetPhone}?text=${encodeURIComponent(t.text)}`;
                    const isCopied = copiedTemplateIdx === t.id;

                    return (
                      <div
                        key={t.id}
                        className="border border-stone-200 rounded-xl p-3.5 hover:border-stone-300 transition-all bg-white space-y-2.5 shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-zinc-900">{t.title}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.badgeColor}`}>
                                {t.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">{t.description}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                  navigator.clipboard.writeText(t.text);
                                  setCopiedTemplateIdx(t.id);
                                  setTimeout(() => setCopiedTemplateIdx(null), 2500);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                              title="Salin teks pesan ke clipboard"
                            >
                              {isCopied ? (
                                <>
                                  <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700 font-bold">Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <IconCopy className="w-3.5 h-3.5 text-stone-600" />
                                  <span>Salin Teks</span>
                                </>
                              )}
                            </button>

                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold transition-colors shadow-xs"
                              title="Buka WhatsApp langsung dengan pesan ini terisi"
                            >
                              <IconWhatsApp className="w-3.5 h-3.5" />
                              <span>Buka di WA</span>
                              <IconExternalLink className="w-2.5 h-2.5 opacity-80" />
                            </a>
                          </div>
                        </div>

                        {/* Text Preview */}
                        <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200/70 text-[11px] text-stone-700 font-sans whitespace-pre-line max-h-36 overflow-y-auto select-all leading-relaxed">
                          {t.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-4 sm:px-6 py-3 border-t border-stone-200 bg-stone-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveQuickReplyOrder(null)}
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
