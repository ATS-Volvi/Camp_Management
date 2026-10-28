import { ChartDrilldown, type ChartSelection } from "@/components/dashboard/ChartDrilldown";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useGroceryItems, useCateringStockSummary, useAllPriceHistory } from "@/hooks/useGroceryInventory";
import { useCamps } from "@/hooks/useInventory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle } from "lucide-react";

export default function GroceryReportsTab() {
  const [chartSelection, setChartSelection] = useState<ChartSelection | null>(null);
  const [campId, setCampId] = useState<string>("");
  const { data: items = [] } = useGroceryItems();
  const { data: camps = [] } = useCamps();
  const { data: stock = [] } = useCateringStockSummary(campId || undefined);
  const { data: priceHistory = [] } = useAllPriceHistory();

  // Low stock items
  const lowStockItems = stock.filter((s: any) => {
    const bal = (s.opening_stock || 0) + (s.stock_in || 0) - (s.stock_out || 0);
    return bal <= (s.min_level || 5);
  });

  // Price change analysis
  const priceChanges: Record<string, { name: string; prices: number[] }> = {};
  priceHistory.forEach((h: any) => {
    const name = h.ingredients?.name || "Unknown";
    if (!priceChanges[h.ingredient_id]) priceChanges[h.ingredient_id] = { name, prices: [] };
    priceChanges[h.ingredient_id].prices.push(h.price);
  });

  const volatileItems = Object.values(priceChanges)
    .filter(p => p.prices.length >= 2)
    .map(p => {
      const min = Math.min(...p.prices);
      const max = Math.max(...p.prices);
      const change = min > 0 ? ((max - min) / min * 100) : 0;
      return { name: p.name, min, max, change: +change.toFixed(1), latest: p.prices[0] };
    })
    .sort((a, b) => b.change - a.change)
    .slice(0, 10);

  // Stock movement chart
  const stockChart = stock.slice(0, 15).map((s: any) => ({
    id: s.id,
    name: (s.ingredients?.name || "").substring(0, 12),
    in: s.stock_in || 0,
    out: s.stock_out || 0,
    balance: (s.opening_stock || 0) + (s.stock_in || 0) - (s.stock_out || 0),
  }));

  const openStock = (id: string, type: string) => setChartSelection({ title: `${type} · Stock record`, rows: stock.filter(r => r.id === id).map(r => ({ id: r.id, label: r.ingredients?.name ?? "Ingredient", fields: { Camp: camps.find(c => c.id === r.camp_id)?.name, Category: r.ingredients?.category, Unit: r.ingredients?.unit, "Opening stock": r.opening_stock, "Stock in": r.stock_in, "Stock out": r.stock_out, Balance: (r.opening_stock || 0) + (r.stock_in || 0) - (r.stock_out || 0), "Updated": r.updated_at } })) });
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="w-[200px]">
          <Label className="text-xs">Camp</Label>
          <Select value={campId} onValueChange={v => setCampId(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Select Camp" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Camps</SelectItem>
              {camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="text-destructive" size={16} /> Low Stock Alert ({lowStockItems.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Min Level</TableHead>
                  <TableHead>Deficit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((s: any) => {
                  const bal = (s.opening_stock || 0) + (s.stock_in || 0) - (s.stock_out || 0);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.ingredients?.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{s.ingredients?.category}</Badge></TableCell>
                      <TableCell className="text-destructive font-semibold">{bal.toFixed(1)} {s.ingredients?.unit}</TableCell>
                      <TableCell>{s.min_level}</TableCell>
                      <TableCell className="text-destructive font-mono">{(s.min_level - bal).toFixed(1)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Stock Movement Chart */}
      {campId && stockChart.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Stock Movement</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" angle={-20} textAnchor="end" height={60} />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar cursor="pointer" onClick={row => openStock(row.payload.id, "Stock In")} dataKey="in" fill="#10b981" name="Stock In" radius={[2, 2, 0, 0]} />
                  <Bar cursor="pointer" onClick={row => openStock(row.payload.id, "Stock Out")} dataKey="out" fill="#ef4444" name="Stock Out" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Volatility */}
      {volatileItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Price Volatility (Top 10)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Min Price</TableHead>
                  <TableHead>Max Price</TableHead>
                  <TableHead>Latest</TableHead>
                  <TableHead>Variation %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volatileItems.map((v, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="font-mono">{v.min.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{v.max.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{v.latest.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={v.change > 20 ? "destructive" : "outline"} className="text-xs">
                        {v.change}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <ChartDrilldown selection={chartSelection} onClose={() => setChartSelection(null)} />
    </div>
  );
}
