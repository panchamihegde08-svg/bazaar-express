import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Search as SearchIcon } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().optional() }),
  component: SearchPage,
  head: () => ({
    meta: [
      { title: "Search groceries — G.K Bazaar" },
      { name: "description", content: "Search fresh fruits, vegetables, snacks and daily essentials on G.K Bazaar and get them delivered in 15 minutes." },
      { property: "og:title", content: "Search groceries — G.K Bazaar" },
      { property: "og:description", content: "Find any grocery item and get it delivered in 15 minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");
  const [sort, setSort] = useState<"relevance" | "price_asc" | "price_desc">("relevance");

  const results = useQuery({
    queryKey: ["search", q, sort],
    queryFn: async () => {
      if (!q) return [];
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(60);
      if (sort === "price_asc") query = query.order("price", { ascending: true });
      if (sort === "price_desc") query = query.order("price", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <CustomerHeader />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/search", search: { q: term } });
          }}
        >
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search for atta, milk, chips…" />
          </div>
          <select
            className="rounded-md border bg-background px-3 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </form>

        <h1 className="mb-4 text-xl font-bold">
          {q ? `Results for “${q}”` : "Search products"}
        </h1>

        {results.isLoading && <p className="text-muted-foreground">Searching…</p>}
        {q && results.data?.length === 0 && (
          <p className="text-muted-foreground">No products matched your search.</p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.data?.map((p) => (
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
      </div>
    </div>
  );
}
