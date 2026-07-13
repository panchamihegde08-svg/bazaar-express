import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { listAgentOrders } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/delivery-agent/")({
  component: AgentHome,
});

function AgentHome() {
  const fetchOrders = useServerFn(listAgentOrders);
  const q = useQuery({ queryKey: ["agent-orders"], queryFn: () => fetchOrders(), refetchInterval: 10000 });

  const active = (q.data ?? []).filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const past = (q.data ?? []).filter((o) => o.status === "delivered" || o.status === "cancelled");

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-bold">Active deliveries</h2>
        {active.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">No active orders yet. New assignments will appear here.</div>
        ) : (
          <div className="space-y-2">
            {active.map((o) => (
              <Link key={o.id} to="/delivery-agent/orders/$id" params={{ id: o.id }} className="flex items-center justify-between rounded-xl border bg-card p-4 hover:border-brand">
                <div>
                  <div className="font-semibold">#{o.id.slice(0, 8).toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{o.address}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold">₹{Number(o.total).toFixed(0)}</div>
                  <Badge className="capitalize">{o.status.replace(/_/g, " ")}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Completed</h2>
          <div className="space-y-2">
            {past.slice(0, 20).map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border bg-card p-3 text-sm">
                <span>#{o.id.slice(0, 8).toUpperCase()}</span>
                <span className="text-muted-foreground">{o.status}</span>
                <span>₹{Number(o.total).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
