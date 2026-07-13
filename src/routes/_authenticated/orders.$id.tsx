import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { getOrder, upsertLiveLocation } from "@/lib/orders.functions";
import { LiveMap, type MapPoint } from "@/components/live-map";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const fetchOrder = useServerFn(getOrder);
  const pushLoc = useServerFn(upsertLiveLocation);

  const q = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder({ data: { id } }),
    refetchInterval: 8000,
  });

  const [live, setLive] = useState<{ customer?: [number, number]; agent?: [number, number] }>({});
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    // subscribe to realtime live_locations for this order
    const channel = supabase
      .channel(`live_locations:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_locations", filter: `order_id=eq.${id}` },
        (payload) => {
          const row = payload.new as {
            customer_lat: number | null; customer_lng: number | null;
            agent_lat: number | null; agent_lng: number | null;
          };
          setLive({
            customer: row.customer_lat && row.customer_lng ? [Number(row.customer_lat), Number(row.customer_lng)] : undefined,
            agent: row.agent_lat && row.agent_lng ? [Number(row.agent_lat), Number(row.agent_lng)] : undefined,
          });
        },
      )
      .subscribe();
    // initial fetch
    supabase.from("live_locations").select("*").eq("order_id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setLive({
          customer: data.customer_lat && data.customer_lng ? [Number(data.customer_lat), Number(data.customer_lng)] : undefined,
          agent: data.agent_lat && data.agent_lng ? [Number(data.agent_lat), Number(data.agent_lng)] : undefined,
        });
      }
    });
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Customer: share live location while order is active
  useEffect(() => {
    if (!q.data) return;
    const active = ["placed", "accepted", "picked", "out_for_delivery"].includes(q.data.status);
    if (!active) return;
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        pushLoc({ data: { order_id: id, role: "customer", lat: pos.coords.latitude, lng: pos.coords.longitude } }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [q.data, id, pushLoc]);

  const points: MapPoint[] = [];
  if (live.customer) points.push({ lat: live.customer[0], lng: live.customer[1], label: "You", color: "#22c55e" });
  if (live.agent) points.push({ lat: live.agent[0], lng: live.agent[1], label: "Delivery agent", color: "#f59e0b" });

  return (
    <div className="min-h-screen">
      <CustomerHeader />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All orders
        </Link>
        {q.data && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-lg font-bold">Order #{q.data.id.slice(0, 8).toUpperCase()}</div>
                <div className="text-xs text-muted-foreground">{new Date(q.data.created_at).toLocaleString()}</div>
              </div>
              <Badge className="text-sm">{q.data.status.replace(/_/g, " ")}</Badge>
            </div>

            <div className="mb-4 rounded-2xl border bg-card p-4">
              <h3 className="mb-2 font-semibold">Live tracking</h3>
              {points.length > 0 ? (
                <LiveMap points={points} height={320} />
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for location data…</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Green pin: you · Orange pin: your delivery agent
              </p>
            </div>

            <div className="mb-4 rounded-2xl border bg-card p-4">
              <h3 className="mb-2 font-semibold">Items</h3>
              <div className="space-y-1 text-sm">
                {q.data.order_items?.map((it: { id: string; product_name: string; qty: number; price: number }) => (
                  <div key={it.id} className="flex justify-between">
                    <span>{it.product_name} × {it.qty}</span>
                    <span>₹{(Number(it.price) * it.qty).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>Total (COD)</span><span>₹{Number(q.data.total).toFixed(0)}</span></div>
            </div>

            <div className="rounded-2xl border bg-card p-4 text-sm">
              <div className="font-semibold">Delivery to</div>
              <div className="text-muted-foreground">{q.data.address}</div>
              {q.data.notes && <div className="mt-1 text-muted-foreground">Note: {q.data.notes}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
