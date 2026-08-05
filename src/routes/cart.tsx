import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { DELIVERY_FEE, FREE_DELIVERY_ABOVE } from "@/lib/pricing";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, add, setQty, total, count } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <CustomerHeader />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Your cart</h1>
        {count === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link to="/"><Button className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90">Start shopping</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.product_id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="h-16 w-16 overflow-hidden rounded-lg bg-muted">
                  {it.image_url && <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{it.name}</div>
                  <div className="text-xs text-muted-foreground">{it.unit} · ₹{it.price}</div>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-brand text-brand-foreground">
                  <button className="grid h-8 w-8 place-items-center" onClick={() => add({ product_id: it.product_id, name: it.name, price: it.price, image_url: it.image_url, unit: it.unit }, -1)}><Minus className="h-4 w-4" /></button>
                  <span className="w-6 text-center text-sm font-bold">{it.qty}</span>
                  <button className="grid h-8 w-8 place-items-center" onClick={() => add({ product_id: it.product_id, name: it.name, price: it.price, image_url: it.image_url, unit: it.unit })}><Plus className="h-4 w-4" /></button>
                </div>
                <div className="w-16 text-right text-sm font-bold">₹{(it.price * it.qty).toFixed(0)}</div>
                <button onClick={() => setQty(it.product_id, 0)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between text-sm"><span>Subtotal</span><span>₹{total.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Delivery</span>
                <span>{total >= FREE_DELIVERY_ABOVE ? "FREE" : `₹${DELIVERY_FEE}`}</span>
              </div>
              {total < FREE_DELIVERY_ABOVE && (
                <div className="mt-1 rounded-lg bg-brand/10 p-2 text-xs font-medium text-brand">
                  Add ₹{(FREE_DELIVERY_ABOVE - total).toFixed(0)} more to get FREE delivery
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-bold">
                <span>Total</span>
                <span>₹{(total + (total >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE)).toFixed(2)}</span>
              </div>
              <Button size="lg" className="mt-4 w-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate({ to: "/checkout" })}>
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
