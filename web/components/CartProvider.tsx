"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type CartMap = Record<number, number>;

type CartContextValue = {
  items: CartMap;
  count: number;
  add: (productId: number, maxStock?: number) => void;
  setQuantity: (productId: number, quantity: number, maxStock?: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "emo-store-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartMap>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartMap);
    } catch {
      /* ignore broken storage */
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((productId: number, maxStock = 99) => {
    setItems((current) => ({
      ...current,
      [productId]: Math.min((current[productId] ?? 0) + 1, Math.max(1, maxStock)),
    }));
  }, []);

  const setQuantity = useCallback(
    (productId: number, quantity: number, maxStock = 99) => {
      setItems((current) => {
        const next = { ...current };
        const safe = Math.floor(quantity);
        if (safe <= 0) delete next[productId];
        else next[productId] = Math.min(safe, Math.max(1, maxStock));
        return next;
      });
    },
    [],
  );

  const remove = useCallback((productId: number) => {
    setItems((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }, []);

  const clear = useCallback(() => setItems({}), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: Object.values(items).reduce((sum, qty) => sum + qty, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
