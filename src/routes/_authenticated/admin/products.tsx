import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertProduct, deleteProduct } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsAdmin,
});

type Row = {
  id: string;
  name: string;
  price: number;
  mrp: number | null;
  unit: string | null;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  category_id: string | null;
  description: string | null;
};

function ProductsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const save = useServerFn(upsertProduct);
  const del = useServerFn(deleteProduct);

  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  async function submit() {
    if (!editing) return;
    try {
      await save({
        data: {
          id: editing.id,
          name: editing.name ?? "",
          description: editing.description ?? null,
          price: Number(editing.price ?? 0),
          mrp: editing.mrp != null ? Number(editing.mrp) : null,
          unit: editing.unit ?? null,
          image_url: editing.image_url || null,
          stock: Number(editing.stock ?? 0),
          is_active: editing.is_active ?? true,
          category_id: editing.category_id ?? null,
        },
      });
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await del({ data: { id } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setEditing({ is_active: true, stock: 10 })}>
              <Plus className="mr-1 h-4 w-4" /> Add product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="grid gap-3">
                <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Price ₹</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                  <div><Label>MRP ₹</Label><Input type="number" value={editing.mrp ?? ""} onChange={(e) => setEditing({ ...editing, mrp: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>Stock</Label><Input type="number" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Unit (e.g. 500g)</Label><Input value={editing.unit ?? ""} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={editing.category_id ?? ""} onValueChange={(v) => setEditing({ ...editing, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {categories.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Image URL</Label><Input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://…" /></div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
              </div>
            )}
            <DialogFooter><Button onClick={submit} className="bg-brand text-brand-foreground hover:bg-brand/90">Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Image</th><th className="p-3">Name</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {products.data?.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3"><div className="h-10 w-10 overflow-hidden rounded bg-muted">{p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}</div></td>
                <td className="p-3 font-medium">{p.name}<div className="text-xs text-muted-foreground">{p.unit}</div></td>
                <td className="p-3">₹{Number(p.price).toFixed(0)}{p.mrp && <span className="ml-1 text-xs text-muted-foreground line-through">₹{Number(p.mrp).toFixed(0)}</span>}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">{p.is_active ? <span className="text-brand">Active</span> : <span className="text-muted-foreground">Hidden</span>}</td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
