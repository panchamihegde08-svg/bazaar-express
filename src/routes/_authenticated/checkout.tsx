import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CustomerHeader } from "@/components/customer-header";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Timer, Ticket, Wallet } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { placeOrder } from "@/lib/orders.functions";
import { listMyAddresses, saveAddress, validateCoupon, getWallet } from "@/lib/shop.functions";
import { DELIVERY_FEE, FREE_DELIVERY_ABOVE } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/checkout")({
  component: Checkout,
});

function Checkout() {
  const { items, total: subtotal, clear } = useCart();
  const navigate = useNavigate();
  const place = useServerFn(placeOrder);
  const fetchAddresses = useServerFn(listMyAddresses);
  const storeAddress = useServerFn(saveAddress);
  const checkCoupon = useServerFn(validateCoupon);
  const fetchWallet = useServerFn(getWallet);

  const addresses = useQuery({ queryKey: ["addresses"], queryFn: () => fetchAddresses() });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [saveNew, setSaveNew] = useState(true);
  const [label, setLabel] = useState("Home");
  const [notes, setNotes] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    grabLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const list = addresses.data;
    if (list && list.length > 0 && !selectedAddressId) {
      const def = list.find((a) => a.is_default) ?? list[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses.data, selectedAddressId]);

  const selected = addresses.data?.find((a) => a.id === selectedAddressId) ?? null;
  const deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const discount = coupon?.discount ?? 0;
  const payableBeforeWallet = Math.max(0, subtotal - discount + deliveryFee);
  const walletBalance = wallet.data?.balance ?? 0;
  const walletUsed = useWallet ? Math.min(walletBalance, payableBeforeWallet) : 0;
  const total = payableBeforeWallet - walletUsed;

  function grabLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function applyCoupon() {
    try {
      const res = await checkCoupon({ data: { code: couponInput, subtotal } });
      setCoupon({ code: res.code, discount: res.discount });
      toast.success(`Coupon ${res.code} applied — you saved ₹${res.discount.toFixed(0)}`);
    } catch (e) {
      setCoupon(null);
      toast.error(e instanceof Error ? e.message : "Invalid coupon");
    }
  }

  async function submit() {
    if (items.length === 0) return toast.error("Cart is empty");
    const finalAddress = selected ? selected.full_address : address;
    if (finalAddress.trim().length < 5) return toast.error("Please enter delivery address");
    setSubmitting(true);
    try {
      if (!selected && saveNew) {
        await storeAddress({
          data: {
            label,
            full_address: finalAddress,
            lat: loc?.lat ?? null,
            lng: loc?.lng ?? null,
            is_default: (addresses.data?.length ?? 0) === 0,
          },
        }).catch(() => {});
      }
      const order = await place({
        data: {
          items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
          address: finalAddress,
          customer_lat: loc?.lat ?? (selected?.lat != null ? Number(selected.lat) : null),
          customer_lng: loc?.lng ?? (selected?.lng != null ? Number(selected.lng) : null),
          notes: notes || null,
          coupon_code: coupon?.code ?? null,
          use_wallet: useWallet,
        },
      });
      clear();
      toast.success("Order placed! Arriving in ~15 minutes");
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
      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-2xl border bg-brand/10 p-4 text-sm font-semibold text-brand">
            <Timer className="h-4 w-4" /> Estimated delivery in 15 minutes
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-bold">Delivery address</h2>

            {(addresses.data?.length ?? 0) > 0 && (
              <div className="mb-4 space-y-2">
                {addresses.data?.map((a) => (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${selectedAddressId === a.id ? "border-brand bg-brand/5" : ""}`}
                  >
                    <input
                      type="radio"
                      className="mt-1"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                    />
                    <div>
                      <div className="text-sm font-semibold">{a.label}</div>
                      <div className="text-xs text-muted-foreground">{a.full_address}</div>
                    </div>
                  </label>
                ))}
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selectedAddressId === null ? "border-brand bg-brand/5" : ""}`}>
                  <input type="radio" checked={selectedAddressId === null} onChange={() => setSelectedAddressId(null)} />
                  <span className="text-sm font-semibold">Use a new address</span>
                </label>
              </div>
            )}

            {!selected && (
              <>
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home / Work" />
                <Label className="mt-2 block">Full address</Label>
                <Textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House / flat, street, area, landmark" />
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} /> Save this address for next time
                </label>
              </>
            )}

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

          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><Ticket className="h-4 w-4 text-brand" /> Apply coupon</h2>
            <div className="flex gap-2">
              <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Enter coupon code" />
              <Button variant="outline" onClick={applyCoupon}>Apply</Button>
            </div>
            {coupon && (
              <div className="mt-2 flex items-center justify-between text-sm text-brand">
                <span>{coupon.code} applied</span>
                <button className="text-xs text-muted-foreground underline" onClick={() => { setCoupon(null); setCouponInput(""); }}>Remove</button>
              </div>
            )}
          </div>

          {walletBalance > 0 && (
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border bg-card p-5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4 text-brand" /> Use wallet balance (₹{walletBalance.toFixed(0)})
              </span>
              <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
            </label>
          )}
        </div>

        <div className="h-fit rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-bold">Bill details</h2>
          <div className="space-y-1 text-sm">
            {items.map((i) => (
              <div key={i.product_id} className="flex justify-between"><span>{i.name} × {i.qty}</span><span>₹{(i.price * i.qty).toFixed(0)}</span></div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t pt-2 text-sm">
            <div className="flex justify-between"><span>Item total</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery fee</span><span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-brand"><span>Coupon {coupon?.code}</span><span>-₹{discount.toFixed(2)}</span></div>
            )}
            {walletUsed > 0 && (
              <div className="flex justify-between text-brand"><span>Wallet</span><span>-₹{walletUsed.toFixed(2)}</span></div>
            )}
          </div>
          <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold"><span>To pay</span><span>₹{total.toFixed(2)}</span></div>
          <div className="mt-3 rounded-lg bg-brand/10 p-2 text-center text-xs font-semibold text-brand">Cash on Delivery</div>
          <Button size="lg" className="mt-4 w-full bg-brand text-brand-foreground hover:bg-brand/90" disabled={submitting} onClick={submit}>
            {submitting ? "Placing…" : `Place Order · ₹${total.toFixed(0)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
