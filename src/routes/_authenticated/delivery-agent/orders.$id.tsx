import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LiveMap, type MapPoint } from "@/components/live-map";
import { getOrder, updateOrderStatus, upsertLiveLocation } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/delivery-agent/orders/$id")({
  component: AgentOrderDetail,
});

const flow: Record<string, string> = {
  placed: "accepted",
  accepted: "picked",
  picked: "out_for_delivery",
  out_for_delivery: "delivered",
};

function AgentOrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchOrder = useServerFn(getOrder);
  const setStatus = useServerFn(updateOrderStatus);
  const pushLoc = useServerFn(upsertLiveLocation);

  const q = useQuery({
    queryKey: ["agent-order", id],
    queryFn: () => fetchOrder({ data: { id } }),
    refetchInterval: 8000,
  });

  const [live, setLive] = useState<{ customer?: [number, number]; agent?: [number, number] }>({});
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`agent-live:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_locations", filter: `order_id=eq.${id}` }, (payload) => {
        const row = payload.new as { customer_lat: number | null; customer_lng: number | null; agent_lat: number | null; agent_lng: number | null };
        setLive({
          customer: row.customer_lat && row.customer_lng ? [Number(row.customer_lat), Number(row.customer_lng)] : undefined,
          agent: row.agent_lat && row.agent_lng ? [Number(row.agent_lat), Number(row.agent_lng)] : undefined,
        });
      })
      .subscribe();
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

  useEffect(() => {
    if (!q.data) return;
    const active = ["accepted", "picked", "out_for_delivery"].includes(q.data.status);
    if (!active) return;
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        pushLoc({ data: { order_id: id, role: "agent", lat: pos.coords.latitude, lng: pos.coords.longitude } }).catch(() => {});
      },
      (err) => toast.error(err.message),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [q.data, id, pushLoc]);

  const points: MapPoint[] = [];
  if (live.customer) points.push({ lat: live.customer[0], lng: live.customer[1], label: "Customer", color: "#22c55e" });
  if (live.agent) points.push({ lat: live.agent[0], lng: live.agent[1], label: "You", color: "#f59e0b" });
  if (points.length === 0 && q.data?.customer_lat && q.data?.customer_lng) {
    points.push({ lat: Number(q.data.customer_lat), lng: Number(q.data.customer_lng), label: "Customer address", color: "#22c55e" });
  }

  async function advance() {
    if (!q.data) return;
    const next = flow[q.data.status];
    if (!next) return;
    try {
      await setStatus({ data: { order_id: id, status: next as "accepted" } });
      toast.success(`Marked as ${next.replace(/_/g, " ")}`);
      qc.invalidateQueries({ queryKey: ["agent-order", id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-4">
      <Link to="/delivery-agent" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All orders</Link>
      {q.data && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold">#{q.data.id.slice(0, 8).toUpperCase()}</div>
              <div className="text-xs text-muted-foreground">{new Date(q.data.created_at).toLocaleString()}</div>
            </div>
            <Badge>{q.data.status.replace(/_/g, " ")}</Badge>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-brand" />
              <div className="flex-1">
                <div className="text-sm font-semibold">Delivery address</div>
                <div className="text-sm text-muted-foreground">{q.data.address}</div>
                {q.data.notes && <div className="mt-1 text-xs text-muted-foreground">Note: {q.data.notes}</div>}
              </div>
              {q.data.customer_lat && q.data.customer_lng && (
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${q.data.customer_lat},${q.data.customer_lng}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand underline">Navigate</a>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <h3 className="mb-2 font-semibold">Live locations</h3>
            {points.length > 0 ? <LiveMap points={points} height={320} /> : <p className="text-sm text-muted-foreground">Waiting for location…</p>}
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <h3 className="mb-2 font-semibold">Items</h3>
            <ul className="space-y-1 text-sm">
              {q.data.order_items?.map((it: { id: string; product_name: string; qty: number; price: number }) => (
                <li key={it.id} className="flex justify-between">
                  <span>{it.product_name} × {it.qty}</span>
                  <span>₹{(Number(it.price) * it.qty).toFixed(0)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 border-t pt-2 flex justify-between font-bold"><span>Collect (COD)</span><span>₹{Number(q.data.total).toFixed(0)}</span></div>
          </div>

          {flow[q.data.status] && (
            <Button size="lg" className="w-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={advance}>
              Mark as {flow[q.data.status].replace(/_/g, " ")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
