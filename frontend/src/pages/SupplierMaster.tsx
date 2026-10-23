import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useRoomCategoryMaster } from "@/hooks/useRoomCategoryMaster";

type Client = {
  id: string; code: string; name: string; contact_person: string | null; email: string | null; phone: string | null;
  address: string | null; vat_number: string | null; breakfast_rate: number; lunch_rate: number; dinner_rate: number;
  ramadan_rate: number; is_active: boolean; client_room_rates: { room_category_code: string; daily_rate: number }[];
};

const emptyForm = {
  code: "", name: "", contact_person: "", email: "", phone: "", address: "", vat_number: "",
  breakfast_rate: 0, lunch_rate: 0, dinner_rate: 0, ramadan_rate: 0, is_active: true,
};

export default function SupplierMaster() {
  const qc = useQueryClient();
  const { data: cats = [] } = useRoomCategoryMaster();
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const data = await api.get<Client[]>("/suppliers");
      return data ?? [];
    },
  });
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [roomRates, setRoomRates] = useState<Record<string, number>>({});

  const openNew = () => {
    setForm(emptyForm); setEditingId(null);
    setRoomRates(Object.fromEntries(cats.map(c => [c.code, Number(c.daily_rate)])));
    setOpen(true);
  };
  const openEdit = (c: Client) => {
    const { id, client_room_rates, ...rest } = c;
    setForm({ ...emptyForm, ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v ?? ""])) } as typeof emptyForm);
    setRoomRates(Object.fromEntries(cats.map(cat => [cat.code, Number(client_room_rates?.find(r => r.room_category_code === cat.code)?.daily_rate ?? 0)])));
    setEditingId(id); setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        breakfast_rate: Number(form.breakfast_rate), lunch_rate: Number(form.lunch_rate),
        dinner_rate: Number(form.dinner_rate), ramadan_rate: Number(form.ramadan_rate),
        roomRates: Object.entries(roomRates).map(([room_category_code, daily_rate]) => ({
          room_category_code,
          daily_rate: Number(daily_rate) || 0
        }))
      };
      if (editingId) {
        return await api.put(`/suppliers/${editingId}`, payload);
      } else {
        return await api.post("/suppliers", payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast({ title: editingId ? "Supplier updated" : "Supplier created" }); setOpen(false); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/suppliers/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const sar = (n: number) => `SAR ${Number(n || 0).toFixed(0)}`;
  const set = (k: keyof typeof emptyForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="text-primary" /> Supplier Master</h1>
          <p className="text-sm text-muted-foreground">Supplier rates for food (Breakfast, Lunch, Dinner, Ramadan) and accommodation per room type. Supplier employees are charged at these rates; own employees use standard rates. The name must match the supplier name on employees.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus size={16} /> New Supplier</Button>
      </div>

      <Card className="p-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead><TableHead>Supplier</TableHead><TableHead>Contact</TableHead>
              <TableHead className="text-right">Breakfast</TableHead><TableHead className="text-right">Lunch</TableHead>
              <TableHead className="text-right">Dinner</TableHead><TableHead className="text-right">Ramadan</TableHead>
              <TableHead>Room Rates (per day)</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : clients.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No suppliers yet — add your first supplier.</TableCell></TableRow>
            ) : clients.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-semibold text-primary">{c.code}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-xs"><div>{c.contact_person || "—"}</div><div className="text-muted-foreground">{c.email}</div></TableCell>
                <TableCell className="text-right">{sar(c.breakfast_rate)}</TableCell>
                <TableCell className="text-right">{sar(c.lunch_rate)}</TableCell>
                <TableCell className="text-right">{sar(c.dinner_rate)}</TableCell>
                <TableCell className="text-right">{sar(c.ramadan_rate)}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1 max-w-xs">
                  {c.client_room_rates.length === 0 ? <span className="text-muted-foreground text-xs">—</span> :
                    [...c.client_room_rates].sort((a, b) => a.room_category_code.localeCompare(b.room_category_code)).map(r => (
                      <Badge key={r.room_category_code} variant="outline" className="font-mono text-[10px]">{r.room_category_code}: {Number(r.daily_rate).toFixed(0)}</Badge>
                    ))}
                </div></TableCell>
                <TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                  <Button size="icon" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => { if (confirm(`Delete ${c.name}?`)) del.mutate(c.id); }}><Trash2 size={14} className="text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit" : "New"} Supplier</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <section className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="SUP001" /></div>
              <div><Label>Supplier Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
              <div><Label>VAT Number</Label><Input value={form.vat_number} onChange={e => set("vat_number", e.target.value)} /></div>
              <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => set("address", e.target.value)} /></div>
            </section>

            <section>
              <h3 className="font-semibold text-sm mb-2">Food Rates (SAR per meal)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([["breakfast_rate", "Breakfast"], ["lunch_rate", "Lunch"], ["dinner_rate", "Dinner"], ["ramadan_rate", "Ramadan (per day)"]] as const).map(([k, l]) => (
                  <div key={k}><Label>{l}</Label><Input type="number" min={0} value={form[k]} onChange={e => set(k, e.target.value)} /></div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ramadan rate covers Iftar + Suhoor for one day.</p>
            </section>

            <section>
              <h3 className="font-semibold text-sm mb-2">Room Rates (SAR per day, by room type)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cats.map(cat => (
                  <div key={cat.code} className="flex items-center gap-2 rounded-md border p-2">
                    <div className="flex-1 text-sm"><span className="font-mono font-semibold text-primary">{cat.code}</span> · {cat.name}</div>
                    <Input type="number" min={0} className="w-24" aria-label={`${cat.code} room rate`} value={roomRates[cat.code] ?? 0}
                      onChange={e => setRoomRates(r => ({ ...r, [cat.code]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>
            </section>

            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => set("is_active", v)} /><span>Active</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={save.isPending || !form.code || !form.name} onClick={() => save.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
