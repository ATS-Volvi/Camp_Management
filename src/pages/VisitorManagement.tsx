import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VoiceDictationButton from "@/components/maintenance/VoiceDictationButton";
import { useVisitors, useCheckInVisitor, useCheckOutVisitor } from "@/hooks/useVisitors";
import { Users, UserCheck, UserX, Clock, Plus, LogOut, Search, Download } from "lucide-react";
import { format } from "date-fns";

function useCamps() {
  return useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });
}

function useEmployeesList() {
  return useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id, name, employee_id").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export default function VisitorManagement() {
  const [selectedCamp, setSelectedCamp] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  const [checkOutRemarks, setCheckOutRemarks] = useState("");

  // Form state
  const [form, setForm] = useState({
    visitor_name: "", company: "", phone: "", id_number: "", id_type: "national_id",
    purpose: "", host_employee_id: "", camp_id: "", badge_number: "",
    vehicle_number: "", expected_check_out: "", remarks: "", items_carried: "",
  });

  const { data: camps } = useCamps();
  const { data: employees } = useEmployeesList();
  const { data: visitors, isLoading } = useVisitors(
    selectedCamp === "all" ? null : selectedCamp,
    statusFilter === "all" ? null : statusFilter
  );
  const checkInMutation = useCheckInVisitor();
  const checkOutMutation = useCheckOutVisitor();

  const filtered = useMemo(() => {
    if (!visitors) return [];
    if (!searchTerm) return visitors;
    const s = searchTerm.toLowerCase();
    return visitors.filter((v: any) =>
      v.visitor_name?.toLowerCase().includes(s) ||
      v.company?.toLowerCase().includes(s) ||
      v.phone?.includes(s) ||
      v.id_number?.toLowerCase().includes(s) ||
      v.badge_number?.toLowerCase().includes(s)
    );
  }, [visitors, searchTerm]);

  const stats = useMemo(() => {
    const all = visitors || [];
    return {
      total: all.length,
      checkedIn: all.filter((v: any) => v.status === "checked_in").length,
      checkedOut: all.filter((v: any) => v.status === "checked_out").length,
    };
  }, [visitors]);

  const resetForm = () => setForm({
    visitor_name: "", company: "", phone: "", id_number: "", id_type: "national_id",
    purpose: "", host_employee_id: "", camp_id: "", badge_number: "",
    vehicle_number: "", expected_check_out: "", remarks: "", items_carried: "",
  });

  const handleCheckIn = async () => {
    if (!form.visitor_name || !form.purpose || !form.camp_id) return;
    await checkInMutation.mutateAsync({
      visitor_name: form.visitor_name,
      company: form.company || undefined,
      phone: form.phone || undefined,
      id_number: form.id_number || undefined,
      id_type: form.id_type || undefined,
      purpose: form.purpose,
      host_employee_id: form.host_employee_id || null,
      camp_id: form.camp_id,
      badge_number: form.badge_number || undefined,
      vehicle_number: form.vehicle_number || undefined,
      expected_check_out: form.expected_check_out || null,
      remarks: form.remarks || undefined,
      items_carried: form.items_carried || undefined,
    });
    setCheckInOpen(false);
    resetForm();
  };

  const handleCheckOut = async () => {
    if (!selectedVisitor) return;
    await checkOutMutation.mutateAsync({ id: selectedVisitor.id, remarks: checkOutRemarks || undefined });
    setCheckOutOpen(false);
    setSelectedVisitor(null);
    setCheckOutRemarks("");
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ["Visitor Name", "Company", "Phone", "ID Number", "Purpose", "Camp", "Badge", "Vehicle", "Status", "Check-In", "Check-Out"];
    const rows = filtered.map((v: any) => [
      v.visitor_name, v.company || "", v.phone || "", v.id_number || "", v.purpose,
      v.camps?.name || "", v.badge_number || "", v.vehicle_number || "", v.status,
      v.check_in_time ? format(new Date(v.check_in_time), "yyyy-MM-dd HH:mm") : "",
      v.check_out_time ? format(new Date(v.check_out_time), "yyyy-MM-dd HH:mm") : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "visitors_report.csv"; a.click();
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visitor Management</h1>
          <p className="text-muted-foreground text-sm">Manage visitor check-ins, check-outs and track visitor activity</p>
        </div>
        <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-2" /> New Visitor Check-In</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visitor Check-In</DialogTitle>
              <DialogDescription>Register a new visitor entering the camp</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Visitor Name *</Label>
                <Input value={form.visitor_name} onChange={e => setForm(f => ({ ...f, visitor_name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company name" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
              </div>
              <div className="space-y-2">
                <Label>ID Type</Label>
                <Select value={form.id_type} onValueChange={v => setForm(f => ({ ...f, id_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="iqama">Iqama</SelectItem>
                    <SelectItem value="driving_license">Driving License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ID Number</Label>
                <Input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} placeholder="ID number" />
              </div>
              <div className="space-y-2">
                <Label>Purpose of Visit *</Label>
                <Select value={form.purpose} onValueChange={v => setForm(f => ({ ...f, purpose: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="official_visit">Official Visit</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Camp *</Label>
                <Select value={form.camp_id} onValueChange={v => setForm(f => ({ ...f, camp_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select camp" /></SelectTrigger>
                  <SelectContent>
                    {(camps || []).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Host Employee</Label>
                <Select value={form.host_employee_id} onValueChange={v => setForm(f => ({ ...f, host_employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select host" /></SelectTrigger>
                  <SelectContent>
                    {(employees || []).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Badge Number</Label>
                <Input value={form.badge_number} onChange={e => setForm(f => ({ ...f, badge_number: e.target.value }))} placeholder="Visitor badge #" />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} placeholder="Vehicle plate" />
              </div>
              <div className="space-y-2">
                <Label>Expected Check-Out</Label>
                <Input type="datetime-local" value={form.expected_check_out} onChange={e => setForm(f => ({ ...f, expected_check_out: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Items Carried</Label>
                <Input value={form.items_carried} onChange={e => setForm(f => ({ ...f, items_carried: e.target.value }))} placeholder="Laptop, bag, etc." />
              </div>
              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Remarks</Label>
                  <VoiceDictationButton onTranscript={(text) => setForm(f => ({ ...f, remarks: text }))} />
                </div>
                <Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Additional notes or use Voice..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCheckInOpen(false)}>Cancel</Button>
              <Button onClick={handleCheckIn} disabled={!form.visitor_name || !form.purpose || !form.camp_id || checkInMutation.isPending}>
                {checkInMutation.isPending ? "Checking in..." : "Check In Visitor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users size={20} className="text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><UserCheck size={20} className="text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.checkedIn}</p>
                <p className="text-xs text-muted-foreground">Currently In Camp</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10"><UserX size={20} className="text-orange-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.checkedOut}</p>
                <p className="text-xs text-muted-foreground">Checked Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Clock size={20} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">
                  {(visitors || []).filter((v: any) => v.status === "checked_in" && v.expected_check_out && new Date(v.expected_check_out) < new Date()).length}
                </p>
                <p className="text-xs text-muted-foreground">Overstaying</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search visitors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={selectedCamp} onValueChange={setSelectedCamp}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Camps" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Camps</SelectItem>
                {(camps || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}><Download size={16} className="mr-2" />Export CSV</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Visitors ({stats.total})</TabsTrigger>
          <TabsTrigger value="active">Currently In ({stats.checkedIn})</TabsTrigger>
          <TabsTrigger value="history">Check-Out History ({stats.checkedOut})</TabsTrigger>
        </TabsList>

        {["all", "active", "history"].map(tab => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visitor</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Camp</TableHead>
                      <TableHead>Badge</TableHead>
                      <TableHead>Check-In</TableHead>
                      <TableHead>Check-Out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : (
                      filtered
                        .filter((v: any) => {
                          if (tab === "active") return v.status === "checked_in";
                          if (tab === "history") return v.status === "checked_out";
                          return true;
                        })
                        .map((v: any) => (
                          <TableRow key={v.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{v.visitor_name}</p>
                                <p className="text-xs text-muted-foreground">{v.phone || v.id_number || "—"}</p>
                              </div>
                            </TableCell>
                            <TableCell>{v.company || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{v.purpose?.replace("_", " ")}</Badge>
                            </TableCell>
                            <TableCell>{v.camps?.name || "—"}</TableCell>
                            <TableCell>{v.badge_number || "—"}</TableCell>
                            <TableCell className="text-sm">
                              {v.check_in_time ? format(new Date(v.check_in_time), "dd MMM yyyy HH:mm") : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {v.check_out_time ? format(new Date(v.check_out_time), "dd MMM yyyy HH:mm") : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={v.status === "checked_in" ? "default" : "secondary"} className="capitalize">
                                {v.status === "checked_in" ? "In Camp" : "Left"}
                              </Badge>
                              {v.status === "checked_in" && v.expected_check_out && new Date(v.expected_check_out) < new Date() && (
                                <Badge variant="destructive" className="ml-1 text-[10px]">Overstay</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {v.status === "checked_in" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setSelectedVisitor(v); setCheckOutOpen(true); }}
                                >
                                  <LogOut size={14} className="mr-1" /> Check Out
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                    {!isLoading && filtered.filter((v: any) => {
                      if (tab === "active") return v.status === "checked_in";
                      if (tab === "history") return v.status === "checked_out";
                      return true;
                    }).length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No visitors found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Check-Out Dialog */}
      <Dialog open={checkOutOpen} onOpenChange={setCheckOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Out Visitor</DialogTitle>
            <DialogDescription>
              Confirm check-out for <span className="font-semibold">{selectedVisitor?.visitor_name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Company:</span> {selectedVisitor?.company || "—"}</div>
              <div><span className="text-muted-foreground">Purpose:</span> {selectedVisitor?.purpose}</div>
              <div><span className="text-muted-foreground">Badge:</span> {selectedVisitor?.badge_number || "—"}</div>
              <div><span className="text-muted-foreground">Vehicle:</span> {selectedVisitor?.vehicle_number || "—"}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Check-Out Remarks</Label>
                <VoiceDictationButton onTranscript={(text) => setCheckOutRemarks(text)} />
              </div>
              <Textarea value={checkOutRemarks} onChange={e => setCheckOutRemarks(e.target.value)} placeholder="Any remarks or use Voice..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckOutOpen(false)}>Cancel</Button>
            <Button onClick={handleCheckOut} disabled={checkOutMutation.isPending}>
              {checkOutMutation.isPending ? "Processing..." : "Confirm Check-Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
