import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from "@/hooks/useAssets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Download, Plus, MoreHorizontal, ChevronLeft, ChevronRight, Pencil, Trash2, Package, Wrench, AlertTriangle, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { toast } from "@/hooks/use-toast";
import AssetDashboard from "@/components/assets/AssetDashboard";
import type { TablesInsert } from "@/integrations/supabase/types";

const CONDITIONS = ["good", "repair", "damaged"] as const;
const CATEGORIES = ["Furniture", "Electrical", "Plumbing", "HVAC", "Safety", "IT Equipment", "Kitchen", "Bedding", "Utility", "Equipment", "Medical", "Surveillance"];

const conditionColors: Record<string, string> = {
  good: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  repair: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  damaged: "bg-destructive/10 text-destructive",
};

const conditionLabel: Record<string, string> = {
  good: "In Use",
  repair: "Repair",
  damaged: "Damaged",
};

type AssetForm = {
  asset_id: string;
  name: string;
  category: string;
  condition: "good" | "repair" | "damaged";
  camp_id: string;
  room_id: string;
  assigned_to: string;
};

const emptyForm: AssetForm = { asset_id: "", name: "", category: "", condition: "good", camp_id: "", room_id: "", assigned_to: "" };

type Tab = "overview" | "all";

export default function AssetManagement() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [filterCamp, setFilterCamp] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: assets = [], isLoading } = useAssets();
  const { data: camps = [] } = useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name, location");
      if (error) throw error;
      return data;
    },
  });
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-for-assets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, room_number, camp_id, building_id, buildings:building_id(name)");
      if (error) throw error;
      return data;
    },
  });

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const campMap: Record<string, string> = {};
  camps.forEach((c: any) => { campMap[c.id] = c.name; });
  const campLocationMap: Record<string, string> = {};
  camps.forEach((c: any) => { campLocationMap[c.id] = c.location; });

  const filtered = assets.filter((a: any) => {
    const matchesCamp = filterCamp === "all" || a.camp_id === filterCamp;
    const q = search.toLowerCase();
    const matchesSearch = !q || a.asset_id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.assigned_to || "").toLowerCase().includes(q);
    return matchesCamp && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Overview stats
  const totalAssets = assets.length;
  const goodAssets = assets.filter((a: any) => a.condition === "good").length;
  const repairAssets = assets.filter((a: any) => a.condition === "repair").length;
  const damagedAssets = assets.filter((a: any) => a.condition === "damaged").length;

  const pieData = [
    { name: "In Use", value: goodAssets, color: "hsl(var(--campman-green))" },
    { name: "Repair", value: repairAssets, color: "hsl(var(--campman-amber))" },
    { name: "Damaged", value: damagedAssets, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0);

  const categoryBreakdown = CATEGORIES.map(cat => ({
    name: cat,
    count: assets.filter((a: any) => a.category === cat).length,
  })).filter(c => c.count > 0);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (asset: any) => {
    setEditingId(asset.id);
    setForm({ asset_id: asset.asset_id, name: asset.name, category: asset.category, condition: asset.condition, camp_id: asset.camp_id, room_id: asset.room_id || "", assigned_to: asset.assigned_to || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.asset_id || !form.name || !form.category || !form.camp_id) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    try {
      if (editingId) {
        await updateAsset.mutateAsync({ id: editingId, asset_id: form.asset_id, name: form.name, category: form.category, condition: form.condition, camp_id: form.camp_id, room_id: form.room_id || null, assigned_to: form.assigned_to || null });
        toast({ title: "Asset updated successfully" });
      } else {
        await createAsset.mutateAsync({ asset_id: form.asset_id, name: form.name, category: form.category, condition: form.condition, camp_id: form.camp_id, room_id: form.room_id || null, assigned_to: form.assigned_to || null } as TablesInsert<"assets">);
        toast({ title: "Asset created successfully" });
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteAsset.mutateAsync(deleteId); toast({ title: "Asset deleted" }); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setDeleteId(null);
  };

  const filteredRooms = rooms.filter((r: any) => !form.camp_id || r.camp_id === form.camp_id);

  const tabs: { label: string; value: Tab }[] = [
    { label: "Dashboard", value: "overview" },
    { label: "All Assets", value: "all" },
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Home / Asset management</div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Asset management</h1>
        <div className="flex gap-3">
          <Button variant="outline"><Download size={16} className="mr-1.5" /> Export</Button>
          <Button onClick={openCreate}><Plus size={16} className="mr-1.5" /> New Asset</Button>
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
                tab === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className={`flex items-center gap-3 ${tab === "overview" ? "hidden" : ""}`}>
          <div className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm">
            <Search size={16} className="text-muted-foreground" />
            <input
              placeholder="Search by Serial No / Name"
              className="bg-transparent outline-none text-sm w-48"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={filterCamp} onValueChange={(v) => { setFilterCamp(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <Filter size={14} className="mr-1.5" />
              <SelectValue placeholder="All Camps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Camps</SelectItem>
              {camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {tab === "overview" && <AssetDashboard assets={assets} camps={camps} rooms={rooms} />}

      {/* All Assets Tab */}
      {tab === "all" && (
        <>
          <div className="bg-card rounded-xl border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading assets...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No assets found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Camp Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Asset ID</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Block</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Room</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Assigned To</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Location</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Last Updated</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((asset: any) => (
                    <tr key={asset.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{asset.camps?.name || "—"}</td>
                      <td className="p-3 font-mono text-xs">{asset.asset_id}</td>
                      <td className="p-3">{asset.rooms?.buildings?.name || "—"}</td>
                      <td className="p-3">{asset.rooms?.room_number || "—"}</td>
                      <td className="p-3"><Link to={`/assets/${asset.id}`} className="text-primary hover:underline font-medium">{asset.name}</Link></td>
                      <td className="p-3">{asset.category}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${conditionColors[asset.condition] || ""}`}>
                          {conditionLabel[asset.condition] || asset.condition}
                        </span>
                      </td>
                      <td className="p-3">{asset.assigned_to || "—"}</td>
                      <td className="p-3 text-muted-foreground">{campLocationMap[asset.camp_id] || "—"}</td>
                      <td className="p-3 text-muted-foreground">
                        {asset.last_updated ? new Date(asset.last_updated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-muted">
                              <MoreHorizontal size={16} className="text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/assets/${asset.id}`)}>
                              <Eye size={14} className="mr-2" /> View Details & Log
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(asset)}>
                              <Pencil size={14} className="mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(asset.id)}>
                              <Trash2 size={14} className="mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={16} /> Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded text-sm ${page === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{p}</button>
                ))}
                {totalPages > 5 && (
                  <>
                    <span className="text-muted-foreground px-1">...</span>
                    <button onClick={() => setPage(totalPages)} className={`w-8 h-8 rounded text-sm ${page === totalPages ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{totalPages}</button>
                  </>
                )}
              </div>
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit Asset" : "New Asset"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Asset ID *</Label>
                <Input value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })} placeholder="AST-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mattress" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={(v: any) => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => <SelectItem key={c} value={c} className="capitalize">{conditionLabel[c] || c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Camp *</Label>
                <Select value={form.camp_id} onValueChange={(v) => setForm({ ...form, camp_id: v, room_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select camp" /></SelectTrigger>
                  <SelectContent>{camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Room</Label>
                <Select value={form.room_id || "none"} onValueChange={(v) => setForm({ ...form, room_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {filteredRooms.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.buildings?.name ? `${r.buildings.name} - ` : ""}{r.room_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Employee name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createAsset.isPending || updateAsset.isPending}>
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
