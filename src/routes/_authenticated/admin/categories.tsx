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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { upsertCategory, deleteCategory } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesAdmin,
});

type Row = { id: string; name: string; slug: string; image_url: string | null; sort_order: number };

function CategoriesAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const save = useServerFn(upsertCategory);
  const del = useServerFn(deleteCategory);

  const list = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => ((await supabase.from("categories").select("*").order("sort_order")).data ?? []) as Row[],
  });

  async function submit() {
    if (!editing) return;
    try {
      await save({
        data: {
          id: editing.id,
          name: editing.name ?? "",
          slug: (editing.slug ?? "").toLowerCase().replace(/\s+/g, "-"),
          image_url: editing.image_url || null,
          sort_order: Number(editing.sort_order ?? 0),
        },
      });
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this category? Products will be unlinked.")) return;
    try { await del({ data: { id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-categories"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setEditing({ sort_order: (list.data?.length ?? 0) + 1 })}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="grid gap-3">
                <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="dairy-bread" /></div>
                <div><Label>Image URL</Label><Input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></div>
                <div><Label>Sort order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
              </div>
            )}
            <DialogFooter><Button onClick={submit} className="bg-brand text-brand-foreground hover:bg-brand/90">Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {list.data?.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <div className="h-14 w-14 overflow-hidden rounded-lg bg-muted">{c.image_url && <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />}</div>
            <div className="flex-1"><div className="font-semibold">{c.name}</div><div className="text-xs text-muted-foreground">/{c.slug}</div></div>
            <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
