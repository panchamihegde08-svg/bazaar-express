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
import { upsertBanner, deleteBanner } from "@/lib/shop.functions";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: BannersAdmin,
});

type Row = {
  id: string; title: string; subtitle: string | null; image_url: string | null;
  link_slug: string | null; sort_order: number; is_active: boolean;
};

function BannersAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const save = useServerFn(upsertBanner);
  const del = useServerFn(deleteBanner);

  const list = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => ((await supabase.from("banners").select("*").order("sort_order")).data ?? []) as Row[],
  });

  async function submit() {
    if (!editing) return;
    try {
      await save({
        data: {
          id: editing.id,
          title: editing.title ?? "",
          subtitle: editing.subtitle || null,
          image_url: editing.image_url || null,
          link_slug: editing.link_slug || null,
          sort_order: Number(editing.sort_order ?? 0),
          is_active: editing.is_active ?? true,
        },
      });
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Home banners</h1>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setEditing({ sort_order: 0, is_active: true })}>
              <Plus className="mr-1 h-4 w-4" /> New banner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit banner" : "New banner"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={editing?.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><Label>Subtitle</Label><Input value={editing?.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></div>
              <div><Label>Image URL</Label><Input value={editing?.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></div>
              <div><Label>Links to category slug</Label><Input value={editing?.link_slug ?? ""} onChange={(e) => setEditing({ ...editing, link_slug: e.target.value })} placeholder="snacks" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Sort order</Label><Input type="number" value={editing?.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
                <label className="mt-6 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing?.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
                </label>
              </div>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-brand text-brand-foreground hover:bg-brand/90">Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {list.data?.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <div className="h-14 w-24 overflow-hidden rounded-lg bg-muted">
              {b.image_url && <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{b.title}</div>
              <div className="text-xs text-muted-foreground">{b.subtitle} {b.link_slug ? `· /category/${b.link_slug}` : ""}</div>
            </div>
            {!b.is_active && <span className="rounded bg-muted px-2 py-0.5 text-xs">Hidden</span>}
            <Button size="icon" variant="ghost" onClick={() => setEditing(b)}><Pencil className="h-4 w-4" /></Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={async () => {
                if (!confirm("Delete this banner?")) return;
                await del({ data: { id: b.id } });
                qc.invalidateQueries({ queryKey: ["admin-banners"] });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
