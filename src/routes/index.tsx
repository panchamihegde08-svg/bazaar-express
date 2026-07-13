import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Zap, Timer, ShieldCheck } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { ProductCard } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const featuredQ = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader />

      {/* Hero */}
      <section className="border-b bg-gradient-to-br from-primary/40 via-accent/40 to-primary/20">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-foreground">
                <Zap className="h-3.5 w-3.5" /> 15-Minute Delivery
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                Groceries at your <span className="text-brand">doorstep</span>, in a flash.
              </h1>
              <p className="mt-3 max-w-md text-muted-foreground">
                Fresh produce, snacks, dairy and daily essentials from G.K Bazaar — delivered fast, paid on delivery.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2"><Timer className="h-4 w-4 text-brand" /> Ultra-fast delivery</div>
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand" /> 100% quality assured</div>
              </div>
            </div>
            <div className="hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"
                alt="Fresh groceries"
                className="mx-auto max-h-72 rounded-2xl object-cover shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-4 text-xl font-bold">Shop by category</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-8">
          {categoriesQ.data?.map((c) => (
            <Link
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
            >
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-accent/40">
                {c.image_url && (
                  <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="text-xs font-semibold leading-tight">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="mb-4 text-xl font-bold">Fresh picks for you</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {featuredQ.data?.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id, name: p.name, price: Number(p.price),
                mrp: p.mrp != null ? Number(p.mrp) : null,
                unit: p.unit, image_url: p.image_url,
              }}
            />
          ))}
        </div>
      </section>

      <footer className="border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} G.K Bazaar. Groceries delivered in minutes.
        </div>
      </footer>
    </div>
  );
}
