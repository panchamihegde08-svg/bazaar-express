import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAllOrders, assignAgent, updateOrderStatus } from "@/lib/orders.functions";
import { listAgents } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

const statuses = ["placed", "accepted", "picked", "out_for_delivery", "delivered", "cancelled"] as const;

function AdminOrders() {
  const qc = useQueryClient();
  const fetchOrders = useServerFn(listAllOrders);
  const fetchAgents = useServerFn(listAgents);
  const assign = useServerFn(assignAgent);
  const setStatus = useServerFn(updateOrderStatus);

  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: () => fetchOrders(), refetchInterval: 15000 });
  const agents = useQuery({ queryKey: ["admin-agents-list"], queryFn: () => fetchAgents() });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Order</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Agent</th><th className="p-3">Time</th></tr>
          </thead>
          <tbody>
            {orders.data?.map((o) => (
              <tr key={o.id} className="border-t align-top">
                <td className="p-3">
                  <div className="font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{o.address}</div>
                  <div className="mt-1 text-xs">{o.order_items?.length ?? 0} items</div>
                </td>
                <td className="p-3 font-bold">₹{Number(o.total).toFixed(0)}</td>
                <td className="p-3">
                  <Select
                    value={o.status}
                    onValueChange={async (v) => {
                      try { await setStatus({ data: { order_id: o.id, status: v as (typeof statuses)[number] } }); toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                    }}
                  >
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-3">
                  <Select
                    value={o.agent_id ?? "none"}
                    onValueChange={async (v) => {
                      try { await assign({ data: { order_id: o.id, agent_id: v === "none" ? null : v } }); toast.success("Assigned"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                    }}
                  >
                    <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Unassigned —</SelectItem>
                      {agents.data?.map((a) => <SelectItem key={a.user_id} value={a.user_id}>{a.full_name || a.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
