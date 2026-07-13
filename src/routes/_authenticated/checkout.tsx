import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CustomerHeader } from "@/components/customer-header";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { placeOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/checkout")({
  component: Checkout,
});

function Checkout() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const place = useServerFn(placeOrder);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    grabLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function grabLocation() {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Location captured");
      },
      (err) => {
        setLocating(false);
        toast.error(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit() {
    if (items.length === 0) return toast.error("Cart is empty");
    if (address.trim().length < 5) return toast.error("Please enter delivery address");
    setSubmitting(true);
    try {
      const order = await place({
        data: {
          items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
          address,
          customer_lat: loc?.lat ?? null,
          customer_lng: loc?.lng ?? null,
          notes: notes || null,
        },
      });
      clear();
      toast.success("Order placed!");
      navigate({ to: "/orders/$id", params: { id: order.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <CustomerHeader />
      <div className="mx-auto grid max-w-3xl gap-4 px-4 py-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-bold">Delivery address</h2>
            <Label>Full address</Label>
            <Textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House / flat, street, area, landmark" />
            <div className="mt-3 flex items-center justify-between rounded-lg bg-accent/50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand" />
                {loc ? <>Live location captured ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})</> : <>No live location yet</>}
              </div>
              <Button size="sm" variant="outline" disabled={locating} onClick={grabLocation}>
                {locating ? "Locating…" : loc ? "Update" : "Enable GPS"}
              </Button>
            </div>
            <div className="mt-3">
              <Label>Notes for delivery agent (optional)</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 h-fit">
          <h2 className="mb-3 font-bold">Order summary</h2>
          <div className="space-y-1 text-sm">
            {items.map((i) => (
              <div key={i.product_id} className="flex justify-between"><span>{i.name} × {i.qty}</span><span>₹{(i.price * i.qty).toFixed(0)}</span></div>
            ))}
          </div>
          <div className="mt-3 border-t pt-2 text-sm text-muted-foreground flex justify-between"><span>Delivery</span><span>FREE</span></div>
          <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          <div className="mt-3 rounded-lg bg-brand/10 p-2 text-center text-xs font-semibold text-brand">Cash on Delivery</div>
          <Button size="lg" className="mt-4 w-full bg-brand text-brand-foreground hover:bg-brand/90" disabled={submitting} onClick={submit}>
            {submitting ? "Placing…" : "Place Order (COD)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
