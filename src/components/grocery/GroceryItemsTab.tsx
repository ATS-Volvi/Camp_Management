import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, AlertTriangle, ArrowUpDown, Package } from "lucide-react";
import { useGroceryItems, useIngredientCategories, useCateringStockSummary, useAddPriceEntry } from "@/hooks/useGroceryInventory";
import { useUpsertIngredient } from "@/hooks/useCatering";
import { useCamps } from "@/hooks/useInventory";
import { format } from "date-fns";

export default function GroceryItemsTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [campId, setCampId] = useState<string>("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", unit: "kg", category: "Miscellaneous", unit_cost: 0, reorder_level: 5 });

  const { data: items = [], isLoading } = useGroceryItems(search || undefined, category || undefined);
  const { data: categories = [] } = useIngredientCategories();
  const { data: camps = [] } = useCamps();
  const { data: stock = [] } = useCateringStockSummary(campId || undefined);
  const upsertIngredient = useUpsertIngredient();
  const addPrice = useAddPriceEntry();

  // Default to first camp so stock is visible immediately
  useEffect(() => {
    if (!campId && camps.length > 0) setCampId(camps[0].id);
  }, [camps, campId]);

  // Build stock map
  const stockMap: Record<string, any> = {};
  stock.forEach((s: any) => {
    stockMap[s.ingredient_id] = s;
  });

  // Sort items
  const sorted = [...items].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") return a.name.localeCompare(b.name) * dir;
    if (sortField === "unit_cost") return ((a.unit_cost || 0) - (b.unit_cost || 0)) * dir;
    if (sortField === "category") return a.category.localeCompare(b.category) * dir;
    return 0;
  });

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const lowStockCount = sorted.filter(item => {
    const s = stockMap[item.id];
    if (!s) return false;
    const bal = (s.opening_stock || 0) + (s.stock_in || 0) - (s.stock_out || 0);
    return bal <= (s.min_level || item.reorder_level);
  }).length;

  const handleAddItem = async () => {
    if (!newItem.name) return;
    await upsertIngredient.mutateAsync(newItem);
    if (newItem.unit_cost > 0) {
      // We'll add price history after the ingredient is created
      // For now, the unit_cost is set on create
    }
    setNewItem({ name: "", unit: "kg", category: "Miscellaneous", unit_cost: 0, reorder_level: 5 });
    setAddOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <Package className="text-primary" size={28} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
              <ArrowUpDown className="text-blue-500" size={28} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-destructive">{lowStockCount}</p>
              </div>
              <AlertTriangle className="text-destructive" size={28} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Price</p>
                <p className="text-2xl font-bold">
                  {items.length ? (items.reduce((s, i) => s + (i.unit_cost || 0), 0) / items.length).toFixed(2) : "0"}
                </p>
              </div>
              <span className="text-lg font-bold text-green-600">SAR</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="w-[180px]">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={v => setCategory(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Label className="text-xs">Camp (Stock View)</Label>
              <Select value={campId} onValueChange={v => setCampId(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select Camp" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Camps</SelectItem>
                  {camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus size={16} className="mr-1" /> Add Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Grocery Item</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Item Name *</Label><Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Unit</Label><Input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} /></div>
                    <div><Label>Category</Label><Input value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Unit Cost (SAR)</Label><Input type="number" value={newItem.unit_cost} onChange={e => setNewItem({ ...newItem, unit_cost: +e.target.value })} /></div>
                    <div><Label>Reorder Level</Label><Input type="number" value={newItem.reorder_level} onChange={e => setNewItem({ ...newItem, reorder_level: +e.target.value })} /></div>
                  </div>
                  <Button onClick={handleAddItem} disabled={upsertIngredient.isPending} className="w-full">Save Item</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                  Item Name {sortField === "name" && (sortDir === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("category")}>
                  Category {sortField === "category" && (sortDir === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Available Qty</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("unit_cost")}>
                  Rate (SAR) {sortField === "unit_cost" && (sortDir === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : sorted.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No items found</TableCell></TableRow>
              ) : sorted.map(item => {
                const s = stockMap[item.id];
                const bal = s ? (s.opening_stock || 0) + (s.stock_in || 0) - (s.stock_out || 0) : 0;
                const isLow = s ? bal <= (s.min_level || item.reorder_level) : false;
                return (
                  <TableRow key={item.id} className={isLow ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className={isLow ? "text-destructive font-semibold" : ""}>
                      {campId ? bal.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell className="font-mono">{(item.unit_cost || 0).toFixed(2)}</TableCell>
                    <TableCell>{item.reorder_level}</TableCell>
                    <TableCell>
                      {campId ? (
                        isLow ? <Badge variant="destructive" className="text-xs">Low Stock</Badge> : <Badge className="bg-green-600 text-xs">OK</Badge>
                      ) : <span className="text-xs text-muted-foreground">Select camp</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(item.updated_at), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
