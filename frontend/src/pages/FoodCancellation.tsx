import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UtensilsCrossed, ChefHat, Settings as SettingsIcon, AlertTriangle, CheckCircle2, XCircle, Clock, Users, Ban, Plus } from "lucide-react";
import { useCheckedInEmployees } from "@/hooks/useCheckInOut";
import { foodCancellationDateAllowed } from "@/lib/foodCancellationDates";
import { filterCancellationResidents } from "@/lib/foodCancellationResidents";
import { useCamps } from "@/hooks/useCampManagement";
import {
  useCancellationRequests, useSubmitCancellation, useApproveCancellation, useRejectCancellation,
  useKitchenMealCount, useCampCancellationSettings, useUpsertCancellationSettings,
  REASON_LABELS, type MealType, type CancelReason,
} from "@/hooks/useFoodCancellation";

const ALL_MEALS: MealType[] = ["breakfast", "lunch", "dinner", "iftar", "suhoor"];

export default function FoodCancellation() {
  const { data: camps = [] } = useCamps();
  const [campId, setCampId] = useState<string>("");
  const activeCamp = campId || camps[0]?.id || "";
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ban className="h-6 w-6 text-primary" /> Food Cancellation Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Smart meal cancellations with multi-level approvals and real-time kitchen counts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Request
          </Button>
          <Select value={activeCamp} onValueChange={setCampId}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select camp" /></SelectTrigger>
            <SelectContent>
              {camps.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!activeCamp ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Select a camp to continue.</CardContent></Card>
      ) : (
        <Tabs defaultValue="kitchen">
          <TabsList>
            <TabsTrigger value="kitchen"><ChefHat className="h-4 w-4 mr-1" />Kitchen Dashboard</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1" />Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="kitchen" className="mt-4"><KitchenDashboard campId={activeCamp} /></TabsContent>
          <TabsContent value="approvals" className="mt-4"><ApprovalsQueue campId={activeCamp} /></TabsContent>
          <TabsContent value="all" className="mt-4"><AllRequests campId={activeCamp} /></TabsContent>
          <TabsContent value="settings" className="mt-4"><CampSettings campId={activeCamp} /></TabsContent>
        </Tabs>
      )}

      {activeCamp && <NewRequestForm key={activeCamp} campId={activeCamp} open={newOpen} onOpenChange={setNewOpen} />}
    </div>
  );
}

