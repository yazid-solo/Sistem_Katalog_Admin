'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem } from '@/types';

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (variantId: number) => void;
  updateQuantity: (variantId: number, quantity: number) => void;
  clearCart: () => void;
  syncStockWithServer: () => Promise<string | null>;
  totalItems: number;
  subtotal: number;
  lastAddedItem: CartItem | null;
  clearLastAdded: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'katalog_pakaian_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<CartItem | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever items change (after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [items, isLoaded]);

  const addToCart = (newItem: CartItem) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.variantId === newItem.variantId);
      if (existingIdx > -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = Math.min(existing.quantity + newItem.quantity, newItem.maxStock);
        updated[existingIdx] = { ...existing, quantity: newQty };
        return updated;
      }
      return [...prev, newItem];
    });

    setLastAddedItem(newItem);
  };

  const removeFromCart = (variantId: number) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const updateQuantity = (variantId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.variantId === variantId) {
          const clamped = Math.min(Math.max(1, quantity), i.maxStock);
          return { ...i, quantity: clamped };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {}
  };

  const clearLastAdded = () => {
    setLastAddedItem(null);
  };

  const syncStockWithServer = async (): Promise<string | null> => {
    if (items.length === 0) return null;
    try {
      const ids = items.map((i) => i.variantId).join(',');
      const res = await fetch(`/api/orders/cart-stock/?variant_ids=${ids}`);
      if (!res.ok) return null;
      const data = await res.json();
      const serverVariants: {
        variant_id: number;
        stock_quantity: number;
        price: number;
        is_product_active: boolean;
      }[] = data.variants || [];

      if (serverVariants.length === 0) return null;

      const stockMap = new Map(serverVariants.map((v) => [v.variant_id, v]));
      const notices: string[] = [];

      setItems((prev) => {
        const next: CartItem[] = [];
        for (const item of prev) {
          const live = stockMap.get(item.variantId);
          if (!live || live.stock_quantity <= 0 || !live.is_product_active) {
            notices.push(`"${item.productTitle}" (${item.color} - ${item.size}) dihapus karena stok habis.`);
            continue;
          }
          const clampedQty = Math.min(item.quantity, live.stock_quantity);
          if (clampedQty < item.quantity) {
            notices.push(
              `Jumlah "${item.productTitle}" (${item.color} - ${item.size}) disesuaikan menjadi ${clampedQty} pcs mengikuti sisa stok terbaru.`
            );
          }
          next.push({
            ...item,
            quantity: clampedQty,
            maxStock: live.stock_quantity,
            price: live.price || item.price,
          });
        }
        return next;
      });

      return notices.length > 0 ? notices.join(' ') : null;
    } catch {
      return null;
    }
  };

  const totalItems = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        syncStockWithServer,
        totalItems,
        subtotal,
        lastAddedItem,
        clearLastAdded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
