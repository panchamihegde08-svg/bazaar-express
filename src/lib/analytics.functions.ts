import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data: orders } = await context.supabase
      .from("orders")
      .select("id, total, status, created_at, agent_id")
      .gte("created_at", since.toISOString());

    const list = orders ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = list.filter((o) => new Date(o.created_at) >= today);
    const revenueToday = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    const revenue7d = list.reduce((s, o) => s + Number(o.total), 0);

    const byStatus: Record<string, number> = {};
    list.forEach((o) => (byStatus[o.status] = (byStatus[o.status] ?? 0) + 1));

    // Daily revenue series
    const days: { day: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayOrders = list.filter(
        (o) => new Date(o.created_at) >= d && new Date(o.created_at) < next,
      );
      days.push({
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
        orders: dayOrders.length,
      });
    }

    // Top products (last 30 days)
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const { data: items } = await context.supabase
      .from("order_items")
      .select("product_name, qty, price, order_id, orders!inner(created_at)")
      .gte("orders.created_at", since30.toISOString());
    const productAgg = new Map<string, { qty: number; revenue: number }>();
    (items ?? []).forEach((it) => {
      const cur = productAgg.get(it.product_name) ?? { qty: 0, revenue: 0 };
      cur.qty += it.qty;
      cur.revenue += Number(it.price) * it.qty;
      productAgg.set(it.product_name, cur);
    });
    const topProducts = Array.from(productAgg.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const { count: agentsCount } = await context.supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "agent");

    return {
      revenueToday,
      revenue7d,
      ordersToday: todayOrders.length,
      orders7d: list.length,
      agentsCount: agentsCount ?? 0,
      byStatus,
      days,
      topProducts,
    };
  });
