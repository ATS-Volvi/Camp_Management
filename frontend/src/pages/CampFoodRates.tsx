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
import { useRoomCategoryMaster } from "@/hooks/useRoomCategoryMaster";
import { resolveCampMealRates } from "@/lib/campMealRates";
import type { Database } from "@/integrations/supabase/types";

type Camp = { id: string; name: string; location: string | null };
type Rate = { camp_id: string; breakfast_rate: number; lunch_rate: number; dinner_rate: number; ramadan_rate: number };

const emptyForm = { breakfast_rate: 0, lunch_rate: 0, dinner_rate: 0, ramadan_rate: 0 };

export default function CampFoodRates() {
  const qc = useQueryClient();
  const { data: masterCategories = [] } = useRoomCategoryMaster();
  const categories = masterCategories.filter(c => c.is_active && c.category_key);
  const { data: roomRates = [] } = useQuery({
    queryKey: ["camp-room-meal-rates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camp_room_meal_rates").select("camp_id, room_category, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate");
      if (error) throw error;
      return data;
    },
  });
  const [roomCamp, setRoomCamp] = useState<Camp | null>(null);
  const [roomForms, setRoomForms] = useState<Record<string, typeof emptyForm>>({});
  const { data: camps = [], isLoading: loadingCamps } = useQuery({
    queryKey: ["camps-dropdown"],
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
  const editRoomRates = (c: Camp) => {
    const drafts: Record<string, typeof emptyForm> = {};
    categories.forEach(category => {
      if (!category.category_key) return;
      const resolved = resolveCampMealRates(c.id, category.category_key, roomRates, rates, 0);
      drafts[category.category_key] = { breakfast_rate: resolved.breakfast, lunch_rate: resolved.lunch, dinner_rate: resolved.dinner, ramadan_rate: resolved.ramadan };
    });
    setRoomForms(drafts);
    setRoomCamp(c);
  };
  const saveRoomRates = useMutation({
    mutationFn: async () => {
      if (!roomCamp) throw new Error("Choose a camp");
      const payload = Object.entries(roomForms).map(([category, values]) => {
        if (Object.values(values).some(v => !Number.isFinite(Number(v)) || Number(v) < 0)) throw new Error("Prices must be zero or greater");
        return { camp_id: roomCamp.id, room_category: category as Database["public"]["Enums"]["room_category"], ...Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v)])) };
      });
      if (!payload.length) throw new Error("No active room types configured");
      const { error } = await supabase.from("camp_room_meal_rates").upsert(payload, { onConflict: "camp_id,room_category" });
      if (error) throw error;
    },
    onSuccess: () => {
      ["camp-room-meal-rates", "revenue-data", "invoice-data", "camp-inmates"].forEach(key => qc.invalidateQueries({ queryKey: [key] }));
      toast({ title: "Room-type food rates saved", description: roomCamp?.name });
      setRoomCamp(null);
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

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
      qc.invalidateQueries({ queryKey: ["camp-inmates"] });
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
                  <TableCell><Badge variant={r ? "default" : "secondary"}>{roomRates.some(rate => rate.camp_id === c.id) ? "Room-type rates" : r ? "Camp default" : "Room default"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="mr-2" aria-label={`Room type rates for ${c.name}`} onClick={() => editRoomRates(c)}><UtensilsCrossed size={14} className="mr-1" /> Room Type Rates</Button>
                    <Button size="sm" variant="outline" aria-label={`Set rates for ${c.name}`} onClick={() => openEdit(c)}>
                      <Pencil size={14} className="mr-1" /> Camp Default
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
      <Dialog open={roomCamp !== null} onOpenChange={value => { if (!value) setRoomCamp(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Room Type Food Rates — {roomCamp?.name}</DialogTitle></DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Room Type</TableHead><TableHead>Breakfast (SAR)</TableHead><TableHead>Lunch (SAR)</TableHead><TableHead>Dinner (SAR)</TableHead><TableHead>Ramadan / day (SAR)</TableHead></TableRow></TableHeader>
              <TableBody>{categories.map(category => {
                const key = category.category_key;
                if (!key || !roomForms[key]) return null;
                return <TableRow key={key}><TableCell className="font-medium whitespace-nowrap">{category.name}</TableCell>
                  {(["breakfast_rate", "lunch_rate", "dinner_rate", "ramadan_rate"] as const).map(field => <TableCell key={field}><Input className="min-w-[85px]" aria-label={`${key} ${field.replace("_rate", "")} rate`} type="number" min={0} step="0.01" value={roomForms[key][field]} onChange={e => setRoomForms(previous => ({ ...previous, [key]: { ...previous[key], [field]: Number(e.target.value) } }))} /></TableCell>)}
                </TableRow>;
              })}</TableBody>
            </Table>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRoomCamp(null)}>Cancel</Button><Button disabled={saveRoomRates.isPending || categories.length === 0} onClick={() => saveRoomRates.mutate()}>Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
