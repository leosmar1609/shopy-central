import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  slug: string;
};

type Ctx = {
  items: CartItem[];
  add: (i: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "lovable_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<Ctx>(() => ({
    items,
    add: (i, qty = 1) =>
      setItems((cur) => {
        const ex = cur.find((c) => c.id === i.id);
        if (ex) return cur.map((c) => (c.id === i.id ? { ...c, quantity: c.quantity + qty } : c));
        return [...cur, { ...i, quantity: qty }];
      }),
    remove: (id) => setItems((cur) => cur.filter((c) => c.id !== id)),
    setQty: (id, qty) =>
      setItems((cur) => cur.map((c) => (c.id === id ? { ...c, quantity: Math.max(1, qty) } : c))),
    clear: () => setItems([]),
    subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
    count: items.reduce((s, i) => s + i.quantity, 0),
  }), [items]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
