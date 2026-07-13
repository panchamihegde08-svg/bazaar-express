import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CustomerHeader } from "@/components/customer-header";
import { listMyOrders } from "@/lib/orders.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
});

const statusColor: Record<string, string> = {
  placed: "bg-warning text-black",
  accepted: "bg-blue-500 text-white",
  picked: "bg-blue-600 text-white",
  out_for_delivery: "bg-primary text-primary-foreground",
  delivered: "bg-brand text-brand-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

function OrdersPage() {
  const fetchOrders = useServerFn(listMyOrders);
  const q = useQuery({ queryKey: ["my-orders"], queryFn: () => fetchOrders() });

  return (
    <div className="min-h-screen">
      <CustomerHeader />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Your orders</h1>
        {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {q.data && q.data.length === 0 && (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <p className="text-muted-foreground">You haven't placed any orders yet.</p>
          </div>
        )}
        <div className="space-y-3">
          {q.data?.map((o) => (
            <Link
              key={o.id}
              to="/orders/$id"
              params={{ id: o.id }}
              className="flex items-center justify-between rounded-xl border bg-card p-4 hover:border-brand"
            >
              <div>
                <div className="text-sm font-semibold">Order #{o.id.slice(0, 8).toUpperCase()}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()} · {(o.order_items?.length ?? 0)} items
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-bold">₹{Number(o.total).toFixed(0)}</div>
                <Badge className={statusColor[o.status] ?? ""}>{o.status.replace(/_/g, " ")}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
