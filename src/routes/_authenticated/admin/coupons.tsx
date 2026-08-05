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
import { upsertCoupon, deleteCoupon } from "@/lib/shop.functions";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: CouponsAdmin,
});

type Row = {
  id: string; code: string; description: string | null;
  discount_type: string; discount_value: number; min_order: number;
  max_discount: number | null; usage_limit: number | null; used_count: number; is_active: boolean;
};

function CouponsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const save = useServerFn(upsertCoupon);
  const del = useServerFn(deleteCoupon);

  const list = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => ((await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? []) as Row[],
  });

  async function submit() {
    if (!editing) return;
    try {
      await save({
        data: {
          id: editing.id,
          code: editing.code ?? "",
          description: editing.description || null,
          discount_type: (editing.discount_type as "percent" | "flat") ?? "percent",
          discount_value: Number(editing.discount_value ?? 0),
          min_order: Number(editing.min_order ?? 0),
          max_discount: editing.max_discount != null && String(editing.max_discount) !== "" ? Number(editing.max_discount) : null,
          usage_limit: editing.usage_limit != null && String(editing.usage_limit) !== "" ? Number(editing.usage_limit) : null,
          is_active: editing.is_active ?? true,
        },
      });
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coupons & offers</h1>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setEditing({ discount_type: "percent", is_active: true, min_order: 0, discount_value: 10 })}>
              <Plus className="mr-1 h-4 w-4" /> New coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Code</Label><Input value={editing?.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} /></div>
              <div className="col-span-2"><Label>Description</Label><Input value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={editing?.discount_type ?? "percent"} onChange={(e) => setEditing({ ...editing, discount_type: e.target.value })}>
                  <option value="percent">Percent %</option>
                  <option value="flat">Flat ₹</option>
                </select>
              </div>
              <div><Label>Value</Label><Input type="number" value={editing?.discount_value ?? 0} onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} /></div>
              <div><Label>Min order ₹</Label><Input type="number" value={editing?.min_order ?? 0} onChange={(e) => setEditing({ ...editing, min_order: Number(e.target.value) })} /></div>
              <div><Label>Max discount ₹</Label><Input type="number" value={editing?.max_discount ?? ""} onChange={(e) => setEditing({ ...editing, max_discount: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><Label>Usage limit</Label><Input type="number" value={editing?.usage_limit ?? ""} onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <label className="mt-6 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing?.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
              </label>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-brand text-brand-foreground hover:bg-brand/90">Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {list.data?.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <div className="rounded-md border border-dashed border-brand px-2 py-1 font-mono text-sm font-bold text-brand">{c.code}</div>
            <div className="flex-1">
              <div className="text-sm">{c.description}</div>
              <div className="text-xs text-muted-foreground">
                {c.discount_type === "flat" ? `₹${c.discount_value} off` : `${c.discount_value}% off`} · min ₹{c.min_order}
                {c.max_discount ? ` · up to ₹${c.max_discount}` : ""} · used {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""}
              </div>
            </div>
            {!c.is_active && <span className="rounded bg-muted px-2 py-0.5 text-xs">Inactive</span>}
            <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={async () => {
                if (!confirm("Delete this coupon?")) return;
                await del({ data: { id: c.id } });
                qc.invalidateQueries({ queryKey: ["admin-coupons"] });
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
