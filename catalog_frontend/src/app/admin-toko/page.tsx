'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@/types';

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
  tracking_number?: string;
  notes?: string;
  created_at: string;
  items: OrderItemData[];
}

interface StatsData {
  total_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  shipped_orders: number;
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

export default function AdminTokoPage() {
  // Authentication & Security State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sellerToken, setSellerToken] = useState<string>('');
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab: pesanan | stok | alerts | tambah | ongkir
  const [activeTab, setActiveTab] = useState<'pesanan' | 'stok' | 'alerts' | 'tambah' | 'ongkir'>('pesanan');

  // Stats
  const [stats, setStats] = useState<StatsData | null>(null);

  // Low Stock Alerts
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertItem[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false);
  const [alertRestockAmounts, setAlertRestockAmounts] = useState<{ [key: string]: number }>({});
  const [alertRestockingKey, setAlertRestockingKey] = useState<string | null>(null);

  // Orders
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [editingResi, setEditingResi] = useState<{ [orderNum: string]: string }>({});

  // Products & Stock
  const [products, setProducts] = useState<ProductAdminItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [editingStock, setEditingStock] = useState<{ [variantId: number]: number }>({});
  const [stockUpdatingId, setStockUpdatingId] = useState<number | null>(null);

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

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<ProductAdminItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
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
  const [newCustomColorName, setNewCustomColorName] = useState<string>('');
  const [newCustomColorFile, setNewCustomColorFile] = useState<File | null>(null);
  const [newCustomColorPreview, setNewCustomColorPreview] = useState<string>('');
  const [newCustomColorSizes, setNewCustomColorSizes] = useState<{ [size: string]: number }>({
    S: 5,
    M: 10,
    L: 10,
    XL: 5,
  });
  const [isAddingNewColorPhoto, setIsAddingNewColorPhoto] = useState(false);

  // Shipping Rates
  const [shippingRates, setShippingRates] = useState<ShippingRateData[]>([]);
  const [editingRates, setEditingRates] = useState<{ [id: number]: string }>({});

  // New Product Form with Multi-Color Variations
  const [categories, setCategories] = useState<Category[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [colorVariations, setColorVariations] = useState<ColorVariationInput[]>([
    {
      id: 'color-1',
      color: 'Hitam',
      imageFile: null,
      imagePreviewUrl: '',
      imageUrl: '',
      sizes: { S: 5, M: 10, L: 10, XL: 5 },
    },
    {
      id: 'color-2',
      color: 'Putih',
      imageFile: null,
      imagePreviewUrl: '',
      imageUrl: '',
      sizes: { S: 5, M: 10, L: 10, XL: 5 },
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
    }
  }, []);

  // Fetch stats & categories when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
      syncAllData(false);

      // Realtime polling otomatis setiap 15 detik
      const interval = setInterval(() => {
        syncAllData(true);
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

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

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
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
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchOrders();
  }, [orderStatusFilter, orderSearch, isAuthenticated]);

  const syncAllData = async (silent = true) => {
    if (!silent) setIsSyncing(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchOrders(),
        fetchProducts(),
        fetchLowStockAlerts(),
        fetchShippingRates(),
      ]);
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
    } catch (e) {
      console.error('Error synchronizing admin data:', e);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };



  const handleUpdateOrderStatus = async (orderNumber: string, status: string, trackingNumber?: string) => {
    try {
      const res = await sellerFetch(`/api/seller/orders/${orderNumber}/status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, tracking_number: trackingNumber }),
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
            text: `Pesanan ${orderNumber} ditandai sedang dikirim dengan no. resi ${trackingNumber || '-'}.`,
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

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
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
      setIsLoadingProducts(false);
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
        fetchProducts();
        fetchStats();
        fetchLowStockAlerts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStockUpdatingId(null);
    }
  };

  const fetchLowStockAlerts = async () => {
    setIsLoadingAlerts(true);
    try {
      const res = await sellerFetch('/api/seller/alerts/low-stock/');
      if (res.ok) {
        const data = await res.json();
        setLowStockAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAlerts(false);
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
      fetchProducts();
      fetchStats();
      fetchLowStockAlerts();
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
        fetchProducts();
        fetchStats();
        fetchLowStockAlerts();
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
          is_active: editIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan perubahan produk.');
      setEditSuccessMsg('✓ Perubahan produk berhasil disimpan!');
      fetchProducts();
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
        fetchProducts();
        fetchStats();
        fetchLowStockAlerts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAlertRestockingKey(null);
    }
  };

  // ─────────────────────────────────────────
  // COLOR VARIATIONS STATE HELPERS (ADD FORM)
  // ─────────────────────────────────────────
  const addColorVariation = () => {
    const nextColors = ['Putih', 'Navy', 'Sage Green', 'Krem', 'Cokelat', 'Maroon', 'Abu-abu'];
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
        sizes: { S: 5, M: 10, L: 10, XL: 5 },
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
  const handleUploadColorImage = async (productId: number, color: string) => {
    const file = colorModalFile[color];
    const url = colorModalUrl[color] || '';
    if (!file && !url) {
      alert('Pilih file gambar atau masukkan URL gambar terlebih dahulu.');
      return;
    }

    setColorModalUploadingColor(color);
    setColorModalSuccess(null);

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

      setColorModalSuccess(`✓ Foto untuk warna "${color}" berhasil disimpan!`);
      setColorModalFile((prev) => ({ ...prev, [color]: null }));
      setColorModalUrl((prev) => ({ ...prev, [color]: '' }));

      // Refresh products list and active modal data
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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setColorModalUploadingColor(null);
    }
  };

  const handleDeleteProductImage = async (productId: number, imageId: number) => {
    if (!confirm('Hapus foto ini?')) return;
    try {
      const res = await sellerFetch(`/api/seller/products/${productId}/images/${imageId}/`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const refreshRes = await sellerFetch('/api/seller/products/');
        if (refreshRes.ok) {
          const updatedList: ProductAdminItem[] = await refreshRes.json();
          setProducts(updatedList);
          const currentUpdated = updatedList.find((p) => p.id === productId);
          if (currentUpdated) {
            setActiveColorModalProduct(currentUpdated);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNewColorPhoto = async (productId: number) => {
    const color = newCustomColorName.trim();
    if (!color) {
      alert('Tentukan nama warna terlebih dahulu.');
      return;
    }
    if (!newCustomColorFile) {
      alert('Pilih file gambar untuk warna ini.');
      return;
    }

    setIsAddingNewColorPhoto(true);
    setColorModalSuccess(null);

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

      setColorModalSuccess(`✓ Variasi warna "${color}" beserta foto & stok berhasil ditambahkan ke produk!`);
      setNewCustomColorName('');
      setNewCustomColorFile(null);
      setNewCustomColorPreview('');
      setNewCustomColorSizes({ S: 5, M: 10, L: 10, XL: 5 });

      const refreshRes = await sellerFetch('/api/seller/products/');
      if (refreshRes.ok) {
        const refreshData2 = await refreshRes.json();
        const updatedList: ProductAdminItem[] = Array.isArray(refreshData2)
          ? refreshData2
          : Array.isArray(refreshData2.results)
          ? refreshData2.results
          : [];
        setProducts(updatedList);
        const currentUpdated = updatedList.find((p) => p.id === productId);
        if (currentUpdated) {
          setActiveColorModalProduct(currentUpdated);
        }
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAddingNewColorPhoto(false);
    }
  };

  const fetchShippingRates = async () => {
    try {
      const res = await fetch('/api/shipping-rates/');
      if (res.ok) {
        const data = await res.json();
        setShippingRates(data);
        const map: { [id: number]: string } = {};
        data.forEach((r: ShippingRateData) => {
          map[r.id] = r.cost;
        });
        setEditingRates(map);
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

      setCreateSuccessMsg(`✓ Produk "${newTitle}" berhasil ditambahkan lengkap dengan foto variasi warna!`);
      setNewTitle('');
      setNewPrice('');
      setNewDescription('');
      setColorVariations([
        {
          id: 'color-1',
          color: 'Hitam',
          imageFile: null,
          imagePreviewUrl: '',
          imageUrl: '',
          sizes: { S: 5, M: 10, L: 10, XL: 5 },
        },
        {
          id: 'color-2',
          color: 'Putih',
          imageFile: null,
          imagePreviewUrl: '',
          imageUrl: '',
          sizes: { S: 5, M: 10, L: 10, XL: 5 },
        },
      ]);
      fetchProducts();
      fetchStats();
    } catch (err: any) {
      setCreateErrorMsg(err.message);
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
            
            <div className="inline-block px-3 py-1 bg-stone-100 border border-stone-200 rounded-full">
              <span className="text-[10px] font-bold tracking-[0.2em] text-stone-600 uppercase">
                🔒 AREA TERPROTEKSI • ADMIN TOKO
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
            <span className="text-base leading-none">🛡️</span>
            <p className="text-[11px] text-amber-900/90 leading-tight">
              Sesi login Anda berlaku selama <strong>24 jam</strong>. Jika sama sekali tidak ada aktivitas/off selama 24 jam, sistem akan mengunci kembali demi keamanan data toko.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-semibold flex items-center gap-2">
              <span>⚠️</span>
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 text-sm transition-all shadow-2xs font-medium"
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
      if (p.total_stock === 0 || p.total_stock > 10) return false;
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

  // ─────────────────────────────────────────
  // MAIN SELLER DASHBOARD
  // ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin-toko" className="flex items-center gap-2.5">
              <div className="relative h-7 sm:h-8 w-auto flex-shrink-0">
                <Image
                  src="/DLRS_Logo.svg"
                  alt="DLRS Logo"
                  width={90}
                  height={36}
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              </div>
              <div className="border-l border-stone-200 pl-2.5">
                <p className="text-xs font-bold text-zinc-900 leading-tight">SELLER CENTER</p>
                <p className="hidden sm:block text-[10px] text-stone-400 font-medium">Katalog Pakaian</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime Live Sync Status */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-full text-[11px] font-semibold text-emerald-800 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Auto-Sync</span>
              {lastSyncTime && (
                <span className="text-emerald-700/80 font-mono text-[10px] pl-1 border-l border-emerald-300">
                  {lastSyncTime}
                </span>
              )}
            </div>

            {/* 24-Hour Active Session Badge */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200/90 rounded-full text-[11px] font-semibold text-stone-700 shadow-2xs" title="Sesi aktif selama 24 jam. Jika off selama 24 jam, sistem akan mengunci kembali.">
              <span className="text-xs">🕒</span>
              <span>Sesi 24 Jam</span>
            </div>

            {/* Quick Refresh Button */}
            <button
              type="button"
              onClick={() => syncAllData(false)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-white hover:bg-stone-50 border border-stone-200 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              title="Sinkronkan data pesanan dan stok terbaru dari database"
            >
              <span className={`text-xs ${isSyncing ? 'animate-spin inline-block' : ''}`}>🔄</span>
              <span className="hidden sm:inline">{isSyncing ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-stone-100 border border-stone-200 transition-colors"
            >
              <span>Lihat Toko</span>
              <span>↗</span>
            </Link>

            <Link
              href="/lacak-pesanan"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-zinc-900 transition-colors"
            >
              <span>Lacak Pesanan</span>
              <span>↗</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Kunci sesi dan keluar dari dashboard admin"
            >
              <span>🔒</span>
              <span className="hidden sm:inline">Kunci & Keluar</span>
              <span className="sm:hidden">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 w-full flex-1 space-y-5 sm:space-y-6">
        {/* Order Feedback Toast */}
        {orderFeedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in ${
              orderFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">{orderFeedback.type === 'success' ? '✓' : 'ℹ️'}</span>
              <span>{orderFeedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setOrderFeedback(null)}
              className="text-stone-400 hover:text-zinc-800 text-sm font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}
        {/* Metric Cards (Statistik Toko) */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('pesanan');
                setOrderStatusFilter('PENDING');
              }}
              className="bg-white p-3.5 sm:p-5 rounded-2xl border border-stone-200/80 shadow-sm text-left hover:border-amber-400 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs font-medium text-stone-500 mb-2">
                <span>Pesanan Menunggu WA</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-amber-900">
                {stats.pending_orders} <span className="text-xs font-normal text-stone-500">pesanan</span>
              </p>
              <p className="text-[11px] text-amber-700 mt-1 group-hover:underline">Klik untuk proses →</p>
            </button>

            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-stone-200/80 shadow-sm">
              <div className="text-xs font-medium text-stone-500 mb-2">
                Total Omset Penjualan
              </div>
              <p className="text-base min-[400px]:text-xl sm:text-2xl font-bold text-emerald-700 break-words">
                Rp {Number(stats?.total_revenue || 0).toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] text-stone-400 mt-1">
                Dari {stats.total_orders} total pesanan
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('stok')}
              className="bg-white p-3.5 sm:p-5 rounded-2xl border border-stone-200/80 shadow-sm text-left hover:border-zinc-400 transition-all cursor-pointer group"
            >
              <div className="text-xs font-medium text-stone-500 mb-2">
                Produk Aktif
              </div>
              <p className="text-xl sm:text-2xl font-bold text-zinc-900">
                {stats.total_products} <span className="text-xs font-normal text-stone-500">model baju</span>
              </p>
              <p className="text-[11px] text-zinc-600 mt-1 group-hover:underline">Kelola stok →</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className="bg-white p-3.5 sm:p-5 rounded-2xl border border-stone-200/80 shadow-sm text-left hover:border-rose-400 transition-all cursor-pointer group"
            >
              <div className="text-xs font-medium text-stone-500 mb-2 flex items-center justify-between">
                <span>Stok Habis / Menipis</span>
                {lowStockAlerts.length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                )}
              </div>
              <p className="text-xl sm:text-2xl font-bold text-rose-700">
                {stats.out_of_stock} <span className="text-xs font-normal text-stone-500">habis ({stats.low_stock} menipis)</span>
              </p>
              <p className="text-[11px] text-rose-600 mt-1 group-hover:underline">Buka alert stok & restock →</p>
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-white rounded-t-2xl px-4 sm:px-6 pt-3 gap-5 sm:gap-6 text-sm font-semibold text-stone-500 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveTab('pesanan')}
            className={`pb-3.5 border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'pesanan'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent hover:text-zinc-800'
            }`}
          >
            <span>📦</span>
            <span>Pesanan Masuk</span>
            {stats && stats.pending_orders > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {stats.pending_orders}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stok')}
            className={`pb-3.5 border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'stok'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent hover:text-zinc-800'
            }`}
          >
            <span>👕</span>
            <span>Produk & Stok</span>
            <span className="text-[10px] font-normal text-stone-400">({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`pb-3.5 border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'alerts'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent hover:text-zinc-800'
            }`}
          >
            <span>⚠️</span>
            <span>Alert Stok Menipis</span>
            {lowStockAlerts.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                {lowStockAlerts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tambah')}
            className={`pb-3.5 border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'tambah'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent hover:text-zinc-800'
            }`}
          >
            <span>➕</span>
            <span>Tambah Baju Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ongkir')}
            className={`pb-3.5 border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ongkir'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent hover:text-zinc-800'
            }`}
          >
            <span>🚚</span>
            <span>Tarif Ongkir Daerah</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────
            TAB 1: PESANAN MASUK
            ───────────────────────────────────────── */}
        {activeTab === 'pesanan' && (
          <div className="bg-white rounded-b-2xl p-4 sm:p-6 border border-t-0 border-stone-200/80 shadow-sm space-y-6 animate-fade-in">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
              <div className="flex flex-wrap gap-2 text-xs font-semibold w-full sm:w-auto">
                {[
                  { label: 'Semua Pesanan', val: 'ALL' },
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
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                      orderStatusFilter === f.val
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Cari No. Pesanan / Nama / No. WA..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            {/* Orders List */}
            {isLoadingOrders ? (
              <div className="py-12 text-center text-stone-400 text-sm">Memuat pesanan...</div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-2xl text-stone-400">
                  📭
                </div>
                <p className="text-sm font-medium text-stone-600">Tidak ada pesanan ditemukan.</p>
                <p className="text-xs text-stone-400">Pesanan dari customer yang checkout akan muncul di sini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => {
                  const statusColors = {
                    PENDING: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Menunggu WA' },
                    CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', label: 'Lunas & Sedang Dikemas' },
                    SHIPPED: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', label: 'Sedang Dikirim' },
                    COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', label: 'Selesai' },
                    CANCELLED: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', label: 'Dibatalkan (Stok Kembali)' },
                  }[o.status];

                  const cleanPhone = o.customer_phone.replace(/[^0-9]/g, '');
                  const waChatUrl = `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}`;

                  return (
                    <div
                      key={o.id}
                      className="border border-stone-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-shadow bg-stone-50/30 space-y-4"
                    >
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-zinc-900 text-sm">{o.order_number}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                          >
                            {statusColors.label}
                          </span>
                        </div>
                        <span className="text-xs text-stone-400">
                          {new Date(o.created_at).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      {/* Order Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
                        {/* Customer & Address (md:col-span-5) */}
                        <div className="md:col-span-5 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-bold text-zinc-900 text-sm">{o.customer_name}</p>
                            <a
                              href={waChatUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#25D366]/10 text-emerald-800 hover:bg-[#25D366]/20 font-semibold transition-colors"
                            >
                              <span>Chat WA ({o.customer_phone})</span>
                              <span>↗</span>
                            </a>
                          </div>

                          <div className="text-stone-600 bg-white p-3 rounded-xl border border-stone-200/60 space-y-1">
                            <p className="font-medium text-zinc-800">
                              📍 {o.shipping_city}{o.shipping_district ? `, Kec. ${o.shipping_district}` : ''}, {o.shipping_province}
                            </p>
                            <p className="text-stone-500">{o.shipping_address}</p>
                            {o.notes && (
                              <p className="text-amber-800 pt-1 font-medium italic">
                                💬 Catatan: &quot;{o.notes}&quot;
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Items Purchased (md:col-span-4) */}
                        <div className="md:col-span-4 space-y-2">
                          <p className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">
                            Barang yang Dipesan:
                          </p>
                          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-stone-200/60">
                            {o.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center gap-3 text-xs">
                                <div>
                                  <p className="font-semibold text-zinc-900">{item.product_title}</p>
                                  <p className="text-[11px] text-stone-500">
                                    {item.color} · Size {item.size} · {item.quantity} pcs
                                  </p>
                                </div>
                                <span className="font-semibold text-zinc-800 shrink-0 whitespace-nowrap">
                                  Rp {Number(item.subtotal).toLocaleString('id-ID')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payment & Actions (md:col-span-3) */}
                        <div className="md:col-span-3 space-y-3">
                          <div className="bg-white p-3 rounded-xl border border-stone-200/60 space-y-1">
                            <div className="flex justify-between text-stone-500 text-[11px]">
                              <span>Ongkir:</span>
                              <span>Rp {Number(o.shipping_cost).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between font-bold text-zinc-900 text-sm pt-1 border-t border-stone-100">
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
                                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm"
                                >
                                  ✓ Konfirmasi Lunas & Dikemas
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('Batalkan pesanan ini? Stok baju akan otomatis dikembalikan ke katalog.')) {
                                      handleUpdateOrderStatus(o.order_number, 'CANCELLED');
                                    }
                                  }}
                                  className="w-full py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg font-medium text-xs transition-colors"
                                >
                                  ✕ Batalkan (Stok Kembali)
                                </button>
                              </>
                            )}

                            {o.status === 'CONFIRMED' && (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  placeholder="Input No. Resi (JNE/J&T)..."
                                  value={editingResi[o.order_number] ?? (o.tracking_number || '')}
                                  onChange={(e) =>
                                    setEditingResi({ ...editingResi, [o.order_number]: e.target.value })
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateOrderStatus(
                                      o.order_number,
                                      'SHIPPED',
                                      editingResi[o.order_number] ?? o.tracking_number
                                    )
                                  }
                                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs transition-colors"
                                >
                                  🚚 Tandai Sedang Dikirim
                                </button>
                              </div>
                            )}

                            {o.status === 'SHIPPED' && (
                              <div className="space-y-2">
                                <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                                  <p className="text-[10px] text-purple-700 font-bold uppercase">No. Resi Kurir:</p>
                                  <p className="font-mono font-bold text-purple-900 text-xs">{o.tracking_number || '—'}</p>
                                </div>
                                <a
                                  href={`https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(
                                    `Halo Kak ${o.customer_name},\n\nPesanan pakaian Anda (*${o.order_number}*) telah kami kirimkan dengan nomor resi kurir: *${o.tracking_number}*.\n\nAnda dapat memantau perjalanan paket secara realtime di tautan:\nhttps://katalogpakaian.id/lacak-pesanan?order=${o.order_number}\n\nTerima kasih telah berbelanja!`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                                >
                                  <span>📱</span>
                                  <span>Kirim Resi ke WA Pembeli</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateOrderStatus(o.order_number, 'COMPLETED')}
                                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                                >
                                  ✓ Tandai Selesai
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
          <div className="bg-white rounded-b-2xl p-4 sm:p-6 border border-t-0 border-stone-200/80 shadow-sm space-y-6 animate-fade-in">
            {/* Header Title & CTA */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Kelola Produk & Stok Pakaian</h2>
                <p className="text-xs text-stone-500">
                  Cari baju, ubah status aktif/draft, kelola variasi warna & stok, atau lakukan aksi massal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('tambah')}
                className="self-start sm:self-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span>
                <span>Tambah Baju Baru</span>
              </button>
            </div>

            {/* Filter, Search & Sorting Bar */}
            <div className="bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cari nama pakaian, kategori, atau warna..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 rounded-xl border border-stone-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-stone-400"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs">🔍</span>
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filters & Sorter */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Category Filter */}
                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="ALL">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Stock Status Filter */}
                <select
                  value={productStockFilter}
                  onChange={(e) => setProductStockFilter(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="ALL">Semua Status Stok</option>
                  <option value="in_stock">Tersedia (&gt; 0)</option>
                  <option value="low_stock">Menipis (≤ 10)</option>
                  <option value="out_of_stock">Stok Habis (0)</option>
                  <option value="draft">Draft (Disembunyikan)</option>
                </select>

                {/* Sort Order */}
                <select
                  value={productSort}
                  onChange={(e) => setProductSort(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="newest">Terbaru Ditambahkan</option>
                  <option value="oldest">Terlama</option>
                  <option value="title_asc">Nama (A - Z)</option>
                  <option value="title_desc">Nama (Z - A)</option>
                  <option value="stock_high">Stok Terbanyak</option>
                  <option value="stock_low">Stok Tersedikit</option>
                </select>

                {(productSearch || productCategoryFilter !== 'ALL' || productStockFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearch('');
                      setProductCategoryFilter('ALL');
                      setProductStockFilter('ALL');
                    }}
                    className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
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
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    ✓ Aktifkan (Publish)
                  </button>
                  <button
                    type="button"
                    disabled={isPerformingBulkAction}
                    onClick={() => handleBulkAction('deactivate')}
                    className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    ⏸ Jadikan Draft
                  </button>
                  <button
                    type="button"
                    disabled={isPerformingBulkAction}
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    🗑 Hapus Terpilih
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProductIds([])}
                    className="px-2.5 py-1.5 text-stone-300 hover:text-white transition-colors"
                  >
                    ✕ Batal
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
                  ✕
                </button>
              </div>
            )}

            {/* Select All Checkbox Row */}
            <div className="flex items-center justify-between text-xs text-stone-500 px-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-stone-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                />
                <span>Pilih Semua ({filteredProducts.length} pakaian)</span>
              </label>
              <span>
                Menampilkan <strong>{filteredProducts.length}</strong> dari {products.length} produk
              </span>
            </div>

            {isLoadingProducts ? (
              <div className="py-12 text-center text-stone-400 text-sm">Memuat daftar pakaian...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <span className="text-3xl block">🔍</span>
                <p className="text-sm font-semibold text-zinc-800">Tidak ada produk yang sesuai dengan filter.</p>
                <p className="text-xs text-stone-400">Coba ubah kata kunci pencarian atau reset filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setProductSearch('');
                    setProductCategoryFilter('ALL');
                    setProductStockFilter('ALL');
                  }}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold"
                >
                  Lihat Semua Produk
                </button>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredProducts.map((p) => {
                  const isChecked = selectedProductIds.includes(p.id);

                  return (
                    <div
                      key={p.id}
                      className={`py-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between rounded-xl px-2 transition-colors ${
                        isChecked ? 'bg-amber-50/40' : p.is_active === false ? 'bg-stone-50/70 opacity-90' : ''
                      }`}
                    >
                      {/* Product Info Left */}
                      <div className="flex gap-3.5 items-start w-full md:w-auto min-w-0">
                        {/* Checkbox */}
                        <div className="pt-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectProduct(p.id)}
                            className="w-4 h-4 rounded border-stone-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                          />
                        </div>

                        {/* Thumbnail */}
                        <div className="relative w-16 h-20 bg-stone-100 rounded-xl overflow-hidden shrink-0 border border-stone-200">
                          {p.primary_image ? (
                            <Image
                              src={p.primary_image}
                              alt={p.title}
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

                        {/* Detail text */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/produk/${p.slug}`}
                              target="_blank"
                              className="font-bold text-zinc-900 text-sm hover:underline flex items-center gap-1"
                              title="Lihat halaman produk di web (tab baru)"
                            >
                              <span>{p.title}</span>
                              <span className="text-stone-400 text-xs">↗</span>
                            </Link>

                            {/* Status badge toggle (Aktif / Draft) */}
                            <button
                              type="button"
                              onClick={() => handleToggleProductStatus(p)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                p.is_active !== false
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-stone-200 text-stone-700 border-stone-300 hover:bg-stone-300'
                              }`}
                              title="Klik untuk ubah status Aktif/Draft produk"
                            >
                              {p.is_active !== false ? '🟢 Aktif' : '⚪ Draft (Sembunyi)'}
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-emerald-700">{p.formatted_price}</span>
                            <span className="text-stone-300">·</span>
                            <span className="text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                              {p.category?.name || 'Umum'}
                            </span>
                            <span className="text-stone-300">·</span>
                            <span className="text-[11px] text-stone-600 font-medium">
                              Total Stok: <strong>{p.total_stock} pcs</strong>
                            </span>
                          </div>

                          {/* Action Buttons: Preview, Edit, Foto Warna, Hapus */}
                          <div className="pt-1 flex flex-wrap items-center gap-1.5">
                            <Link
                              href={`/produk/${p.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                              title="Lihat tampilan produk seperti yang dilihat pembeli"
                            >
                              <span>👁️</span>
                              <span>Preview</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                              title="Edit nama, harga, deskripsi, kategori"
                            >
                              <span>✏️</span>
                              <span>Edit Info</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveColorModalProduct(p);
                                setColorModalSuccess(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                              title="Kelola foto per variasi warna baju"
                            >
                              <span>📸</span>
                              <span>Foto Warna ({p.images?.length || 0})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSingleProduct(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                              title="Hapus baju ini"
                            >
                              <span>🗑️</span>
                              <span>Hapus</span>
                            </button>
                          </div>

                          {/* Mini avatars for colors */}
                          <div className="pt-0.5 flex flex-wrap items-center gap-1.5">
                            {p.variants_by_color?.map((c) => (
                              <div
                                key={c.color}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 border border-stone-200 text-[10px]"
                                title={`Warna: ${c.color} ${c.color_image ? '(Ada Foto Khusus)' : '(Belum Ada Foto)'}`}
                              >
                                {c.color_image ? (
                                  <img
                                    src={c.color_image}
                                    alt={c.color}
                                    className="w-3 h-3 rounded-full object-cover border border-black/10"
                                  />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-stone-300 inline-block" />
                                )}
                                <span className="font-medium text-stone-700">{c.color}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Varian Stock Editor Right */}
                      <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                        {p.variants?.map((v) => {
                          const currentVal = editingStock[v.id] ?? v.stock_quantity;
                          const isUpdating = stockUpdatingId === v.id;

                          return (
                            <div
                              key={v.id}
                              className={`p-2 rounded-xl border flex items-center gap-2 text-xs transition-colors ${
                                v.stock_quantity === 0
                                  ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                                  : v.stock_quantity <= 3
                                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                                  : 'bg-stone-50 border-stone-200 text-zinc-900'
                              }`}
                            >
                              <div className="leading-tight">
                                <p className="font-bold">{v.size}</p>
                                <p className="text-[10px] text-stone-500">{v.color}</p>
                              </div>

                              {/* - Input + and Simpan */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingStock({
                                      ...editingStock,
                                      [v.id]: Math.max(0, currentVal - 1),
                                    })
                                  }
                                  className="w-7 h-7 sm:w-5 sm:h-6 bg-white hover:bg-stone-200 text-stone-700 rounded border border-stone-300 text-[10px] font-bold flex items-center justify-center cursor-pointer"
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
                                      [v.id]: Math.max(0, parseInt(e.target.value) || 0),
                                    })
                                  }
                                  className="w-11 px-1 py-1 text-center font-bold bg-white rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-zinc-900 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingStock({
                                      ...editingStock,
                                      [v.id]: currentVal + 1,
                                    })
                                  }
                                  className="w-7 h-7 sm:w-5 sm:h-6 bg-white hover:bg-stone-200 text-stone-700 rounded border border-stone-300 text-[10px] font-bold flex items-center justify-center cursor-pointer"
                                  title="Tambah 1"
                                >
                                  +
                                </button>

                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateStock(v.id, currentVal)}
                                  className="px-2.5 py-1.5 sm:px-2 sm:py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isUpdating ? '...' : 'Simpan'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────
            TAB 2B: ALERT STOK MENIPIS & HABIS
            ───────────────────────────────────────── */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-b-2xl p-4 sm:p-6 border border-t-0 border-stone-200/80 shadow-sm space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <span>⚠️ Alert Stok Pakaian Menipis & Habis</span>
                  {lowStockAlerts.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                      {lowStockAlerts.length} Variasi Perlu Restock
                    </span>
                  )}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Daftar variasi pakaian yang kehabisan stok (0 pcs) atau hampir habis (≤ 5 pcs). Lakukan restock instan di sini.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchLowStockAlerts}
                className="self-start sm:self-auto px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl border border-stone-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔄</span>
                <span>Refresh Data Alert</span>
              </button>
            </div>

            {/* Alert Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-rose-700">Stok Habis (0 pcs)</p>
                  <p className="text-xl font-bold text-rose-900">
                    {lowStockAlerts.filter((a) => a.status === 'Habis').length} <span className="text-xs font-normal">variasi</span>
                  </p>
                </div>
                <span className="text-2xl">🚫</span>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-700">Stok Menipis (1 - 5 pcs)</p>
                  <p className="text-xl font-bold text-amber-900">
                    {lowStockAlerts.filter((a) => a.status === 'Menipis').length} <span className="text-xs font-normal">variasi</span>
                  </p>
                </div>
                <span className="text-2xl">⚡</span>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-700">Total Baju Aktif di Toko</p>
                  <p className="text-xl font-bold text-emerald-900">
                    {products.filter((p) => p.is_active !== false).length} <span className="text-xs font-normal">model baju</span>
                  </p>
                </div>
                <span className="text-2xl">👕</span>
              </div>
            </div>

            {/* Alert List */}
            {isLoadingAlerts ? (
              <div className="py-12 text-center text-stone-400 text-sm">Memeriksa stok varian pakaian...</div>
            ) : lowStockAlerts.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <span className="text-4xl block">🎉</span>
                <h3 className="text-base font-bold text-zinc-900">Semua Stok Pakaian Aman!</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Tidak ada variasi warna maupun ukuran yang kehabisan stok saat ini. Semua pesanan dapat dilayani dengan lancar.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {lowStockAlerts.map((item) => {
                  const isRestocking = alertRestockingKey === String(item.variant_id);
                  const customAmount = alertRestockAmounts[item.variant_id] ?? 10;

                  return (
                    <div
                      key={`${item.product_id}-${item.color}-${item.size}`}
                      className="py-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                    >
                      {/* Product & Variant info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative w-12 h-14 bg-stone-100 rounded-lg overflow-hidden shrink-0 border border-stone-200">
                          {item.primary_image ? (
                            <Image
                              src={item.primary_image}
                              alt={item.product_title}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300 text-[10px]">
                              Foto
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <Link
                            href={`/produk/${item.product_slug}`}
                            target="_blank"
                            className="font-bold text-zinc-900 text-sm hover:underline flex items-center gap-1"
                          >
                            <span>{item.product_title}</span>
                            <span className="text-stone-400 text-xs">↗</span>
                          </Link>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-semibold text-stone-600">
                              Warna: <strong className="text-zinc-900">{item.color}</strong>
                            </span>
                            <span className="text-stone-300">·</span>
                            <span className="font-semibold text-stone-600">
                              Ukuran: <strong className="text-zinc-900">{item.size}</strong>
                            </span>
                            <span className="text-stone-300">·</span>
                            <span className="text-[11px] text-stone-400">
                              {item.category_name || 'Katalog'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stock badge & quick restock */}
                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                              item.status === 'Habis'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {item.status === 'Habis' ? 'HABIS (0 pcs)' : `SISA ${item.stock_quantity} pcs`}
                          </span>
                        </div>

                        {/* Quick Restock Action Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 bg-stone-50 p-1.5 rounded-xl border border-stone-200">
                          <span className="text-[11px] font-semibold text-stone-500 px-1">Restock:</span>
                          <button
                            type="button"
                            disabled={isRestocking}
                            onClick={() => handleQuickRestockAlertVariant(item.variant_id, item.stock_quantity, 5)}
                            className="px-2 py-1 bg-white hover:bg-stone-100 text-zinc-900 border border-stone-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                            title="Tambah 5 pcs"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            disabled={isRestocking}
                            onClick={() => handleQuickRestockAlertVariant(item.variant_id, item.stock_quantity, 10)}
                            className="px-2 py-1 bg-white hover:bg-stone-100 text-zinc-900 border border-stone-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                            title="Tambah 10 pcs"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            disabled={isRestocking}
                            onClick={() => handleQuickRestockAlertVariant(item.variant_id, item.stock_quantity, 20)}
                            className="px-2 py-1 bg-white hover:bg-stone-100 text-zinc-900 border border-stone-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                            title="Tambah 20 pcs"
                          >
                            +20
                          </button>

                          <div className="h-4 w-px bg-stone-200 mx-0.5" />

                          <input
                            type="number"
                            min="0"
                            value={customAmount}
                            onChange={(e) =>
                              setAlertRestockAmounts({
                                ...alertRestockAmounts,
                                [item.variant_id]: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            className="w-12 px-1 py-1 text-center font-bold bg-white rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            title="Set angka stok langsung"
                          />
                          <button
                            type="button"
                            disabled={isRestocking}
                            onClick={() => handleUpdateStock(item.variant_id, customAmount)}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isRestocking ? '...' : 'Set'}
                          </button>
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
            TAB 3: TAMBAH BAJU BARU
            ───────────────────────────────────────── */}
        {activeTab === 'tambah' && (
          <div className="bg-white rounded-b-2xl p-4 sm:p-8 border border-t-0 border-stone-200/80 shadow-sm max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Tambah Baju Baru ke Katalog</h2>
              <p className="text-xs text-stone-500">
                Isi form sederhana di bawah ini untuk menampilkan pakaian baru di website Anda.
              </p>
            </div>

            {createSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                {createSuccessMsg}
              </div>
            )}

            {createErrorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                {createErrorMsg}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Nama Pakaian / Baju <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kemeja Flannel Tartan Casual"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Harga Jual (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 189000"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Kategori Pakaian
                  </label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ─────────────────────────────────────────
                  VARIASI WARNA & FOTO (MULTI-COLOR UPLOAD)
                  ───────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-zinc-900 text-sm">
                      Variasi Warna & Foto Khusus Pakaian
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Upload foto untuk setiap warna pakaian. Foto akan otomatis berganti saat pembeli memilih warna tersebut.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addColorVariation}
                    className="self-start shrink-0 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-zinc-800 rounded-xl text-xs font-bold border border-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>+</span>
                    <span>Tambah Warna Lain</span>
                  </button>
                </div>

                {colorVariations.map((cVar, idx) => (
                  <div
                    key={cVar.id}
                    className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 transition-all"
                  >
                    {/* Header Variation */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/70 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-zinc-900 text-xs">
                          Variasi Warna: <span className="text-zinc-600">{cVar.color || 'Belum dinamai'}</span>
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                            Foto Utama / Cover
                          </span>
                        )}
                      </div>

                      {colorVariations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColorVariation(cVar.id)}
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                        >
                          ✕ Hapus Warna Ini
                        </button>
                      )}
                    </div>

                    {/* Nama Warna & Presets */}
                    <div className="space-y-1.5">
                      <label className="block font-semibold text-zinc-700 text-[11px]">
                        Nama Warna <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Misal: Hitam, Putih, Sage Green, Krem..."
                        value={cVar.color}
                        onChange={(e) => updateColorVariation(cVar.id, { color: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                      />
                      {/* Color Suggestions */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-stone-400">Pilihan Cepat:</span>
                        {['Hitam', 'Putih', 'Navy', 'Sage Green', 'Krem', 'Cokelat', 'Maroon', 'Abu-abu'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => updateColorVariation(cVar.id, { color: preset })}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors cursor-pointer ${
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
                    <div className="space-y-2 p-3 bg-white rounded-xl border border-stone-200">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-zinc-800 text-[11px] flex items-center gap-1.5">
                          <span>📸</span>
                          <span>Upload Foto Pakaian untuk Warna {cVar.color || `#${idx + 1}`}</span>
                        </label>
                        {cVar.imagePreviewUrl && (
                          <span className="text-[10px] text-emerald-600 font-bold">✓ Foto terpilih</span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        {/* Thumbnail Preview */}
                        <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-stone-100 border border-stone-300 shrink-0 flex items-center justify-center">
                          {cVar.imagePreviewUrl || cVar.imageUrl ? (
                            <img
                              src={cVar.imagePreviewUrl || cVar.imageUrl}
                              alt={cVar.color}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-1 text-stone-300 text-[10px] leading-tight">
                              <span>Foto {cVar.color || `#${idx + 1}`}</span>
                            </div>
                          )}
                        </div>

                        {/* File & URL Inputs */}
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
                            onChange={(e) => updateColorVariation(cVar.id, { imageUrl: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-[11px] bg-stone-50 focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stok Ukuran untuk Warna Ini */}
                    <div className="space-y-1.5">
                      <label className="block font-semibold text-zinc-700 text-[11px]">
                        Stok Ukuran untuk Warna {cVar.color || `#${idx + 1}`} (pcs)
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {['S', 'M', 'L', 'XL'].map((size) => (
                          <div
                            key={size}
                            className="bg-white p-2 rounded-xl border border-stone-200 text-center space-y-1"
                          >
                            <span className="font-bold text-zinc-800 text-[11px]">Size {size}</span>
                            <input
                              type="number"
                              min={0}
                              value={cVar.sizes[size] ?? 0}
                              onChange={(e) =>
                                updateColorVariation(cVar.id, {
                                  sizes: { ...cVar.sizes, [size]: parseInt(e.target.value) || 0 },
                                })
                              }
                              className="w-full px-1 py-1 rounded border border-stone-300 text-center font-bold text-xs"
                            />
                            <span className="text-[9px] text-stone-400 block">pcs</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Tombol Tambah Warna Lain */}
                <button
                  type="button"
                  onClick={addColorVariation}
                  className="w-full py-3 border-2 border-dashed border-stone-300 hover:border-zinc-800 hover:bg-stone-50 rounded-2xl text-xs font-bold text-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-base">+</span>
                  <span>Tambah Variasi Warna Pakaian Lain (Contoh: Putih, Sage, Cream)</span>
                </button>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Deskripsi Bahan & Keterangan
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Bahan linen premium adem, jahitan rapi, cocok untuk semi-formal dan santai."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingProduct}
                className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
              >
                {isCreatingProduct ? 'Menyimpan Produk...' : '✓ Simpan & Tayangkan di Katalog'}
              </button>
            </form>
          </div>
        )}

        {/* ─────────────────────────────────────────
            TAB 4: TARIF ONGKIR
            ───────────────────────────────────────── */}
        {activeTab === 'ongkir' && (
          <div className="bg-white rounded-b-2xl p-4 sm:p-6 border border-t-0 border-stone-200/80 shadow-sm space-y-4 animate-fade-in">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Tarif Ongkos Kirim per Provinsi</h2>
              <p className="text-xs text-stone-500">
                Tarif flat ini akan otomatis muncul dan diakumulasikan ke total tagihan saat pembeli memilih daerahnya di halaman checkout.
              </p>
            </div>

            <div className="divide-y divide-stone-100">
              {shippingRates.map((r) => (
                <div key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
                  <div>
                    <p className="font-bold text-zinc-900">{r.province}</p>
                    <p className="text-[11px] text-stone-400">Estimasi sampai: {r.estimated_delivery}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-stone-500 font-semibold">Rp</span>
                    <input
                      type="number"
                      value={editingRates[r.id] ?? r.cost}
                      onChange={(e) =>
                        setEditingRates({ ...editingRates, [r.id]: e.target.value })
                      }
                      className="w-24 px-2 py-1 border border-stone-300 rounded-lg text-xs font-bold text-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateShippingRate(r.id)}
                      className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg text-xs transition-colors"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────
          MODAL: KELOLA FOTO VARIASI WARNA (PRODUK TERDAFTAR)
          ───────────────────────────────────────── */}
      {activeColorModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92dvh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 flex items-center justify-between gap-3 bg-stone-50/80">
              <div className="min-w-0">
                <h3 className="font-bold text-zinc-900 text-base flex items-center gap-2">
                  <span>📸</span>
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
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-5 sm:space-y-6">
              {colorModalSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-fade-in">
                  {colorModalSuccess}
                </div>
              )}

              <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl text-amber-900 text-xs">
                💡 <strong>Tips:</strong> Foto yang diunggah di sini akan otomatis tampil saat pembeli mengklik tombol pilihan warna di katalog atau halaman produk.
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

                    return (
                      <div
                        key={c.color}
                        className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
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
                            <span className="font-bold text-zinc-900 text-sm">{c.color}</span>
                            <p className="text-[11px] text-stone-500">
                              {c.color_image ? (
                                <span className="text-emerald-700 font-semibold">✓ Foto terpasang</span>
                              ) : (
                                <span className="text-amber-700 font-semibold">⚠️ Belum ada foto</span>
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

                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => handleUploadColorImage(activeColorModalProduct.id, c.color)}
                                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isUploading ? 'Menyimpan...' : 'Simpan Foto'}
                              </button>

                              {c.image_id && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProductImage(activeColorModalProduct.id, c.image_id!)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  Hapus
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
                    <span>✨</span>
                    <span>Tambah Variasi Warna Baru ke Produk Ini:</span>
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Tambahkan warna baru (misal: Sage Green, Navy, Krem) lengkap dengan foto dan stok ukurannya.
                  </p>
                </div>

                {/* Nama Warna & Chips */}
                <div className="space-y-1.5">
                  <label className="block font-semibold text-zinc-700 text-[11px]">
                    Nama Warna Baru <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ketik nama warna (misal: Sage Green, Krem, Navy)..."
                    value={newCustomColorName}
                    onChange={(e) => setNewCustomColorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-stone-400">Pilihan Cepat:</span>
                    {['Hitam', 'Putih', 'Navy', 'Sage Green', 'Krem', 'Cokelat', 'Maroon', 'Abu-abu'].map((preset) => (
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
                    <span>📸</span>
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
                  <label className="block font-semibold text-zinc-700 text-[11px]">
                    Stok Ukuran Awal untuk Warna Ini (pcs):
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['S', 'M', 'L', 'XL'].map((s) => (
                      <div key={s} className="bg-white p-2 rounded-xl border border-stone-200 text-center">
                        <span className="block text-[10px] font-bold text-zinc-500 mb-1">Size {s}</span>
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
                  <span>✓</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 flex justify-between items-center gap-3 bg-stone-50">
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                  <span>✏️</span>
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
                ✕
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
                  placeholder="Misal: Kemeja Linen Premium Putih"
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
                    placeholder="Contoh: 189000"
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
                  {editIsActive ? '🟢 Aktif (Tampil)' : '⚪ Draft (Sembunyi)'}
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
                  <span>✓</span>
                  <span>{isSavingEditProduct ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
