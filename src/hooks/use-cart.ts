import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  product_id: string;
  name: string;
  price: number;
  image_url: string | null;
  unit: string | null;
  qty: number;
};

const KEY = "gk_bazaar_cart_v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(read());
    const handler = () => setItems(read());
    window.addEventListener("gk-cart-updated", handler);
    return () => window.removeEventListener("gk-cart-updated", handler);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("gk-cart-updated"));
  }, []);

  const add = useCallback((item: Omit<CartItem, "qty">, delta = 1) => {
    const cur = read();
    const idx = cur.findIndex((c) => c.product_id === item.product_id);
    if (idx >= 0) {
      const nextQty = Math.max(0, cur[idx].qty + delta);
      if (nextQty === 0) cur.splice(idx, 1);
      else cur[idx].qty = nextQty;
    } else if (delta > 0) {
      cur.push({ ...item, qty: delta });
    }
    persist(cur);
  }, [persist]);

  const setQty = useCallback((product_id: string, qty: number) => {
    const cur = read();
    const idx = cur.findIndex((c) => c.product_id === product_id);
    if (idx >= 0) {
      if (qty <= 0) cur.splice(idx, 1);
      else cur[idx].qty = qty;
      persist(cur);
    }
  }, [persist]);

  const clear = useCallback(() => persist([]), [persist]);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return { items, add, setQty, clear, total, count };
}
