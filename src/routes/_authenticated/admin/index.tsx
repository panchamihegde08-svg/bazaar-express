import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { IndianRupee, ShoppingBag, Truck, TrendingUp } from "lucide-react";
import { getDashboard } from "@/lib/analytics.functions";
import { Bar, BarChart, Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function Stat({ icon: Icon, label, value, sub }: { icon: typeof IndianRupee; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/15 text-brand"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const fetchStats = useServerFn(getDashboard);
  const q = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => fetchStats(), refetchInterval: 30000 });
  const d = q.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={IndianRupee} label="Revenue today" value={`₹${(d?.revenueToday ?? 0).toFixed(0)}`} sub={`${d?.ordersToday ?? 0} orders`} />
        <Stat icon={TrendingUp} label="Revenue 7 days" value={`₹${(d?.revenue7d ?? 0).toFixed(0)}`} sub={`${d?.orders7d ?? 0} orders`} />
        <Stat icon={ShoppingBag} label="Orders (7d)" value={String(d?.orders7d ?? 0)} />
        <Stat icon={Truck} label="Delivery agents" value={String(d?.agentsCount ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-3 font-semibold">Revenue — last 7 days</h3>
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={d?.days ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="var(--brand)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-3 font-semibold">Top products (30d)</h3>
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={d?.topProducts ?? []} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={110} />
                <Tooltip />
                <Bar dataKey="revenue" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h3 className="mb-3 font-semibold">Orders by status (7d)</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(d?.byStatus ?? {}).map(([k, v]) => (
            <div key={k} className="rounded-full border px-3 py-1 text-sm">
              <span className="font-semibold">{k.replace(/_/g, " ")}</span>: {v}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
