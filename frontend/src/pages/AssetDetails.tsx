import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays, parseISO } from "date-fns";
import { ArrowLeft, Save, ShieldCheck, ShieldAlert, Wrench, Plus, CalendarDays, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PastelKpiCard } from "@/components/ui/pastel-kpi";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { value: "repair", label: "Repair" },
  { value: "replacement", label: "Replacement" },
  { value: "inspection", label: "Inspection" },
  { value: "service", label: "Service" },
];
const CONDITIONS = [
  { value: "good", label: "In Use" },
  { value: "repair", label: "Needs Repair" },
  { value: "damaged", label: "Damaged" },
] as const;
const condLabel: Record<string, string> = { good: "In Use", repair: "Needs Repair", damaged: "Damaged" };

const detailFields = { purchase_date: "", purchase_cost: "", vendor: "", warranty_expiry: "", warranty_details: "", last_maintenance_date: "", notes: "" };
const emptyLog = { log_date: format(new Date(), "yyyy-MM-dd"), action_type: "repair", description: "", cost: "", performed_by: "", resulting_condition: "good" as "good" | "repair" | "damaged" };

function Chips<T extends string>({ options, value, onChange }: { options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <Button key={o.value} type="button" size="sm" variant={value === o.value ? "default" : "outline"} onClick={() => onChange(o.value)}>{o.label}</Button>
      ))}
    </div>
  );
}

