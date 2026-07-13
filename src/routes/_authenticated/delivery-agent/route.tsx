import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { Truck, LogOut, ArrowLeft } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/delivery-agent")({
  component: AgentShell,
});

function AgentShell() {
  const { role, loading, user } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role && role !== "agent" && role !== "admin") {
      toast.error("Delivery agent access only");
      navigate({ to: "/" });
    }
  }, [role, loading, navigate]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (role !== "agent" && role !== "admin") {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-muted-foreground">Signed in as {user?.email}. This section is for delivery agents.</p>
        <Link to="/" className="mt-3 inline-block text-xs text-muted-foreground hover:underline">Back to shop</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-40 border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Truck className="h-5 w-5" />
          <div className="font-bold">G.K Bazaar · Delivery</div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }} className="text-primary-foreground hover:bg-primary-foreground/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4"><Outlet /></main>
      <div className="mx-auto max-w-3xl px-4 pb-4"><Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Customer shop</Link></div>
    </div>
  );
}
