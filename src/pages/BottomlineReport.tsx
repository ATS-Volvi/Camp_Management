import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Plus, TrendingUp, TrendingDown, DollarSign, Building2, Zap, Droplets, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  useCampUtilities, useAddUtility, useDeleteUtility,
  useCampSupplierCosts, useAddSupplierCost, useDeleteSupplierCost,
  useCampRoomIncome, useCampRoomRates, useCampsWithRent
} from "@/hooks/useCampFinancials";

const UTILITY_TYPES = ["electricity", "water", "gas", "sewage", "internet", "other"];
const COST_TYPES = ["manpower", "catering", "cleaning", "security", "transportation", "other"];

export default function BottomlineReport() {
  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [campFilter, setCampFilter] = useState("all");
  const [addUtilityOpen, setAddUtilityOpen] = useState(false);
  const [addCostOpen, setAddCostOpen] = useState(false);

  const { data: camps = [] } = useCampsWithRent();
  const { data: utilities = [] } = useCampUtilities(campFilter !== "all" ? campFilter : undefined, selectedMonth + "-01");
  const { data: supplierCosts = [] } = useCampSupplierCosts(campFilter !== "all" ? campFilter : undefined, selectedMonth + "-01");
  const { data: rooms = [] } = useCampRoomIncome(campFilter !== "all" ? campFilter : undefined);
  const { data: rates = [] } = useCampRoomRates();
  const addUtility = useAddUtility();
  const deleteUtility = useDeleteUtility();
  const addSupplierCost = useAddSupplierCost();
  const deleteSupplierCost = useDeleteSupplierCost();

  // Calculate income per camp (occupied beds × daily rate × 30)
  const campIncome = useMemo(() => {
    const map: Record<string, { income: number; campName: string; rentCost: number }> = {};
    camps.forEach(c => {
      map[c.id] = { income: 0, campName: c.name, rentCost: c.is_rented ? Number(c.monthly_rent || 0) : 0 };
    });
    rooms.forEach((r: any) => {
      const rate = rates.find((rt: any) => rt.camp_id === r.camp_id && rt.room_category === r.category);
      const dailyRate = rate ? Number(rate.daily_rate) : 0;
      const occupancy = Number(r.current_occupancy || 0);
      const monthlyIncome = occupancy * dailyRate * 30;
      if (map[r.camp_id]) {
        map[r.camp_id].income += monthlyIncome;
      }
    });
    return map;
  }, [rooms, rates, camps]);

  // Aggregate costs per camp
  const campCosts = useMemo(() => {
    const map: Record<string, { utilities: number; supplier: number; rent: number }> = {};
    camps.forEach(c => {
      map[c.id] = { utilities: 0, supplier: 0, rent: c.is_rented ? Number(c.monthly_rent || 0) : 0 };
    });
    utilities.forEach((u: any) => {
      if (map[u.camp_id]) map[u.camp_id].utilities += Number(u.amount);
    });
    supplierCosts.forEach((s: any) => {
      if (map[s.camp_id]) map[s.camp_id].supplier += Number(s.amount);
    });
    return map;
  }, [utilities, supplierCosts, camps]);

  // Build P&L rows
  const plRows = useMemo(() => {
    const filteredCamps = campFilter !== "all" ? camps.filter(c => c.id === campFilter) : camps.filter(c => c.status === "active");
    return filteredCamps.map(c => {
      const income = campIncome[c.id]?.income || 0;
      const costs = campCosts[c.id] || { utilities: 0, supplier: 0, rent: 0 };
      const totalCost = costs.utilities + costs.supplier + costs.rent;
      const bottomline = income - totalCost;
      return {
        id: c.id,
        name: c.name,
        isRented: c.is_rented,
        income,
        utilityCost: costs.utilities,
        supplierCost: costs.supplier,
        rentCost: costs.rent,
        totalCost,
        bottomline,
      };
    });
  }, [camps, campFilter, campIncome, campCosts]);

  const totals = useMemo(() => ({
    income: plRows.reduce((s, r) => s + r.income, 0),
    utilityCost: plRows.reduce((s, r) => s + r.utilityCost, 0),
    supplierCost: plRows.reduce((s, r) => s + r.supplierCost, 0),
    rentCost: plRows.reduce((s, r) => s + r.rentCost, 0),
    totalCost: plRows.reduce((s, r) => s + r.totalCost, 0),
    bottomline: plRows.reduce((s, r) => s + r.bottomline, 0),
  }), [plRows]);

  const handleExport = () => {
    const headers = ["Camp", "Rented", "Monthly Income (SAR)", "Utility Cost", "Supplier Cost", "Rent Cost", "Total Cost", "Bottomline"];
    const rows = plRows.map(r => [r.name, r.isRented ? "Yes" : "No", r.income.toFixed(2), r.utilityCost.toFixed(2), r.supplierCost.toFixed(2), r.rentCost.toFixed(2), r.totalCost.toFixed(2), r.bottomline.toFixed(2)]);
    rows.push(["TOTAL", "", totals.income.toFixed(2), totals.utilityCost.toFixed(2), totals.supplierCost.toFixed(2), totals.rentCost.toFixed(2), totals.totalCost.toFixed(2), totals.bottomline.toFixed(2)]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bottomline-report-${selectedMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bottomline Report</h1>
        <p className="text-muted-foreground text-sm">Camp-wise Profit & Loss — Income vs Costs</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium"><TrendingUp size={14} /> Total Income</div>
            <p className="text-2xl font-bold text-green-600 mt-1">SAR {fmt(totals.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium"><TrendingDown size={14} /> Total Cost</div>
            <p className="text-2xl font-bold text-red-600 mt-1">SAR {fmt(totals.totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium"><DollarSign size={14} /> Bottomline</div>
            <p className={`text-2xl font-bold mt-1 ${totals.bottomline >= 0 ? "text-green-600" : "text-red-600"}`}>SAR {fmt(totals.bottomline)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium"><Building2 size={14} /> Camps</div>
            <p className="text-2xl font-bold mt-1">{plRows.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Month</Label>
          <Input type="month" className="w-[180px]" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Camp</Label>
          <Select value={campFilter} onValueChange={setCampFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Camps" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Camps</SelectItem>
              {camps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => setAddUtilityOpen(true)}><Zap size={14} className="mr-1" /> Add Utility Cost</Button>
          <Button variant="outline" size="sm" onClick={() => setAddCostOpen(true)}><Plus size={14} className="mr-1" /> Add Supplier Cost</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
        </div>
      </div>

      {/* P&L Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Camp-wise P&L — {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Camp</TableHead>
                  <TableHead className="text-right">Monthly Income</TableHead>
                  <TableHead className="text-right">Utility Cost</TableHead>
                  <TableHead className="text-right">Supplier Cost</TableHead>
                  <TableHead className="text-right">Rent Cost</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Bottomline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plRows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.name}
                      {r.isRented && <Badge variant="outline" className="ml-2 text-[10px]">Rented</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{fmt(r.income)}</TableCell>
                    <TableCell className="text-right text-red-500">{fmt(r.utilityCost)}</TableCell>
                    <TableCell className="text-right text-red-500">{fmt(r.supplierCost)}</TableCell>
                    <TableCell className="text-right text-red-500">{fmt(r.rentCost)}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">{fmt(r.totalCost)}</TableCell>
                    <TableCell className={`text-right font-bold ${r.bottomline >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(r.bottomline)}
                    </TableCell>
                  </TableRow>
                ))}
                {plRows.length > 1 && (
                  <TableRow className="bg-muted/30 font-bold border-t-2">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(totals.income)}</TableCell>
                    <TableCell className="text-right text-red-500">{fmt(totals.utilityCost)}</TableCell>
                    <TableCell className="text-right text-red-500">{fmt(totals.supplierCost)}</TableCell>
                    <TableCell className="text-right text-red-500">{fmt(totals.rentCost)}</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(totals.totalCost)}</TableCell>
                    <TableCell className={`text-right ${totals.bottomline >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(totals.bottomline)}
                    </TableCell>
                  </TableRow>
                )}
                {plRows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No camps found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Details */}
      <Tabs defaultValue="utilities">
        <TabsList>
          <TabsTrigger value="utilities" className="gap-1"><Zap size={14} /> Utility Costs</TabsTrigger>
          <TabsTrigger value="supplier" className="gap-1"><Building2 size={14} /> Supplier Costs</TabsTrigger>
        </TabsList>
        <TabsContent value="utilities">
          <Card>
            <CardContent className="pt-4">
              {utilities.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">No utility costs recorded for this month.</p>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Camp</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount (SAR)</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {utilities.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell>{camps.find(c => c.id === u.camp_id)?.name || "—"}</TableCell>
                          <TableCell className="capitalize">{u.utility_type}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(Number(u.amount))}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{u.notes || "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteUtility.mutate(u.id)}>
                              <Trash2 size={14} className="text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="supplier">
          <Card>
            <CardContent className="pt-4">
              {supplierCosts.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">No supplier costs recorded for this month.</p>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Camp</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount (SAR)</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierCosts.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell>{camps.find(c => c.id === s.camp_id)?.name || "—"}</TableCell>
                          <TableCell>{s.supplier_name || "—"}</TableCell>
                          <TableCell className="capitalize">{s.cost_type}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(Number(s.amount))}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{s.notes || "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSupplierCost.mutate(s.id)}>
                              <Trash2 size={14} className="text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Utility Dialog */}
      <AddUtilityDialog open={addUtilityOpen} onOpenChange={setAddUtilityOpen} camps={camps} month={selectedMonth} onAdd={(row) => addUtility.mutate(row)} />
      <AddSupplierCostDialog open={addCostOpen} onOpenChange={setAddCostOpen} camps={camps} month={selectedMonth} onAdd={(row) => addSupplierCost.mutate(row)} />
    </div>
  );
}

function AddUtilityDialog({ open, onOpenChange, camps, month, onAdd }: any) {
  const [campId, setCampId] = useState("");
  const [type, setType] = useState("electricity");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!campId || !amount) return;
    onAdd({ camp_id: campId, month: month + "-01", utility_type: type, amount: parseFloat(amount), notes: notes || null });
    setCampId(""); setAmount(""); setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Utility Cost</DialogTitle>
          <DialogDescription>Record monthly utility expense for a camp.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Camp *</Label>
            <Select value={campId} onValueChange={setCampId}>
              <SelectTrigger><SelectValue placeholder="Select camp" /></SelectTrigger>
              <SelectContent>{camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Utility Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{UTILITY_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount (SAR) *</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!campId || !amount}>Add Cost</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSupplierCostDialog({ open, onOpenChange, camps, month, onAdd }: any) {
  const [campId, setCampId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [costType, setCostType] = useState("manpower");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!campId || !amount) return;
    onAdd({ camp_id: campId, month: month + "-01", supplier_name: supplierName || null, cost_type: costType, amount: parseFloat(amount), notes: notes || null });
    setCampId(""); setSupplierName(""); setAmount(""); setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Supplier / Operational Cost</DialogTitle>
          <DialogDescription>Record monthly supplier or operational cost for a camp.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Camp *</Label>
            <Select value={campId} onValueChange={setCampId}>
              <SelectTrigger><SelectValue placeholder="Select camp" /></SelectTrigger>
              <SelectContent>{camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Supplier Name</Label>
            <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="e.g. Al Rajhi Catering" />
          </div>
          <div className="space-y-1.5">
            <Label>Cost Type</Label>
            <Select value={costType} onValueChange={setCostType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COST_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount (SAR) *</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!campId || !amount}>Add Cost</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
