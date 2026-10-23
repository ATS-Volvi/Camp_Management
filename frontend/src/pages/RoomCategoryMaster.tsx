import { useState } from "react";
import { Plus, Pencil, Trash2, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  useRoomCategoryMaster,
  useUpsertRoomCategory,
  useDeleteRoomCategory,
  RoomCategoryMaster as RC,
} from "@/hooks/useRoomCategoryMaster";
import { usePermissions } from "@/hooks/usePermissions";

const emptyForm = { code: "", name: "", beds: 1, daily_rate: 0, holding_charge: 0, category_key: "", is_active: true };

export default function RoomCategoryMaster() {
  const { data: cats = [], isLoading } = useRoomCategoryMaster();
  const upsert = useUpsertRoomCategory();
  const del = useDeleteRoomCategory();
  const { isSuperAdmin } = usePermissions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setOpen(true); };
  const openEdit = (c: RC) => {
    setForm({ code: c.code, name: c.name, beds: c.beds, daily_rate: Number(c.daily_rate), holding_charge: Number(c.holding_charge || 0), category_key: c.category_key || "", is_active: c.is_active });
    setEditingId(c.id);
    setOpen(true);
  };

  const save = async () => {
    if (!form.code || !form.name) { toast({ title: "Code and name required", variant: "destructive" }); return; }
    try {
      await upsert.mutateAsync({ ...form, daily_rate: Number(form.daily_rate), holding_charge: Number(form.holding_charge), beds: Number(form.beds) });
      toast({ title: editingId ? "Category updated" : "Category created" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BedDouble className="text-primary" /> Room Category Master</h1>
          <p className="text-sm text-muted-foreground">Manage room categories, bed counts, and SAR daily rates.</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={openNew} className="gap-2"><Plus size={16} /> New Category</Button>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Beds</TableHead>
              <TableHead className="text-right">Rate (SAR / day)</TableHead>
              <TableHead className="text-right">Holding (SAR / day)</TableHead>
              <TableHead>Status</TableHead>
              {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : cats.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No categories</TableCell></TableRow>
            ) : cats.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-semibold text-primary">{c.code}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell className="text-center">{c.beds}</TableCell>
                <TableCell className="text-right font-medium">SAR {Number(c.daily_rate).toFixed(0)}</TableCell>
                <TableCell className="text-right text-muted-foreground">SAR {Number(c.holding_charge || 0).toFixed(0)}</TableCell>
                <TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                {isSuperAdmin && (
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete ${c.code}?`)) del.mutate(c.id); }}><Trash2 size={14} className="text-destructive" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit" : "New"} Room Category</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="RC09" /></div>
            <div><Label>Beds</Label><Input type="number" min={1} value={form.beds} onChange={e => setForm({ ...form, beds: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Rate (SAR/day)</Label><Input type="number" min={0} value={form.daily_rate} onChange={e => setForm({ ...form, daily_rate: Number(e.target.value) })} /></div>
            <div><Label>Holding Charge (SAR/day)</Label><Input type="number" min={0} value={form.holding_charge} onChange={e => setForm({ ...form, holding_charge: Number(e.target.value) })} /><p className="text-xs text-muted-foreground mt-1">Billed instead of the room rate while the occupant is on leave.</p></div>
            <div><Label>Category Key</Label><Input value={form.category_key} onChange={e => setForm({ ...form, category_key: e.target.value })} placeholder="executive_single" /></div>
            <div className="col-span-2 flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><span>Active</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
