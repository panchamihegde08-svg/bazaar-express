import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Wallet } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listMyAddresses, saveAddress, deleteAddress, getWallet } from "@/lib/shop.functions";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "My account — G.K Bazaar" },
      { name: "description", content: "Manage your saved delivery addresses and G.K Bazaar wallet balance." },
      { property: "og:title", content: "My account — G.K Bazaar" },
      { property: "og:description", content: "Saved addresses and wallet for faster grocery checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AccountPage() {
  const qc = useQueryClient();
  const fetchAddresses = useServerFn(listMyAddresses);
  const fetchWallet = useServerFn(getWallet);
  const save = useServerFn(saveAddress);
  const del = useServerFn(deleteAddress);

  const addresses = useQuery({ queryKey: ["addresses"], queryFn: () => fetchAddresses() });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });

  const [label, setLabel] = useState("Home");
  const [full, setFull] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);

  function grabLocation() {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("Location captured"); },
      (err) => toast.error(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function add() {
    if (full.trim().length < 5) return toast.error("Enter a complete address");
    try {
      await save({ data: { label, full_address: full, lat: loc?.lat ?? null, lng: loc?.lng ?? null, is_default: (addresses.data?.length ?? 0) === 0 } });
      setFull(""); setLoc(null);
      toast.success("Address saved");
      qc.invalidateQueries({ queryKey: ["addresses"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  async function makeDefault(a: { id: string; label: string; full_address: string; lat: number | null; lng: number | null }) {
    await save({ data: { id: a.id, label: a.label, full_address: a.full_address, lat: a.lat != null ? Number(a.lat) : null, lng: a.lng != null ? Number(a.lng) : null, is_default: true } });
    qc.invalidateQueries({ queryKey: ["addresses"] });
  }

  return (
    <div className="min-h-screen">
      <CustomerHeader />
      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <h1 className="mb-3 text-lg font-bold">Saved addresses</h1>
            <div className="space-y-2">
              {addresses.data?.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border p-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-brand" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">
                      {a.label}{" "}
                      {a.is_default && <span className="ml-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">DEFAULT</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{a.full_address}</div>
                  </div>
                  {!a.is_default && (
                    <Button size="sm" variant="outline" onClick={() => makeDefault(a)}>Set default</Button>
                  )}
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={async () => { await del({ data: { id: a.id } }); qc.invalidateQueries({ queryKey: ["addresses"] }); }}
                    aria-label="Delete address"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {addresses.data?.length === 0 && <p className="text-sm text-muted-foreground">No saved addresses yet.</p>}
            </div>

            <div className="mt-5 space-y-2 border-t pt-4">
              <h2 className="font-semibold">Add a new address</h2>
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home / Work" />
              <Label>Full address</Label>
              <Textarea rows={3} value={full} onChange={(e) => setFull(e.target.value)} placeholder="House / flat, street, area, landmark" />
              <div className="flex items-center justify-between rounded-lg bg-accent/50 p-2 text-xs">
                <span>{loc ? `GPS captured (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})` : "No GPS attached"}</span>
                <Button size="sm" variant="outline" onClick={grabLocation}>Use current location</Button>
              </div>
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={add}>
                <Plus className="mr-1 h-4 w-4" /> Save address
              </Button>
            </div>
          </div>
        </div>

        <div className="h-fit rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-brand" />
            <h2 className="font-bold">G.K Wallet</h2>
          </div>
          <div className="mt-2 text-3xl font-black">₹{(wallet.data?.balance ?? 0).toFixed(2)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Wallet credits are applied automatically at checkout when you choose to use them.</p>
          <div className="mt-4 space-y-1 text-sm">
            {wallet.data?.transactions.map((t) => (
              <div key={t.id} className="flex justify-between border-b py-1 last:border-0">
                <span className="text-muted-foreground">{t.reason}</span>
                <span className={Number(t.amount) < 0 ? "text-destructive" : "text-brand"}>
                  {Number(t.amount) < 0 ? "-" : "+"}₹{Math.abs(Number(t.amount)).toFixed(0)}
                </span>
              </div>
            ))}
            {wallet.data?.transactions.length === 0 && <p className="text-xs text-muted-foreground">No wallet activity yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
