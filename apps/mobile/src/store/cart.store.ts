import { create } from 'zustand';
import type { SupplierProduct } from '../api/market';

export interface CartItem {
  product: SupplierProduct;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: SupplierProduct) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalKes: () => number;
  totalCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product) => {
    const existing = get().items.find((i) => i.product.id === product.id);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      });
    } else {
      set({ items: [...get().items, { product, quantity: 1 }] });
    }
  },

  removeItem: (productId) =>
    set({ items: get().items.filter((i) => i.product.id !== productId) }),

  updateQty: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
    } else {
      set({
        items: get().items.map((i) =>
          i.product.id === productId ? { ...i, quantity } : i,
        ),
      });
    }
  },

  clearCart: () => set({ items: [] }),

  totalKes: () =>
    get().items.reduce((sum, i) => sum + i.product.pricePerUnit * i.quantity, 0),

  totalCount: () =>
    get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
