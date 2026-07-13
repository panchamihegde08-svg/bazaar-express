import { Link } from "@tanstack/react-router";
import { ShoppingCart, Package, User as UserIcon, LogOut, LayoutDashboard, Truck } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CustomerHeader() {
  const { count } = useCart();
  const { user, role } = useCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-black">
            GK
          </div>
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-tight">G.K Bazaar</div>
            <div className="text-[10px] font-medium uppercase tracking-widest text-brand">
              Delivery in 15 min
            </div>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/orders">
            <Button variant="ghost" size="sm" className="gap-2">
              <Package className="h-4 w-4" /> Orders
            </Button>
          </Link>
          <Link to="/cart">
            <Button variant="outline" size="sm" className="relative gap-2 border-brand text-brand hover:bg-brand hover:text-brand-foreground">
              <ShoppingCart className="h-4 w-4" /> Cart
              {count > 0 && (
                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-brand-foreground">
                  {count}
                </span>
              )}
            </Button>
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><UserIcon className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
                <DropdownMenuSeparator />
                {role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin"><LayoutDashboard className="mr-2 h-4 w-4" />Admin panel</Link>
                  </DropdownMenuItem>
                )}
                {role === "agent" && (
                  <DropdownMenuItem asChild>
                    <Link to="/delivery-agent"><Truck className="mr-2 h-4 w-4" />Delivery app</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/orders"><Package className="mr-2 h-4 w-4" />My orders</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
