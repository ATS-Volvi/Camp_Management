import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useConsumptionLogs } from "@/hooks/useGroceryInventory";
import { useCamps } from "@/hooks/useInventory";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function ConsumptionTab() {
  const [campId, setCampId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: camps = [] } = useCamps();
  const { data: logs = [], isLoading } = useConsumptionLogs(campId || undefined, date || undefined);

  // Aggregate by meal type
  const mealCosts: Record<string, number> = {};
  const categoryBreakdown: Record<string, number> = {};
  logs.forEach((l: any) => {
    const cost = (l.consumed_qty || 0) * (l.unit_cost_at_time || 0);
    mealCosts[l.meal_type] = (mealCosts[l.meal_type] || 0) + cost;
    const cat = l.ingredients?.category || "Other";
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + cost;
  });

  const mealChartData = Object.entries(mealCosts).map(([meal, cost]) => ({ meal, cost: +cost.toFixed(2) }));
  const catChartData = Object.entries(categoryBreakdown).map(([cat, cost]) => ({ name: cat, value: +cost.toFixed(2) }));
  const totalCost = Object.values(mealCosts).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-end">
        <div className="w-[200px]">
          <Label className="text-xs">Camp</Label>
          <Select value={campId} onValueChange={v => setCampId(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="All Camps" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Camps</SelectItem>
              {camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[180px]">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <Card className="px-4 py-2 ml-auto">
          <p className="text-xs text-muted-foreground">Total Cost</p>
          <p className="text-xl font-bold">SAR {totalCost.toFixed(2)}</p>
        </Card>
      </div>

      {/* Charts */}
      {logs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Cost by Meal Type</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mealChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="meal" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Cost by Category</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={catChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {catChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Consumption Log Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Consumption Log</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Meal</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty Used</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Camp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No consumption records for this date</TableCell></TableRow>
              ) : logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{format(new Date(l.consumption_date), "dd MMM yyyy")}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{l.meal_type}</Badge></TableCell>
                  <TableCell className="font-medium">{l.ingredients?.name || "—"}</TableCell>
                  <TableCell className="text-xs">{l.ingredients?.category || "—"}</TableCell>
                  <TableCell>{l.consumed_qty}</TableCell>
                  <TableCell className="font-mono">{Number(l.unit_cost_at_time || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-mono font-semibold">{(Number(l.consumed_qty || 0) * Number(l.unit_cost_at_time || 0)).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{l.camps?.name || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
