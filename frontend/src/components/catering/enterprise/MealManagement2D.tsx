import { useState } from "react";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Truck,
  CheckCircle2,
  CalendarCheck,
  UserCheck,
  Package,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SAMPLE_CLIENT_MEAL_CONSUMPTION,
  SAMPLE_PACKED_MEAL_MANIFESTS,
  SERVING_LINES,
  SIMULATED_RECENT_SCANS,
  EmployeeMealScanRecord,
} from "@/data/enterpriseCateringSuiteData";

export function MealManagement2D() {
  const [activeTab, setActiveTab] = useState<"client_records" | "turnstiles_shield" | "packed_manifests">("client_records");
  const [scans, setScans] = useState<EmployeeMealScanRecord[]>(SIMULATED_RECENT_SCANS);
  const [overrideNotice, setOverrideNotice] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleSupervisorOverride = (employeeId: string) => {
    setScans((prev) =>
      prev.map((scan) =>
        scan.employeeId === employeeId
          ? {
              ...scan,
              scanResult: "override_allowed",
              overrideReason: "Supervisor Emergency Field Cancellation Stamp",
            }
          : scan
      )
    );
    setOverrideNotice(`Supervisor Override granted for Employee #${employeeId}: Shift re-admitted.`);
    setTimeout(() => setOverrideNotice(null), 4000);
  };

  const handleExportAttendance = () => {
    setExportNotice("Client Attendance & Consumption Records exported to SAP HCM & Billing Portal (CSV & PDF).");
    setTimeout(() => setExportNotice(null), 4000);
  };

  const totalEntitled = SAMPLE_CLIENT_MEAL_CONSUMPTION.reduce((acc, c) => acc + c.entitledHeadcount, 0);
  const totalDineIn = SAMPLE_CLIENT_MEAL_CONSUMPTION.reduce((acc, c) => acc + c.actualDineInHeadcount, 0);
  const totalPacked = SAMPLE_CLIENT_MEAL_CONSUMPTION.reduce((acc, c) => acc + c.packedMealsDispatched, 0);
  const totalCancelled = SAMPLE_CLIENT_MEAL_CONSUMPTION.reduce((acc, c) => acc + c.advanceCancellations, 0);
  const totalNetBilled = SAMPLE_CLIENT_MEAL_CONSUMPTION.reduce((acc, c) => acc + c.netBilledPax, 0);

  return (
    <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0c2340] text-[#fe932c]">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-foreground">
                Pillar 4: Meal Management & Entitlements Control
              </h2>
              <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-bold">
                Zero-Duplicate Shield
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Actual headcount, client entitlements, remote packed meals, advance cancellations, and turnstile verification.
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60">
          <Button
            size="sm"
            variant={activeTab === "client_records" ? "default" : "ghost"}
            onClick={() => setActiveTab("client_records")}
            className={`h-8 text-xs font-bold ${
              activeTab === "client_records" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
            }`}
          >
            <CalendarCheck className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
            Client Consumption Records
          </Button>

          <Button
            size="sm"
            variant={activeTab === "turnstiles_shield" ? "default" : "ghost"}
            onClick={() => setActiveTab("turnstiles_shield")}
            className={`h-8 text-xs font-bold ${
              activeTab === "turnstiles_shield" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
            Dining Turnstiles & Duplicate Shield
          </Button>

          <Button
            size="sm"
            variant={activeTab === "packed_manifests" ? "default" : "ghost"}
            onClick={() => setActiveTab("packed_manifests")}
            className={`h-8 text-xs font-bold ${
              activeTab === "packed_manifests" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
            }`}
          >
            <Truck className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
            Remote Packed Meals
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {overrideNotice && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
          <span>{overrideNotice}</span>
        </div>
      )}

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* SUB-TAB 1: CLIENT-WISE CONSUMPTION RECORDS */}
      {activeTab === "client_records" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Total Entitled</span>
              <strong className="text-lg font-black text-foreground font-mono">{totalEntitled}</strong>
              <span className="text-[10px] text-muted-foreground block">contract headcount</span>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Actual Dine-In</span>
              <strong className="text-lg font-black text-foreground font-mono">{totalDineIn}</strong>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">turnstile scanned</span>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Packed Meals</span>
              <strong className="text-lg font-black text-[#fe932c] font-mono">{totalPacked}</strong>
              <span className="text-[10px] text-muted-foreground block">field & rig dispatches</span>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Cancellations</span>
              <strong className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">-{totalCancelled}</strong>
              <span className="text-[10px] text-muted-foreground block">advance credits applied</span>
            </div>

            <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block uppercase">Net Billed Pax</span>
              <strong className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{totalNetBilled}</strong>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">97.2% overall attendance</span>
            </div>
          </div>

          {/* Table: Client Breakdown */}
          <div className="rounded-xl border border-border/60 overflow-hidden text-xs">
            <div className="bg-[#0c2340] text-white p-3 font-bold grid grid-cols-12 gap-2 items-center">
              <span className="col-span-3">Client & Contract Ref</span>
              <span className="col-span-2 text-right">Entitled Pax</span>
              <span className="col-span-2 text-right">Dine-In Scanned</span>
              <span className="col-span-1 text-right">Packed</span>
              <span className="col-span-1 text-right">Cancelled</span>
              <span className="col-span-1 text-right">Net Billed</span>
              <span className="col-span-2 text-center">Attendance %</span>
            </div>

            <div className="divide-y divide-border/60 bg-card">
              {SAMPLE_CLIENT_MEAL_CONSUMPTION.map((client) => (
                <div key={client.clientCode} className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/30 transition-colors">
                  <div className="col-span-3">
                    <strong className="font-bold text-foreground block">{client.clientName}</strong>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="font-mono text-[9px] px-1 py-0">
                        {client.clientCode}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{client.contractRef}</span>
                    </div>
                  </div>

                  <div className="col-span-2 text-right font-mono font-semibold text-foreground">
                    {client.entitledHeadcount} pax
                  </div>

                  <div className="col-span-2 text-right font-mono font-bold text-foreground">
                    {client.actualDineInHeadcount} pax
                  </div>

                  <div className="col-span-1 text-right font-mono font-bold text-[#fe932c]">
                    {client.packedMealsDispatched}
                  </div>

                  <div className="col-span-1 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                    -{client.advanceCancellations}
                  </div>

                  <div className="col-span-1 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {client.netBilledPax}
                  </div>

                  <div className="col-span-2 flex flex-col items-center gap-1">
                    <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px]">
                      {client.attendanceRatePct}% Active
                    </Badge>
                    <div className="w-20 bg-muted/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${client.attendanceRatePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-muted/40 border-t border-border/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                All records cross-checked against SAP HCM daily clock-in rosters and shift schedules.
              </span>
              <Button
                size="sm"
                onClick={handleExportAttendance}
                className="h-7 text-xs bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold gap-1"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#fe932c]" />
                Export Client Headcount Ledger
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TURNSTILES & DUPLICATE SHIELD */}
      {activeTab === "turnstiles_shield" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Serving Lines Live Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SERVING_LINES.map((line) => (
              <div
                key={line.lineId}
                className="p-3 rounded-xl border border-border/60 bg-muted/20 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-semibold truncate">{line.lineName}</span>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      line.status === "congested"
                        ? "bg-rose-500 text-white"
                        : line.status === "busy"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-emerald-500 text-slate-950"
                    }`}
                  >
                    {line.estWaitMins}m Wait
                  </span>
                </div>
                <strong className="text-base font-black text-foreground font-mono block mt-1">
                  {line.queueCount} in Queue
                </strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Throughput: {line.currentThroughputPaxPerHour} pax/hr
                </span>
                <span className="text-[10px] text-primary block mt-1 truncate">
                  {line.activeServerStaff}
                </span>
              </div>
            ))}
          </div>

          {/* Turnstile Live Scan Feed */}
          <div className="rounded-xl border border-border/60 overflow-hidden text-xs">
            <div className="bg-[#0c2340] text-white p-3 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#fe932c]" />
                Biometric & RFID Turnstile Gate Log (Double-Meal Prevention Engine)
              </span>
              <span className="text-[11px] text-muted-foreground">Tanajib Main Dining Hall</span>
            </div>

            <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
              {scans.map((scan) => {
                const isBlocked = scan.scanResult === "blocked_duplicate";
                const isOverride = scan.scanResult === "override_allowed";

                return (
                  <div
                    key={scan.employeeId}
                    className={`p-3 flex items-center justify-between transition-colors ${
                      isBlocked
                        ? "bg-rose-500/10 border-l-4 border-rose-500"
                        : isOverride
                        ? "bg-amber-500/10 border-l-4 border-amber-500"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-bold text-foreground">{scan.employeeName}</strong>
                        <Badge variant="outline" className="font-mono text-[9px]">
                          #{scan.employeeId}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{scan.department}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Scanned at <span className="font-mono">{scan.scanTime}</span> ({scan.mealSession})
                        {scan.hasApprovedPackedLunch && (
                          <span className="ml-1.5 text-rose-600 dark:text-rose-400 font-bold">
                            [Packed Lunch Token #{scan.packedLunchRef} already active]
                          </span>
                        )}
                        {scan.overrideReason && (
                          <span className="ml-1.5 text-amber-600 dark:text-amber-400 italic">
                            ({scan.overrideReason})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isBlocked ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-rose-500 text-white text-[10px] font-bold">
                            BLOCKED DUPLICATE
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSupervisorOverride(scan.employeeId)}
                            className="h-7 text-[10px] border-amber-500/60 text-amber-600 hover:bg-amber-500/10 font-bold"
                          >
                            Supervisor Override
                          </Button>
                        </div>
                      ) : isOverride ? (
                        <Badge className="bg-amber-500 text-slate-950 text-[10px] font-bold">
                          OVERRIDE GRANTED
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-bold">
                          GRANTED (OK)
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: REMOTE SITE PACKED MEAL MANIFESTS */}
      {activeTab === "packed_manifests" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-border/60 overflow-hidden text-xs">
            <div className="bg-[#0c2340] text-white p-3 font-bold grid grid-cols-12 gap-2 items-center">
              <span className="col-span-3">Manifest ID & Destination</span>
              <span className="col-span-3">Client & Shift</span>
              <span className="col-span-2">Pack Type</span>
              <span className="col-span-1 text-right">Portions</span>
              <span className="col-span-2 text-center">HACCP Temp & Driver</span>
              <span className="col-span-1 text-right">Status</span>
            </div>

            <div className="divide-y divide-border/60 bg-card">
              {SAMPLE_PACKED_MEAL_MANIFESTS.map((item) => (
                <div key={item.manifestId} className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/30">
                  <div className="col-span-3">
                    <strong className="font-mono text-primary font-bold block">{item.manifestId}</strong>
                    <span className="text-foreground font-semibold block">{item.destinationRig}</span>
                  </div>

                  <div className="col-span-3">
                    <span className="text-foreground block font-medium">{item.clientRef}</span>
                    <span className="text-[10px] text-muted-foreground">{item.shift} • {item.dispatchTime}</span>
                  </div>

                  <div className="col-span-2">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {item.packType}
                    </Badge>
                  </div>

                  <div className="col-span-1 text-right font-mono font-black text-foreground">
                    {item.portionsCount}
                  </div>

                  <div className="col-span-2 text-center">
                    <div className="flex items-center justify-center gap-1 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      <span>{item.haccpDepartureTempC}°C</span>
                      <span className="text-[9px] text-muted-foreground">(HACCP Valid)</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {item.driverName} ({item.vehiclePlate})
                    </span>
                  </div>

                  <div className="col-span-1 text-right">
                    <Badge
                      className={`text-[9px] font-bold uppercase ${
                        item.status === "delivered"
                          ? "bg-emerald-500 text-slate-950"
                          : item.status === "dispatched"
                          ? "bg-blue-500 text-white"
                          : "bg-amber-500 text-slate-950"
                      }`}
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
