import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type WishlistItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  slug: string;
};

type Ctx = {
  items: WishlistItem[];
  has: (id: string) => boolean;
  toggle: (item: WishlistItem) => void;
  remove: (id: string) => void;
  count: number;
};

const WishlistCtx = createContext<Ctx | null>(null);
const KEY = "lovable_wishlist_v1";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);

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
    has: (id) => items.some((i) => i.id === id),
    toggle: (item) =>
      setItems((cur) =>
        cur.some((i) => i.id === item.id) ? cur.filter((i) => i.id !== item.id) : [...cur, item],
      ),
    remove: (id) => setItems((cur) => cur.filter((i) => i.id !== id)),
    count: items.length,
  }), [items]);

  return <WishlistCtx.Provider value={value}>{children}</WishlistCtx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistCtx);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
