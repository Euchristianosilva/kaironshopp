import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "./products";

type CartItem = { product: Product; qty: number };

type Store = {
  cart: CartItem[];
  favorites: string[];
  addToCart: (p: Product, qty?: number) => void;
  buyNow: (p: Product, qty?: number) => void;
  updateQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  toggleFavorite: (id: string) => void;
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      cart: [],
      favorites: [],
      addToCart: (p, qty = 1) =>
        set((s) => {
          const existing = s.cart.find((i) => i.product.id === p.id);
          if (existing) {
            return {
              cart: s.cart.map((i) =>
                i.product.id === p.id ? { ...i, qty: i.qty + qty } : i,
              ),
            };
          }
          return { cart: [...s.cart, { product: p, qty }] };
        }),
      buyNow: (p, qty = 1) => set({ cart: [{ product: p, qty: Math.max(1, qty) }] }),
      updateQty: (id, qty) =>
        set((s) => ({
          cart: s.cart.map((i) => (i.product.id === id ? { ...i, qty: Math.max(1, qty) } : i)),
        })),
      removeFromCart: (id) =>
        set((s) => ({ cart: s.cart.filter((i) => i.product.id !== id) })),
      clearCart: () => set({ cart: [] }),
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id],
        })),
    }),
    { name: "marketplace-store" },
  ),
);
