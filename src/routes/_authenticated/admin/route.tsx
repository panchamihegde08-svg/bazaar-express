import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { LayoutDashboard, Package, ListOrdered, FolderTree, Truck, ArrowLeft, ShieldCheck, Image, Ticket } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapAdmin } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminShell,
});

const nav: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/orders", label: "Orders", icon: ListOrdered },
  { to: "/admin/agents", label: "Delivery agents", icon: Truck },
  { to: "/admin/banners", label: "Banners", icon: Image },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
];

function AdminShell() {
  const { role, loading, user } = useCurrentUser();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const boot = useServerFn(bootstrapAdmin);

  useEffect(() => {
    if (!loading && role && role !== "admin") {
      toast.error("Admin access required");
      navigate({ to: "/" });
    }
  }, [role, loading, navigate]);

  async function claimAdmin() {
    try {
      await boot();
      toast.success("You are now the admin. Reloading…");
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-md p-8">
        <div className="rounded-2xl border bg-card p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-brand" />
          <h1 className="text-lg font-bold">Admin access required</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {user?.email}. If you are the store owner and no admin exists yet,
            you can claim admin access below.
          </p>
          <Button className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90" onClick={claimAdmin}>
            Claim admin
          </Button>
          <Link to="/" className="mt-3 block text-xs text-muted-foreground hover:underline">Back to shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="w-56 shrink-0 border-r bg-card px-3 py-4">
        <Link to="/" className="mb-4 flex items-center gap-2 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-black">GK</div>
          <div className="text-sm font-bold">Admin panel</div>
        </Link>
        <nav className="space-y-1">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to as "/admin"}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? "bg-brand text-brand-foreground font-semibold" : "hover:bg-muted"}`}
              >
                <Icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <Link to="/" className="mt-6 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted">
          <ArrowLeft className="h-3 w-3" /> Back to shop
        </Link>
      </aside>
      <main className="flex-1 overflow-auto p-6"><Outlet /></main>
    </div>
  );
}
