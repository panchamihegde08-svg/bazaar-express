import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createDeliveryAgent, listAgents, deleteAgent } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/admin/agents")({
  component: AgentsAdmin,
});

function AgentsAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "" });
  const fetchAgents = useServerFn(listAgents);
  const create = useServerFn(createDeliveryAgent);
  const del = useServerFn(deleteAgent);
  const agents = useQuery({ queryKey: ["admin-agents"], queryFn: () => fetchAgents() });

  async function submit() {
    try {
      await create({ data: form });
      toast.success("Agent created");
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["admin-agents"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  async function remove(user_id: string) {
    if (!confirm("Delete this agent?")) return;
    try { await del({ data: { user_id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-agents"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Delivery agents</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-1 h-4 w-4" /> New agent</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create delivery agent</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <p className="text-xs text-muted-foreground">Share these credentials with the agent. They will sign in at <code>/auth</code> and see the delivery app at <code>/delivery-agent</code>.</p>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-brand text-brand-foreground hover:bg-brand/90">Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Since</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {agents.data?.map((a) => (
              <tr key={a.user_id} className="border-t">
                <td className="p-3 font-medium">{a.full_name || "—"}</td>
                <td className="p-3">{a.email}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => remove(a.user_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
              </tr>
            ))}
            {agents.data && agents.data.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No agents yet — create one to start delivering orders.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