export default function AssetDetails() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [form, setForm] = useState(detailFields);
  const [log, setLog] = useState(emptyLog);

  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("assets").select("*, camps(name), rooms(room_number, buildings:building_id(name))").eq("id", id!).single();
      if (error) throw error;
      return data as any;
    },
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["asset-logs", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("asset_maintenance_logs").select("*").eq("asset_id", id!).order("log_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!asset) return;
    setForm(Object.fromEntries(Object.keys(detailFields).map(k => [k, asset[k] ?? ""])) as typeof detailFields);
  }, [asset]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["asset", id] });
    qc.invalidateQueries({ queryKey: ["asset-logs", id] });
    qc.invalidateQueries({ queryKey: ["assets"] });
  };

  const saveDetails = useMutation({
    mutationFn: async () => {
      const n = (v: string) => (v === "" ? null : v);
      const { error } = await supabase.from("assets").update({
        purchase_date: n(form.purchase_date), purchase_cost: form.purchase_cost === "" ? null : Number(form.purchase_cost),
        vendor: n(form.vendor), warranty_expiry: n(form.warranty_expiry), warranty_details: n(form.warranty_details),
        last_maintenance_date: n(form.last_maintenance_date), notes: n(form.notes),
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast({ title: "Asset details saved" }); },
    onError: (e: any) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  const addLog = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("asset_maintenance_logs").insert({
        asset_id: id!, log_date: log.log_date, action_type: log.action_type, description: log.description || null,
        cost: Number(log.cost) || 0, performed_by: log.performed_by || null, resulting_condition: log.resulting_condition, created_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); setLog(emptyLog); toast({ title: "Maintenance entry recorded", description: "Asset status and last maintenance date updated." }); },
    onError: (e: any) => toast({ title: "Failed to record", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!asset) return <div className="p-8">Asset not found. <Link className="text-primary underline" to="/assets">Back to assets</Link></div>;

  const warrantyDays = asset.warranty_expiry ? differenceInDays(parseISO(asset.warranty_expiry), new Date()) : null;
  const maintCost = logs.reduce((s: number, l: any) => s + Number(l.cost || 0), 0);
  const set = (k: keyof typeof detailFields, v: string) => setForm(f => ({ ...f, [k]: v }));
  const fmtDate = (d?: string | null) => (d ? format(parseISO(d), "dd MMM yyyy") : "—");

  return (
    <div className="space-y-4">
      <Link to="/assets" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft size={14} /> Asset management</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{asset.name}</h1>
          <p className="text-sm text-muted-foreground"><span className="font-mono">{asset.asset_id}</span> · {asset.category} · {asset.camps?.name}{asset.rooms ? ` · ${asset.rooms.buildings?.name || ""} ${asset.rooms.room_number}` : ""} · Assigned to {asset.assigned_to || "—"}</p>
        </div>
        <Badge variant={asset.condition === "damaged" ? "destructive" : asset.condition === "repair" ? "secondary" : "default"}>{condLabel[asset.condition]}</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PastelKpiCard compact label="Purchase Cost" value={asset.purchase_cost != null ? `SAR ${Number(asset.purchase_cost).toLocaleString()}` : "—"} icon={Coins} tone="blue" hint={asset.purchase_date ? `Bought ${fmtDate(asset.purchase_date)}` : undefined} />
        <PastelKpiCard compact label="Warranty" value={warrantyDays == null ? "—" : warrantyDays >= 0 ? `${warrantyDays} days left` : "Expired"} icon={warrantyDays != null && warrantyDays < 0 ? ShieldAlert : ShieldCheck} tone={warrantyDays != null && warrantyDays < 0 ? "rose" : "mint"} hint={asset.warranty_expiry ? `Until ${fmtDate(asset.warranty_expiry)}` : undefined} />
        <PastelKpiCard compact label="Last Maintenance" value={fmtDate(asset.last_maintenance_date)} icon={CalendarDays} tone="violet" />
        <PastelKpiCard compact label="Maintenance Spend" value={`SAR ${maintCost.toLocaleString()}`} icon={Wrench} tone="amber" hint={`${logs.length} entries`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Asset Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={e => set("purchase_date", e.target.value)} /></div>
              <div><Label>Purchase Cost (SAR)</Label><Input type="number" min={0} value={form.purchase_cost} onChange={e => set("purchase_cost", e.target.value)} /></div>
              <div className="col-span-2"><Label>Vendor / Supplier</Label><Input value={form.vendor} onChange={e => set("vendor", e.target.value)} /></div>
              <div><Label>Warranty Expiry</Label><Input type="date" value={form.warranty_expiry} onChange={e => set("warranty_expiry", e.target.value)} /></div>
              <div><Label>Last Maintenance</Label><Input type="date" value={form.last_maintenance_date} onChange={e => set("last_maintenance_date", e.target.value)} /></div>
              <div className="col-span-2"><Label>Warranty Details</Label><Input value={form.warranty_details} onChange={e => set("warranty_details", e.target.value)} placeholder="e.g. 2-year manufacturer warranty, card #W-123" /></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
            </div>
            <Button onClick={() => saveDetails.mutate()} disabled={saveDetails.isPending} className="w-full"><Save size={16} className="mr-1" /> Save Details</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Maintenance Log</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
              <div className="space-y-1"><Label>Action</Label><Chips options={ACTIONS} value={log.action_type} onChange={v => setLog(l => ({ ...l, action_type: v }))} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label>Date</Label><Input type="date" value={log.log_date} onChange={e => setLog(l => ({ ...l, log_date: e.target.value }))} /></div>
                <div><Label>Cost (SAR)</Label><Input type="number" min={0} value={log.cost} onChange={e => setLog(l => ({ ...l, cost: e.target.value }))} /></div>
                <div><Label>Done By</Label><Input value={log.performed_by} onChange={e => setLog(l => ({ ...l, performed_by: e.target.value }))} placeholder="Technician / vendor" /></div>
              </div>
              <div><Label>Description</Label><Input value={log.description} onChange={e => setLog(l => ({ ...l, description: e.target.value }))} placeholder="What was done" /></div>
              <div className="space-y-1"><Label>Asset Status After</Label><Chips options={CONDITIONS} value={log.resulting_condition} onChange={v => setLog(l => ({ ...l, resulting_condition: v }))} /></div>
              <Button onClick={() => addLog.mutate()} disabled={addLog.isPending || !log.log_date}><Plus size={16} className="mr-1" /> Record Entry</Button>
            </div>

            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Cost</TableHead><TableHead>Status After</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No maintenance recorded yet</TableCell></TableRow>
                ) : logs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">{fmtDate(l.log_date)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{l.action_type}</Badge></TableCell>
                    <TableCell className="text-xs"><div>{l.description || "—"}</div><div className="text-muted-foreground">{l.performed_by}</div></TableCell>
                    <TableCell className="text-right">SAR {Number(l.cost).toLocaleString()}</TableCell>
                    <TableCell><span className={cn("text-xs font-medium", l.resulting_condition === "damaged" ? "text-destructive" : l.resulting_condition === "repair" ? "text-muted-foreground" : "text-primary")}>{condLabel[l.resulting_condition]}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
