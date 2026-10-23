import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useAllPriceHistory, useAddPriceEntry, useGroceryItems } from "@/hooks/useGroceryInventory";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { usePriceHistory } from "@/hooks/useGroceryInventory";

export default function PriceHistoryTab() {
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ingredient_id: "", price: 0, effective_date: new Date().toISOString().split("T")[0], source: "manual", invoice_reference: "", notes: "" });

  const { data: allHistory = [] } = useAllPriceHistory();
  const { data: items = [] } = useGroceryItems();
  const { data: itemHistory = [] } = usePriceHistory(selectedItem || undefined);
  const addPrice = useAddPriceEntry();

  const handleAdd = async () => {
    if (!form.ingredient_id || form.price <= 0) return;
    await addPrice.mutateAsync(form);
    setForm({ ingredient_id: "", price: 0, effective_date: new Date().toISOString().split("T")[0], source: "manual", invoice_reference: "", notes: "" });
    setAddOpen(false);
  };

  // Chart data for selected item
  const chartData = [...itemHistory].reverse().map((h: any) => ({
    date: format(new Date(h.effective_date), "dd MMM"),
    price: h.price,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[250px]">
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger><SelectValue placeholder="Select item to view trends" /></SelectTrigger>
              <SelectContent>
                {items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={16} className="mr-1" /> Record Price</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record New Price</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Item *</Label>
                <Select value={form.ingredient_id} onValueChange={v => setForm({ ...form, ingredient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>
                    {items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (SAR) *</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} /></div>
                <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="grn">GRN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Invoice Ref</Label><Input value={form.invoice_reference} onChange={e => setForm({ ...form, invoice_reference: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleAdd} disabled={addPrice.isPending} className="w-full">Save Price</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Price Trend Chart */}
      {selectedItem && chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Price Trend — {items.find((i: any) => i.id === selectedItem)?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{selectedItem ? "Item Price History" : "Recent Price Updates (All Items)"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Price (SAR)</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Invoice Ref</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(selectedItem ? itemHistory : allHistory).map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.ingredients?.name || "—"}</TableCell>
                  <TableCell className="font-mono">{Number(h.price || 0).toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(h.effective_date), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{h.source}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{h.invoice_reference || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{h.notes || "—"}</TableCell>
                </TableRow>
              ))}
              {(selectedItem ? itemHistory : allHistory).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No price history found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
