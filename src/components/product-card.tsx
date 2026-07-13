import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";

export type Product = {
  id: string;
  name: string;
  price: number;
  mrp: number | null;
  unit: string | null;
  image_url: string | null;
};

export function ProductCard({ product }: { product: Product }) {
  const { items, add } = useCart();
  const inCart = items.find((i) => i.product_id === product.id);
  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="group flex flex-col rounded-xl border bg-card p-3 transition-shadow hover:shadow-md">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">No image</div>
        )}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">
            {discount}% OFF
          </span>
        )}
      </div>
      <div className="mt-2 min-h-10 text-sm font-medium leading-snug line-clamp-2">{product.name}</div>
      <div className="mt-1 text-xs text-muted-foreground">{product.unit}</div>
      <div className="mt-auto flex items-center justify-between pt-2">
        <div>
          <div className="text-sm font-bold">₹{product.price}</div>
          {product.mrp && product.mrp > product.price && (
            <div className="text-[11px] text-muted-foreground line-through">₹{product.mrp}</div>
          )}
        </div>
        {inCart ? (
          <div className="flex items-center gap-1 rounded-lg bg-brand text-brand-foreground">
            <button
              className="grid h-8 w-8 place-items-center"
              onClick={() =>
                add(
                  {
                    product_id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    image_url: product.image_url,
                    unit: product.unit,
                  },
                  -1,
                )
              }
              aria-label="Remove one"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-bold">{inCart.qty}</span>
            <button
              className="grid h-8 w-8 place-items-center"
              onClick={() =>
                add({
                  product_id: product.id,
                  name: product.name,
                  price: Number(product.price),
                  image_url: product.image_url,
                  unit: product.unit,
                })
              }
              aria-label="Add one"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-brand font-bold text-brand hover:bg-brand hover:text-brand-foreground"
            onClick={() =>
              add({
                product_id: product.id,
                name: product.name,
                price: Number(product.price),
                image_url: product.image_url,
                unit: product.unit,
              })
            }
          >
            ADD
          </Button>
        )}
      </div>
    </div>
  );
}
