import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Timer, ShieldCheck, Truck } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
  head: () => ({
    meta: [
      { title: "Product details — G.K Bazaar" },
      { name: "description", content: "See price, pack size and details for this grocery item, and get it delivered from G.K Bazaar in 15 minutes." },
      { property: "og:title", content: "Product details — G.K Bazaar" },
      { property: "og:description", content: "Fresh groceries delivered in 15 minutes from G.K Bazaar." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ProductPage() {
  const { id } = Route.useParams();
  const { items, add } = useCart();

  const q = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data: product, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!product) return { product: null, related: [] };
      const { data: related } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("category_id", product.category_id ?? "")
        .neq("id", product.id)
        .limit(6);
      return { product, related: related ?? [] };
    },
  });

  const p = q.data?.product;
  const inCart = p ? items.find((i) => i.product_id === p.id) : undefined;
  const discount = p && p.mrp && Number(p.mrp) > Number(p.price)
    ? Math.round(((Number(p.mrp) - Number(p.price)) / Number(p.mrp)) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      <CustomerHeader />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {q.data && !p && <p className="text-muted-foreground">This product is no longer available.</p>}

        {p && (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border bg-card">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="grid aspect-square place-items-center text-muted-foreground">No image</div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{p.name}</h1>
                <div className="mt-1 text-sm text-muted-foreground">{p.unit}</div>
                <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
                  <Star className="h-3 w-3 fill-current" /> {Number(p.rating ?? 4.3).toFixed(1)}
                </div>

                <div className="mt-4 flex items-end gap-3">
                  <div className="text-3xl font-black">₹{Number(p.price).toFixed(0)}</div>
                  {p.mrp && Number(p.mrp) > Number(p.price) && (
                    <>
                      <div className="text-base text-muted-foreground line-through">₹{Number(p.mrp).toFixed(0)}</div>
                      <div className="rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-brand-foreground">{discount}% OFF</div>
                    </>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</div>

                <div className="mt-5">
                  {inCart ? (
                    <div className="inline-flex items-center gap-3 rounded-lg bg-brand px-3 py-2 text-brand-foreground">
                      <button onClick={() => add({ product_id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, unit: p.unit }, -1)}>−</button>
                      <span className="font-bold">{inCart.qty}</span>
                      <button onClick={() => add({ product_id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, unit: p.unit })}>+</button>
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      className="bg-brand text-brand-foreground hover:bg-brand/90"
                      disabled={p.stock <= 0}
                      onClick={() => add({ product_id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, unit: p.unit })}
                    >
                      {p.stock > 0 ? "Add to cart" : "Out of stock"}
                    </Button>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl border p-3"><Timer className="mx-auto mb-1 h-4 w-4 text-brand" />15-min delivery</div>
                  <div className="rounded-xl border p-3"><ShieldCheck className="mx-auto mb-1 h-4 w-4 text-brand" />Quality assured</div>
                  <div className="rounded-xl border p-3"><Truck className="mx-auto mb-1 h-4 w-4 text-brand" />Free over ₹199</div>
                </div>

                {p.description && (
                  <div className="mt-6">
                    <h2 className="mb-1 font-semibold">Product details</h2>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  </div>
                )}
              </div>
            </div>

            {q.data && q.data.related.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-3 text-lg font-bold">Similar products</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                  {q.data.related.map((r) => (
                    <ProductCard
                      key={r.id}
                      product={{
                        id: r.id, name: r.name, price: Number(r.price),
                        mrp: r.mrp != null ? Number(r.mrp) : null,
                        unit: r.unit, image_url: r.image_url,
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
