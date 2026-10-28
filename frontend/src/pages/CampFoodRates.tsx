import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type Camp = { id: string; name: string; location: string | null };
type Rate = { camp_id: string; breakfast_rate: number; lunch_rate: number; dinner_rate: number; ramadan_rate: number };

const emptyForm = { breakfast_rate: 0, lunch_rate: 0, dinner_rate: 0, ramadan_rate: 0 };

export default function CampFoodRates() {
  const qc = useQueryClient();
  const { data: camps = [], isLoading: loadingCamps } = useQuery({
    queryKey: ["camps-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name, location").order("name");
      if (error) throw error;
      return data as Camp[];
    },
  });
  const { data: rates = [], isLoading: loadingRates } = useQuery({
    queryKey: ["camp-meal-rates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camp_meal_rates").select("camp_id, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate");
      if (error) throw error;
      return data as Rate[];
    },
  });

  const [open, setOpen] = useState(false);
  const [camp, setCamp] = useState<Camp | null>(null);
  const [form, setForm] = useState(emptyForm);

  const rateByCamp: Record<string, Rate> = Object.fromEntries(rates.map(r => [r.camp_id, r]));

  const openEdit = (c: Camp) => {
    const r = rateByCamp[c.id];
    setForm(r ? {
      breakfast_rate: Number(r.breakfast_rate), lunch_rate: Number(r.lunch_rate),
      dinner_rate: Number(r.dinner_rate), ramadan_rate: Number(r.ramadan_rate),
    } : emptyForm);
    setCamp(c); setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!camp) return;
      const payload = {
        camp_id: camp.id,
        breakfast_rate: Number(form.breakfast_rate) || 0,
        lunch_rate: Number(form.lunch_rate) || 0,
        dinner_rate: Number(form.dinner_rate) || 0,
        ramadan_rate: Number(form.ramadan_rate) || 0,
      };
      const { error } = await supabase.from("camp_meal_rates").upsert(payload, { onConflict: "camp_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-meal-rates"] });
      qc.invalidateQueries({ queryKey: ["revenue-data"] });
      qc.invalidateQueries({ queryKey: ["invoice-data"] });
      toast({ title: "Food rates saved", description: camp?.name });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const sar = (n: number) => `SAR ${Number(n || 0).toFixed(2)}`;
  const set = (k: keyof typeof emptyForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><UtensilsCrossed className="text-primary" /> Camp Food Rates</h1>
        <p className="text-sm text-muted-foreground">
          Standard meal prices per camp for own staff and camp staff. Supplier employees are always billed at their Supplier Master rates.
          Camps without rates fall back to the room's daily food rate split evenly across the three meals.
        </p>
      </div>

      <Card className="p-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Camp</TableHead><TableHead>Location</TableHead>
              <TableHead className="text-right">Breakfast</TableHead><TableHead className="text-right">Lunch</TableHead>
              <TableHead className="text-right">Dinner</TableHead><TableHead className="text-right">Ramadan (per day)</TableHead>
              <TableHead className="text-right">Daily Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingCamps || loadingRates ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : camps.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No camps found.</TableCell></TableRow>
            ) : camps.map(c => {
              const r = rateByCamp[c.id];
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.location || "—"}</TableCell>
                  <TableCell className="text-right">{r ? sar(r.breakfast_rate) : "—"}</TableCell>
                  <TableCell className="text-right">{r ? sar(r.lunch_rate) : "—"}</TableCell>
                  <TableCell className="text-right">{r ? sar(r.dinner_rate) : "—"}</TableCell>
                  <TableCell className="text-right">{r ? sar(r.ramadan_rate) : "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{r ? sar(Number(r.breakfast_rate) + Number(r.lunch_rate) + Number(r.dinner_rate)) : "—"}</TableCell>
                  <TableCell><Badge variant={r ? "default" : "secondary"}>{r ? "Configured" : "Room default"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" aria-label={`Set rates for ${c.name}`} onClick={() => openEdit(c)}>
                      <Pencil size={14} className="mr-1" /> {r ? "Edit" : "Set Rates"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Food Rates — {camp?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {([["breakfast_rate", "Breakfast (SAR)"], ["lunch_rate", "Lunch (SAR)"], ["dinner_rate", "Dinner (SAR)"], ["ramadan_rate", "Ramadan per day (SAR)"]] as const).map(([k, l]) => (
                <div key={k}><Label>{l}</Label><Input type="number" min={0} step="0.01" value={form[k]} onChange={e => set(k, e.target.value)} /></div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Ramadan rate covers Iftar + Suhoor for one day and replaces the three-meal total during Ramadan.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