/* -------------------- KITCHEN DASHBOARD -------------------- */
function KitchenDashboard({ campId }: { campId: string }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const { data, isLoading } = useKitchenMealCount(campId, date);
  const counts = Array.isArray(data) ? data : [];

  // 7-day forecast
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  }), []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ChefHat className="h-5 w-5 text-primary" /> Live Meal Count</CardTitle>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[180px]" />
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {counts.map((c) => (
                <Card key={c.meal_type} className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase text-muted-foreground font-semibold">{c.meal_type}</div>
                    <div className="text-3xl font-bold mt-1">{c.net_count}</div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                        <Users className="h-3 w-3 mr-1" />{c.total_active}
                      </Badge>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        <Ban className="h-3 w-3 mr-1" />{c.cancelled}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>7-Day Forecast</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <ForecastGrid campId={campId} dates={dates} />
        </CardContent>
      </Card>
    </div>
  );
}

function ForecastGrid({ campId, dates }: { campId: string; dates: string[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          {ALL_MEALS.map((m) => <TableHead key={m} className="capitalize text-center">{m}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {dates.map((d) => <ForecastRow key={d} campId={campId} date={d} />)}
      </TableBody>
    </Table>
  );
}

function ForecastRow({ campId, date }: { campId: string; date: string }) {
  const { data } = useKitchenMealCount(campId, date);
  const counts = Array.isArray(data) ? data : [];
  const map = new Map(counts.map((c) => [c.meal_type, c]));
  return (
    <TableRow>
      <TableCell className="font-medium">{date}</TableCell>
      {ALL_MEALS.map((m) => {
        const c = map.get(m);
        return (
          <TableCell key={m} className="text-center">
            <span className="font-bold">{c?.net_count ?? 0}</span>
            {(c?.cancelled ?? 0) > 0 && (
              <span className="text-xs text-orange-600 ml-1">(-{c?.cancelled})</span>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

/* -------------------- NEW REQUEST -------------------- */
function NewRequestForm({ campId, open, onOpenChange }: { campId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: camps = [] } = useCamps();
  const [requestCampId, setRequestCampId] = useState(campId);
  const [department, setDepartment] = useState("all");
  const { data: employees = [], isLoading, isError } = useCheckedInEmployees(requestCampId);
  const submit = useSubmitCancellation();
  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState(new Date().toISOString().split("T")[0]);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [meals, setMeals] = useState<MealType[]>(["breakfast", "lunch", "dinner"]);
  const [reason, setReason] = useState<CancelReason>("leave");
  const [remarks, setRemarks] = useState("");
  const departments = useMemo(() => Array.from(new Set(employees.flatMap(e => e.department ? [e.department] : []))).sort(), [employees]);
  const filtered = useMemo(() => filterCancellationResidents(employees, department), [employees, department]);

  const selectedEmployee = filtered.find((e) => e.id === employeeId);
  const stayFrom = selectedEmployee?.stay_from ?? "";
  const stayTo = selectedEmployee?.stay_to ?? undefined;
  const datesValid = foodCancellationDateAllowed(from, stayFrom, stayTo)
    && foodCancellationDateAllowed(to, stayFrom, stayTo) && from <= to;

  const selectEmployee = (id: string) => {
    const employee = employees.find((e) => e.id === id);
    if (!employee?.stay_from) return;
    const clamp = (date: string) => date < employee.stay_from ? employee.stay_from
      : employee.stay_to && date > employee.stay_to ? employee.stay_to : date;
    const nextFrom = clamp(from);
    setFrom(nextFrom);
    setTo(clamp(to) < nextFrom ? nextFrom : clamp(to));
    setEmployeeId(id);
    submit.reset();
  };

  const toggleMeal = (m: MealType) =>
    setMeals((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);

  const handleSubmit = async () => {
    if (!selectedEmployee || !datesValid || isLoading || isError) return;
    try {
      await submit.mutateAsync({
        employee_id: employeeId,
        from_date: from, to_date: to, meals, reason, remarks: remarks || undefined,
      });
    } catch {
      return; // The mutation displays the server's validation error; keep the form open.
    }
    setRemarks(""); setEmployeeId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Submit Cancellation Request</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="min-w-0">
            <Label htmlFor="cancel-camp">Camp</Label>
            <Select value={requestCampId} onValueChange={(id) => { setRequestCampId(id); setDepartment("all"); setEmployeeId(""); submit.reset(); }}>
              <SelectTrigger id="cancel-camp"><SelectValue placeholder="Select camp" /></SelectTrigger>
              <SelectContent>{camps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Label htmlFor="cancel-department">Department</Label>
            <Select value={department} disabled={isLoading || isError} onValueChange={(value) => { setDepartment(value); setEmployeeId(""); submit.reset(); }}>
              <SelectTrigger id="cancel-department"><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="cancel-employee">Employee</Label>
          <Select value={employeeId} onValueChange={selectEmployee} disabled={isLoading || isError || filtered.length === 0}>
            <SelectTrigger id="cancel-employee"><SelectValue placeholder={isLoading ? "Loading current residents…" : "Select employee"} /></SelectTrigger>
            <SelectContent className="max-h-64">
              {filtered.map(e => <SelectItem key={e.id} value={e.id}>{e.employee_id} — {e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {isError && <p role="alert" className="mt-2 text-sm text-destructive">Unable to load current residents. Please try again.</p>}
          {!isLoading && !isError && filtered.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No current residents in the selected camp and department.</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label htmlFor="cancel-from">From Date</Label><Input id="cancel-from" type="date" disabled={!stayFrom} min={stayFrom} max={stayTo} value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); submit.reset(); }} /></div>
          <div><Label htmlFor="cancel-to">To Date</Label><Input id="cancel-to" type="date" disabled={!stayFrom} min={from > stayFrom ? from : stayFrom} max={stayTo} value={to} onChange={(e) => { setTo(e.target.value); submit.reset(); }} /></div>
        </div>

        <div>
          <Label className="mb-2 block">Meals to Cancel</Label>
          <div className="flex flex-wrap gap-3">
            {ALL_MEALS.map((m) => (
              <label key={m} className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-accent capitalize">
                <Checkbox checked={meals.includes(m)} onCheckedChange={() => toggleMeal(m)} />
                {m}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Reason *</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(REASON_LABELS).map(([k, label]) => {
              const active = reason === k;
              return (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => setReason(k as CancelReason)}
                  className={active ? "" : "hover:bg-accent"}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Remarks (optional)</Label>
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
        </div>

        {submit.error && <p role="alert" className="text-sm text-destructive">{submit.error.message}</p>}
        {selectedEmployee && !datesValid && <p role="alert" className="text-sm text-destructive">Choose dates within the employee’s stay, with the end date on or after the start date.</p>}
        <Button onClick={handleSubmit} disabled={!selectedEmployee || !datesValid || isLoading || isError || meals.length === 0 || submit.isPending} className="w-full">
          {submit.isPending ? "Submitting…" : "Submit Request"}
        </Button>
      </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- APPROVALS QUEUE -------------------- */
function ApprovalsQueue({ campId }: { campId: string }) {
  const { data: requests = [] } = useCancellationRequests({ campId, status: "pending" });
  const approve = useApproveCancellation();
  const reject = useRejectCancellation();
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" /> Pending Approvals ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No pending requests.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Meals</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.employee?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.employee?.employee_id}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.from_date} → {r.to_date}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.meals.map((m: string) => (
                        <Badge key={m} variant="outline" className="capitalize text-xs">{m}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {REASON_LABELS[r.reason as CancelReason] ?? r.reason}
                    {r.is_late && <Badge variant="destructive" className="ml-2 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Late</Badge>}
                  </TableCell>
                  <TableCell><Badge>{r.current_level}/{r.approval_levels_required}</Badge></TableCell>
                  <TableCell className="space-x-1">
                    <Button size="sm" onClick={() => approve.mutate(r.id)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejectFor(r.id)}>
                      <XCircle className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection…" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                if (rejectFor && rejectReason) {
                  reject.mutate({ id: rejectFor, reason: rejectReason });
                  setRejectFor(null); setRejectReason("");
                }
              }}>Confirm Reject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* -------------------- ALL REQUESTS -------------------- */
function AllRequests({ campId }: { campId: string }) {
  const { data: camps = [] } = useCamps();
  const [scope, setScope] = useState("all");
  const { data: requests = [], isLoading, isError } = useCancellationRequests(scope === "all" ? undefined : { campId });
  const campNames = new Map(camps.map(c => [c.id, c.name]));
  return (
    <Card>
      <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-3">
        <CardTitle>All Requests ({requests.length})</CardTitle>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-[240px]" aria-label="Request camp filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Camps</SelectItem>
            <SelectItem value="selected">{campNames.get(campId) ?? "Selected Camp"}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="py-4 text-muted-foreground">Loading requests…</p>}
        {isError && <p role="alert" className="py-4 text-destructive">Unable to load cancellation requests. Please try again.</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Camp</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Meals</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.employee?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.employee?.employee_id}</div>
                </TableCell>
                <TableCell>{campNames.get(r.camp_id) ?? "Not linked"}</TableCell>
                <TableCell className="text-sm">{r.from_date} → {r.to_date}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {r.meals.map((m: string) => <Badge key={m} variant="outline" className="capitalize text-xs">{m}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{REASON_LABELS[r.reason as CancelReason] ?? r.reason}</TableCell>
                <TableCell><Badge variant="secondary" className="text-xs">{r.source}</Badge></TableCell>
                <TableCell>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>
                    {r.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !isError && requests.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No requests found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* -------------------- SETTINGS -------------------- */
function CampSettings({ campId }: { campId: string }) {
  const { data: settings } = useCampCancellationSettings(campId);
  const upsert = useUpsertCancellationSettings();

  const [levels, setLevels] = useState(settings?.approval_levels ?? 2);
  const [cutoff, setCutoff] = useState(settings?.cutoff_time ?? "18:00");
  const [strict, setStrict] = useState(settings?.cutoff_strict ?? false);
  const [ramadan, setRamadan] = useState(settings?.ramadan_mode ?? false);
  const [rStart, setRStart] = useState(settings?.ramadan_start ?? "");
  const [rEnd, setREnd] = useState(settings?.ramadan_end ?? "");
  const [nightShift, setNightShift] = useState(settings?.night_shift_auto_breakfast ?? true);

  // sync when settings load
  useMemo(() => {
    if (settings) {
      setLevels(settings.approval_levels);
      setCutoff(settings.cutoff_time);
      setStrict(settings.cutoff_strict);
      setRamadan(settings.ramadan_mode);
      setRStart(settings.ramadan_start ?? "");
      setREnd(settings.ramadan_end ?? "");
      setNightShift(settings.night_shift_auto_breakfast);
    }
  }, [settings]);

  const save = () => {
    upsert.mutate({
      camp_id: campId,
      approval_levels: levels,
      cutoff_time: cutoff,
      cutoff_strict: strict,
      ramadan_mode: ramadan,
      ramadan_start: rStart || null,
      ramadan_end: rEnd || null,
      night_shift_auto_breakfast: nightShift,
    });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Camp Cancellation Policy</CardTitle></CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        <div>
          <Label>Approval Levels</Label>
          <Select value={String(levels)} onValueChange={(v) => setLevels(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 – Supervisor only</SelectItem>
              <SelectItem value="2">2 – Supervisor → Camp Boss</SelectItem>
              <SelectItem value="3">3 – Supervisor → Camp Boss → Catering</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Cut-off Time (previous day)</Label>
            <Input type="time" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <Switch checked={strict} onCheckedChange={setStrict} />
              <span className="text-sm">Strict (block late requests)</span>
            </label>
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="flex items-center gap-2 mb-3">
            <Switch checked={ramadan} onCheckedChange={setRamadan} />
            <span className="font-medium">Ramadan Mode (auto-disable breakfast & lunch)</span>
          </label>
          {ramadan && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ramadan Start</Label><Input type="date" value={rStart} onChange={(e) => setRStart(e.target.value)} /></div>
              <div><Label>Ramadan End</Label><Input type="date" value={rEnd} onChange={(e) => setREnd(e.target.value)} /></div>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <label className="flex items-center gap-2">
            <Switch checked={nightShift} onCheckedChange={setNightShift} />
            <span>Night-shift employees: auto-disable breakfast</span>
          </label>
        </div>

        <Button onClick={save} disabled={upsert.isPending} className="w-full">
          {upsert.isPending ? "Saving…" : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
