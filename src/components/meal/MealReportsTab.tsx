import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sunrise, Sun, Moon, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { PastelKpiCard, type PastelTone } from "@/components/ui/pastel-kpi";

type Pref = "all" | "veg" | "non_veg";

export default function MealReportsTab() {
  const [campId, setCampId] = useState<string>("all");
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 6 * 86400_000).toISOString().split("T")[0];
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [pref, setPref] = useState<Pref>("all");
  const [drill, setDrill] = useState<{ title: string; rows: any[] } | null>(null);

  // Keep a rolling window of meal orders auto-populated so the Ordered KPIs always have data
  useEffect(() => {
    supabase.rpc("seed_meal_orders_window" as any).then(() => {});
  }, []);

  const { data: camps = [] } = useQuery({
    queryKey: ["camps-list"],
    queryFn: async () => {
      const { data } = await supabase.from("camps").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: scans = [] } = useQuery({
    queryKey: ["report-scans", from, to, campId, pref],
    queryFn: async () => {
      let q = supabase
        .from("meal_scans")
        .select("*")
        .gte("meal_date", from)
        .lte("meal_date", to);
      if (campId !== "all") q = q.eq("camp_id", campId);
      if (pref !== "all") q = q.eq("preference", pref);
      const { data, error } = await q;
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((s) => s.employee_id)));
      const { data: emps } = ids.length
        ? await supabase.from("employees").select("id, name, employee_id").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((emps ?? []).map((e) => [e.id, e]));
      return (data ?? []).map((s) => ({ ...s, employee: map.get(s.employee_id) }));
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["report-orders", from, to, campId, pref],
    queryFn: async () => {
      let q = supabase
        .from("meal_order_items")
        .select("meal_date, meal_type, preference, meal_orders!inner(employee_id, employees!inner(id, name, employee_id, camp_id))")
        .gte("meal_date", from)
        .lte("meal_date", to);
      if (pref !== "all") q = q.eq("preference", pref);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as any[];
      if (campId !== "all") rows = rows.filter((r) => r.meal_orders?.employees?.camp_id === campId);
      return rows;
    },
  });

  const { data: wastage = [] } = useQuery({
    queryKey: ["report-wastage", from, to, campId],
    queryFn: async () => {
      let q = supabase
        .from("food_wastage")
        .select("*, ingredients(name)")
        .gte("wastage_date", from)
        .lte("wastage_date", to);
      if (campId !== "all") q = q.eq("camp_id", campId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const kpis = useMemo(() => {
    const ord = (m: string) => orders.filter((o: any) => o.meal_type === m);
    const con = (m: string) => scans.filter((s: any) => s.meal_type === m);
    return {
      bfOrdered: ord("breakfast"),
      bfConsumed: con("breakfast"),
      lunchOrdered: ord("lunch"),
      lunchConsumed: con("lunch"),
      dinnerOrdered: ord("dinner"),
      dinnerConsumed: con("dinner"),
      wastageCost: wastage.reduce(
        (sum: number, w: any) => sum + Number(w.wasted_qty) * Number(w.unit_cost || 0),
        0,
      ),
    };
  }, [orders, scans, wastage]);

  const orderRows = (rows: any[]) =>
    rows.map((r: any) => ({
      Date: r.meal_date,
      Employee: r.meal_orders?.employees?.name ?? "—",
      Code: r.meal_orders?.employees?.employee_id ?? "—",
      Preference: r.preference,
    }));

  const scanRows = (rows: any[]) =>
    rows.map((r: any) => ({
      Date: r.meal_date,
      Time: new Date(r.scanned_at).toLocaleTimeString(),
      Employee: r.employee?.name ?? "—",
      Code: r.employee?.employee_id ?? "—",
      Preference: r.preference ?? "—",
      Status: r.is_ordered ? "Ordered" : "Unauthorized",
    }));

  const wastageRows = wastage.map((w: any) => ({
    Date: w.wastage_date,
    Ingredient: w.ingredients?.name ?? "—",
    Meal: w.meal_type,
    Qty: Number(w.wasted_qty).toFixed(2),
    "Unit Cost": Number(w.unit_cost).toFixed(2),
    Cost: (Number(w.wasted_qty) * Number(w.unit_cost)).toFixed(2),
    Reason: w.reason ?? "—",
  }));

  const tiles: Array<{ key: string; label: string; icon: any; tone: PastelTone; value: string | number; rows: any[] }> = [
    { key: "bfOrdered", label: "BF Ordered", icon: Sunrise, tone: "amber", value: kpis.bfOrdered.length, rows: orderRows(kpis.bfOrdered) },
    { key: "bfConsumed", label: "BF Consumed", icon: CheckCircle2, tone: "mint", value: kpis.bfConsumed.length, rows: scanRows(kpis.bfConsumed) },
    { key: "lunchOrdered", label: "Lunch Ordered", icon: Sun, tone: "pink", value: kpis.lunchOrdered.length, rows: orderRows(kpis.lunchOrdered) },
    { key: "lunchConsumed", label: "Lunch Consumed", icon: CheckCircle2, tone: "green", value: kpis.lunchConsumed.length, rows: scanRows(kpis.lunchConsumed) },
    { key: "dinnerOrdered", label: "Dinner Ordered", icon: Moon, tone: "indigo", value: kpis.dinnerOrdered.length, rows: orderRows(kpis.dinnerOrdered) },
    { key: "dinnerConsumed", label: "Dinner Consumed", icon: CheckCircle2, tone: "teal", value: kpis.dinnerConsumed.length, rows: scanRows(kpis.dinnerConsumed) },
    { key: "wastage", label: "Wastage Cost", icon: Trash2, tone: "rose", value: `SAR ${kpis.wastageCost.toFixed(0)}`, rows: wastageRows },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Camp</Label>
            <Select value={campId} onValueChange={setCampId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Camps</SelectItem>
                {camps.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Preference</Label>
            <Select value={pref} onValueChange={(v) => setPref(v as Pref)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="veg">Veg</SelectItem>
                <SelectItem value="non_veg">Non-Veg</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map((t) => (
          <PastelKpiCard
            key={t.key}
            label={t.label}
            value={t.value}
            icon={t.icon}
            tone={t.tone}
            hint="Click to drill down"
            onClick={() => setDrill({ title: t.label, rows: t.rows })}
            compact
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" /> Variance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-2">Meal</th>
                  <th className="text-right p-2">Ordered</th>
                  <th className="text-right p-2">Consumed</th>
                  <th className="text-right p-2">Variance</th>
                  <th className="text-right p-2">No-Show %</th>
                </tr>
              </thead>
              <tbody>
                {(["breakfast", "lunch", "dinner"] as const).map((m) => {
                  const o = (kpis as any)[`${m === "breakfast" ? "bf" : m}Ordered`].length;
                  const c = (kpis as any)[`${m === "breakfast" ? "bf" : m}Consumed`].length;
                  const v = o - c;
                  const pct = o ? ((v / o) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={m} className="border-b last:border-0">
                      <td className="p-2 capitalize">{m}</td>
                      <td className="p-2 text-right">{o}</td>
                      <td className="p-2 text-right">{c}</td>
                      <td className="p-2 text-right">
                        <Badge variant={v > 0 ? "outline" : "default"} className={v > 0 ? "border-orange-500 text-orange-700 dark:text-orange-400" : ""}>
                          {v > 0 ? `+${v}` : v}
                        </Badge>
                      </td>
                      <td className="p-2 text-right">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drill?.title} — Drill Down ({drill?.rows.length ?? 0})</DialogTitle>
          </DialogHeader>
          {drill && drill.rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    {Object.keys(drill.rows[0]).map((k) => (
                      <th key={k} className="text-left p-2 text-muted-foreground font-medium">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drill.rows.map((r: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      {Object.values(r).map((v: any, j: number) => (
                        <td key={j} className="p-2">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No records found.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
