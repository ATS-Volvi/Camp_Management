import { useState } from "react";
import { useItemAssignments, useCreateItemAssignment, useUpdateItemAssignment, useDeleteItemAssignment } from "@/hooks/useItemAssignments";
import { useCamps, useInventory } from "@/hooks/useInventory";
import { useEmployees } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VoiceDictationButton from "@/components/maintenance/VoiceDictationButton";
import { Plus, Search, Package, Users, RotateCcw, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";

const DEFAULT_ITEMS = [
  "Cot", "Bed", "Chair", "Table", "Bedsheet", "Pillow", "Blanket",
  "Mattress", "Towel", "Locker Key", "Cleaning Kit", "First Aid Kit",
  "Fan", "Bucket", "Mop Set",
];
const ITEM_CATEGORIES = ["Bedding", "Utility", "Safety", "Equipment", "Electrical", "Medical", "Surveillance"];
const ITEM_CONDITIONS = ["good", "fair", "damaged"];

export default function ItemAssignments() {
  const [campFilter, setCampFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [returnDialog, setReturnDialog] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useItemAssignments(campFilter === "all" ? undefined : campFilter);
  const { data: camps = [] } = useCamps();
  const { data: employees = [] } = useEmployees();
  const { data: inventoryItems = [] } = useInventory();

  // Merge default items with inventory item names (deduplicated)
  const allItemNames = Array.from(
    new Set([...DEFAULT_ITEMS, ...inventoryItems.map((i) => i.item_name)])
  ).sort();
  const createMut = useCreateItemAssignment();
  const updateMut = useUpdateItemAssignment();
  const deleteMut = useDeleteItemAssignment();

  // Form state
  const [form, setForm] = useState({
    employee_id: "",
    camp_id: "",
    item_name: "",
    category: "Bedding",
    quantity: 1,
    condition: "good",
    notes: "",
  });

  const filtered = assignments.filter((a) => {
    const q = search.toLowerCase();
    return (
      !q ||
      a.item_name.toLowerCase().includes(q) ||
      a.employees?.name?.toLowerCase().includes(q) ||
      a.employees?.employee_id?.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  });

  const activeCount = filtered.filter((a) => !a.returned_date).length;
  const returnedCount = filtered.filter((a) => !!a.returned_date).length;

  const handleAssign = () => {
    if (!form.employee_id || !form.camp_id || !form.item_name) return;
    createMut.mutate(form, {
      onSuccess: () => {
        setShowAssign(false);
        setForm({ employee_id: "", camp_id: "", item_name: "", category: "Bedding", quantity: 1, condition: "good", notes: "" });
      },
    });
  };

  const handleReturn = (id: string) => {
    updateMut.mutate({ id, returned_date: new Date().toISOString().split("T")[0] }, {
      onSuccess: () => setReturnDialog(null),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Item Assignments</h1>
          <p className="text-muted-foreground text-sm">Track items issued to employees (bedsheets, kits, etc.)</p>
        </div>
        <Button onClick={() => setShowAssign(true)}>
          <Plus size={16} className="mr-2" /> Assign Item
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Package size={20} className="text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Total Assignments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Users size={20} className="text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Currently Issued</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><RotateCcw size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{returnedCount}</p>
              <p className="text-xs text-muted-foreground">Returned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search item or employee…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={campFilter} onValueChange={setCampFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Camps" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Camps</SelectItem>
            {camps.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Emp ID</TableHead>
                <TableHead>Camp</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No assignments found</TableCell></TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.employees?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{a.employees?.employee_id ?? "—"}</TableCell>
                    <TableCell>{a.camps?.name ?? "—"}</TableCell>
                    <TableCell>{a.item_name}</TableCell>
                    <TableCell><Badge variant="outline">{a.category}</Badge></TableCell>
                    <TableCell>{a.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={a.condition === "good" ? "default" : a.condition === "fair" ? "secondary" : "destructive"}>
                        {a.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{format(new Date(a.assigned_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      {a.returned_date ? (
                        <Badge variant="secondary">Returned {format(new Date(a.returned_date), "dd MMM")}</Badge>
                      ) : (
                        <Badge className="bg-green-600 text-white">Issued</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!a.returned_date && (
                          <Button size="sm" variant="outline" onClick={() => setReturnDialog(a.id)}>
                            <RotateCcw size={14} className="mr-1" /> Return
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteMut.mutate(a.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Item to Employee</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Camp *</Label>
              <Select value={form.camp_id} onValueChange={(v) => setForm({ ...form, camp_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select camp" /></SelectTrigger>
                <SelectContent>
                  {camps.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employee *</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => !form.camp_id || e.camp_id === form.camp_id)
                    .map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item Name *</Label>
              <Select value={form.item_name} onValueChange={(v) => setForm({ ...form, item_name: v })}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {allItemNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEM_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Notes</Label>
                <VoiceDictationButton onTranscript={(text) => setForm({ ...form, notes: text })} />
              </div>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes or use Voice..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={createMut.isPending}>
              {createMut.isPending ? "Assigning…" : "Assign Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Confirmation */}
      <Dialog open={!!returnDialog} onOpenChange={() => setReturnDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mark as Returned?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will record today's date as the return date.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog(null)}>Cancel</Button>
            <Button onClick={() => returnDialog && handleReturn(returnDialog)} disabled={updateMut.isPending}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
