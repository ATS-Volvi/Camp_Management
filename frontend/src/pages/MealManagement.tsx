import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, QrCode, UtensilsCrossed, Power, CheckCircle2, AlertTriangle, Users, ScanLine } from "lucide-react";
import { useMealCycles, useActiveCycle, useToggleCycle, useCycleAnalytics, useMealScans } from "@/hooks/useMealManagement";
import WeeklyOrderGrid from "@/components/meal/WeeklyOrderGrid";
import ForecastTable from "@/components/meal/ForecastTable";
import MealScanner from "@/components/meal/MealScanner";
import CreateCycleDialog from "@/components/meal/CreateCycleDialog";
import EmployeeQRDialog from "@/components/meal/EmployeeQRDialog";
import MealReportsTab from "@/components/meal/MealReportsTab";

export default function MealManagement() {
  const { data: cycles = [] } = useMealCycles();
  const { data: activeCycle } = useActiveCycle();
  const toggle = useToggleCycle();
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const cycle = cycles.find((c) => c.id === selectedCycleId) ?? activeCycle ?? cycles[0];
  const { data: analytics } = useCycleAnalytics(cycle?.id);
  const today = new Date().toISOString().split("T")[0];
  const { data: todayScans = [] } = useMealScans(today);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" /> Smart Meal Management
          </h1>
          <p className="text-sm text-muted-foreground">Pre-orders, QR collection, and live forecasts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setQrOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" /> Employee QR
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Cycle
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ordered</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{analytics?.ordered ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Collected</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold">{analytics?.collected ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">No-Shows</span>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold">{analytics?.noShows ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Unauthorized</span>
              <ScanLine className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-2xl font-bold">{analytics?.unauthorized ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">Cycle:</span>
          <Select value={cycle?.id ?? ""} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name ?? "Cycle"} · {c.start_date} → {c.end_date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cycle && (
            <>
              <Badge variant={cycle.is_active ? "default" : "secondary"}>
                {cycle.is_active ? "Active" : "Inactive"}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggle.mutate({ id: cycle.id, is_active: !cycle.is_active })}
              >
                <Power className="mr-2 h-3 w-3" />
                {cycle.is_active ? "Deactivate" : "Activate"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {!cycle ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No meal cycles yet. Click <strong>New Cycle</strong> to create one.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="order">
          <TabsList>
            <TabsTrigger value="order">Place Order</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="scan">QR Scanner</TabsTrigger>
            <TabsTrigger value="reports">Live Scans</TabsTrigger>
            <TabsTrigger value="kpi-reports">Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="order" className="mt-4">
            <WeeklyOrderGrid cycle={cycle} />
          </TabsContent>
          <TabsContent value="forecast" className="mt-4">
            <ForecastTable cycle={cycle} />
          </TabsContent>
          <TabsContent value="scan" className="mt-4">
            <MealScanner />
          </TabsContent>
          <TabsContent value="reports" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Today's Scans ({today})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-2 text-muted-foreground font-medium">Time</th>
                        <th className="text-left p-2 text-muted-foreground font-medium">Employee</th>
                        <th className="text-left p-2 text-muted-foreground font-medium">Meal</th>
                        <th className="text-left p-2 text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayScans.length === 0 && (
                        <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No scans today.</td></tr>
                      )}
                      {todayScans.map((s: any) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="p-2 font-mono text-xs">{new Date(s.scanned_at).toLocaleTimeString()}</td>
                          <td className="p-2">
                            <div className="font-medium">{s.employees?.name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{s.employees?.employee_id ?? ""}</div>
                          </td>
                          <td className="p-2 capitalize">{s.meal_type}</td>
                          <td className="p-2">
                            <Badge
                              variant="outline"
                              className={s.is_ordered
                                ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                                : "border-orange-500 text-orange-700 dark:text-orange-400"}
                            >
                              {s.is_ordered ? "Ordered" : "Unauthorized"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="kpi-reports" className="mt-4">
            <MealReportsTab />
          </TabsContent>
        </Tabs>
      )}

      <CreateCycleDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EmployeeQRDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}
