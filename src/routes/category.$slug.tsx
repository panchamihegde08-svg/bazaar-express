import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { ProductCard } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const q = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data: cat } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
      if (!cat) return { category: null, products: [] };
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", cat.id)
        .eq("is_active", true)
        .order("name");
      return { category: cat, products: products ?? [] };
    },
  });

  return (
    <div className="min-h-screen">
      <CustomerHeader />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mb-4 text-2xl font-bold">{q.data?.category?.name ?? "Category"}</h1>
        {q.data && q.data.products.length === 0 ? (
          <p className="text-muted-foreground">No products yet in this category.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {q.data?.products.map((p) => (
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
        )}
      </div>
    </div>
  );
}
