import { useState } from "react";
import { Package, AlertTriangle, Plus, Search, TrendingDown, TrendingUp, Edit2, Filter, Download, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useInventory, useCamps, useAddInventoryItem, useUpdateInventoryItem, useLowStockItems, InventoryItem } from "@/hooks/useInventory";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const CATEGORIES = ["Bedding", "Cleaning", "Electrical", "Food", "Furniture", "Kitchen", "Plumbing", "Safety", "Toiletries", "Tools", "Other"];

const statusColors: Record<string, string> = {
  "In Stock": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "Low Stock": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Out of Stock": "bg-destructive/10 text-destructive",
};

function getStatus(item: InventoryItem) {
  const balance = item.balance ?? 0;
  if (balance <= 0) return "Out of Stock";
  if (balance <= item.min_alert_level) return "Low Stock";
  return "In Stock";
}

type Tab = "overview" | "all" | "low-stock";

export default function InventoryManagement() {
  const [tab, setTab] = useState<Tab>("all");
  const [selectedCamp, setSelectedCamp] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const campFilter = selectedCamp === "all" ? undefined : selectedCamp;
  const { data: camps } = useCamps();
  const { data: items = [], isLoading } = useInventory(campFilter);
  const { data: lowStockItems = [] } = useLowStockItems(campFilter);

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return !q || item.item_name.toLowerCase().includes(q) || (item.vendor ?? "").toLowerCase().includes(q);
  });

  const displayItems = tab === "low-stock" ? lowStockItems : filtered;
  const totalPages = Math.max(1, Math.ceil(displayItems.length / pageSize));
  const paginated = displayItems.slice((page - 1) * pageSize, page * pageSize);

  const totalItems = items.length;
  const totalStock = items.reduce((sum, i) => sum + (i.balance ?? 0), 0);
  const lowCount = lowStockItems.length;
  const outOfStock = items.filter(i => (i.balance ?? 0) <= 0).length;

  const pieData = [
    { name: "In Stock", value: totalItems - lowCount - outOfStock, color: "hsl(var(--campman-green))" },
    { name: "Low Stock", value: lowCount, color: "hsl(var(--campman-amber))" },
    { name: "Out of Stock", value: outOfStock, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0);

  const categoryBreakdown = CATEGORIES.map(cat => ({
    name: cat,
    count: items.filter(i => i.category === cat).length,
    stock: items.filter(i => i.category === cat).reduce((s, i) => s + (i.balance ?? 0), 0),
  })).filter(c => c.count > 0);

  const tabs: { label: string; value: Tab }[] = [
    { label: "Overview", value: "overview" },
    { label: "All Items", value: "all" },
    { label: "Low Stock", value: "low-stock" },
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Home / Inventory</div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download size={16} className="mr-1.5" /> Export
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus size={16} className="mr-1.5" /> New Stock
          </Button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.value}
              onClick={() => { setTab(t.value); setPage(1); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm">
            <Search size={16} className="text-muted-foreground" />
            <input
              placeholder="Search for Items"
              className="bg-transparent outline-none text-sm w-44"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={selectedCamp} onValueChange={(v) => { setSelectedCamp(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <Filter size={14} className="mr-1.5" />
              <SelectValue placeholder="All Camps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Camps</SelectItem>
              {camps?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border shadow-sm bg-gradient-to-br from-blue-500/15 to-blue-600/5 border-blue-500/30">
              <CardContent className="pt-5 pb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center mb-3">
                  <Package size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-3xl font-bold mt-1 text-blue-700 dark:text-blue-300">{totalItems}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border-emerald-500/30">
              <CardContent className="pt-5 pb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center mb-3">
                  <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm text-muted-foreground">Total Stock</p>
                <p className="text-3xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">{totalStock.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm bg-gradient-to-br from-amber-500/15 to-amber-600/5 border-amber-500/30">
              <CardContent className="pt-5 pb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center mb-3">
                  <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-3xl font-bold mt-1 text-amber-700 dark:text-amber-300">{lowCount}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm bg-gradient-to-br from-rose-500/15 to-rose-600/5 border-rose-500/30">
              <CardContent className="pt-5 pb-4">
                <div className="w-10 h-10 rounded-lg bg-rose-500/15 flex items-center justify-center mb-3">
                  <TrendingDown size={20} className="text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-3xl font-bold mt-1 text-rose-700 dark:text-rose-300">{outOfStock}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stock Distribution */}
            <Card className="border shadow-sm">
              <CardHeader><CardTitle className="text-base">Stock Distribution</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <div className="flex items-center justify-center gap-8">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" strokeWidth={0}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 text-sm">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <span>{d.name}: <strong>{d.value}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8 text-sm">No inventory data</p>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="border shadow-sm">
              <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
              <CardContent>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">No data</p>
                ) : (
                  <div className="space-y-3">
                    {categoryBreakdown.map(cat => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{cat.name}</Badge>
                          <span className="text-xs text-muted-foreground">{cat.count} items</span>
                        </div>
                        <span className="text-sm font-medium">{cat.stock} units</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* All Items / Low Stock Tab */}
      {(tab === "all" || tab === "low-stock") && (
        <>
          <div className="bg-card rounded-xl border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : paginated.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {tab === "low-stock" ? "All items are sufficiently stocked ✓" : "No inventory items found."}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Camp Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Item Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Quantity Available</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Vendor</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Last Updated</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(item => {
                    const status = getStatus(item);
                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{(item as any).camp_name || "—"}</td>
                        <td className="p-3">{item.item_name}</td>
                        <td className="p-3">{item.category}</td>
                        <td className="p-3 text-right font-semibold">{item.balance ?? 0}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                            {status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{item.vendor || "—"}</td>
                        <td className="p-3 text-muted-foreground">
                          {item.updated_at ? new Date(item.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-muted">
                                <MoreHorizontal size={16} className="text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingItem(item)}>
                                <Edit2 size={14} className="mr-2" /> Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded text-sm ${
                      page === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {totalPages > 5 && (
                  <>
                    <span className="text-muted-foreground px-1">...</span>
                    <button
                      onClick={() => setPage(totalPages)}
                      className={`w-8 h-8 rounded text-sm ${
                        page === totalPages ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              <button
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <AddItemForm campId={selectedCamp} onClose={() => setAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Inventory Item</DialogTitle></DialogHeader>
          {editingItem && <EditItemForm item={editingItem} onClose={() => setEditingItem(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Add Item Form ───
function AddItemForm({ campId, onClose }: { campId: string; onClose: () => void }) {
  const addItem = useAddInventoryItem();
  const { data: camps } = useCamps();
  const [selectedCampId, setSelectedCampId] = useState(campId === "all" ? "" : campId);
  const [form, setForm] = useState({
    item_name: "", category: "Other", opening_stock: 0, stock_in: 0, stock_out: 0,
    min_alert_level: 10, vendor: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampId) return;
    addItem.mutate({ ...form, camp_id: selectedCampId }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Camp *</Label>
          <Select value={selectedCampId} onValueChange={setSelectedCampId}>
            <SelectTrigger><SelectValue placeholder="Select camp" /></SelectTrigger>
            <SelectContent>{camps?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Item Name *</Label>
          <Input required value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Opening Stock</Label>
          <Input type="number" min={0} value={form.opening_stock} onChange={e => setForm(f => ({ ...f, opening_stock: +e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Stock In</Label>
          <Input type="number" min={0} value={form.stock_in} onChange={e => setForm(f => ({ ...f, stock_in: +e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Stock Out</Label>
          <Input type="number" min={0} value={form.stock_out} onChange={e => setForm(f => ({ ...f, stock_out: +e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Min Alert Level</Label>
          <Input type="number" min={0} value={form.min_alert_level} onChange={e => setForm(f => ({ ...f, min_alert_level: +e.target.value }))} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Vendor</Label>
          <Input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Vendor name (optional)" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={addItem.isPending || !selectedCampId}>{addItem.isPending ? "Adding..." : "Add Item"}</Button>
      </div>
    </form>
  );
}

// ─── Edit Item Form ───
function EditItemForm({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const updateItem = useUpdateInventoryItem();
  const [form, setForm] = useState({
    item_name: item.item_name, category: item.category, opening_stock: item.opening_stock,
    stock_in: item.stock_in, stock_out: item.stock_out, min_alert_level: item.min_alert_level,
    vendor: item.vendor ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateItem.mutate({ id: item.id, ...form }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Item Name *</Label>
          <Input required value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Opening Stock</Label>
          <Input type="number" min={0} value={form.opening_stock} onChange={e => setForm(f => ({ ...f, opening_stock: +e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Stock In</Label>
          <Input type="number" min={0} value={form.stock_in} onChange={e => setForm(f => ({ ...f, stock_in: +e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Stock Out</Label>
          <Input type="number" min={0} value={form.stock_out} onChange={e => setForm(f => ({ ...f, stock_out: +e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Min Alert Level</Label>
          <Input type="number" min={0} value={form.min_alert_level} onChange={e => setForm(f => ({ ...f, min_alert_level: +e.target.value }))} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Vendor</Label>
          <Input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={updateItem.isPending}>{updateItem.isPending ? "Saving..." : "Save Changes"}</Button>
      </div>
    </form>
  );
}
