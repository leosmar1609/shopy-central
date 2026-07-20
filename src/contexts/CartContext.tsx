import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  slug: string;
  weight_kg?: number | null;
  size?: string | null;
};

// Roupas com tamanhos diferentes são linhas distintas no carrinho — o mesmo produto em
// P e em M não pode virar uma única linha com quantidade somada.
const sameLine = (a: { id: string; size?: string | null }, b: { id: string; size?: string | null }) =>
  a.id === b.id && (a.size ?? null) === (b.size ?? null);

type Ctx = {
  items: CartItem[];
  add: (i: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string, size?: string | null) => void;
  setQty: (id: string, qty: number, size?: string | null) => void;
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
      const raw = typeof window !== "undefined" ? sessionStorage.getItem(KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") sessionStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<Ctx>(() => ({
    items,
    add: (i, qty = 1) =>
      setItems((cur) => {
        const ex = cur.find((c) => sameLine(c, i));
        if (ex) return cur.map((c) => (sameLine(c, i) ? { ...c, quantity: c.quantity + qty } : c));
        return [...cur, { ...i, quantity: qty }];
      }),
    remove: (id, size) => setItems((cur) => cur.filter((c) => !sameLine(c, { id, size }))),
    setQty: (id, qty, size) =>
      setItems((cur) => cur.map((c) => (sameLine(c, { id, size }) ? { ...c, quantity: Math.max(1, qty) } : c))),
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
