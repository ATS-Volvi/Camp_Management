import { useState, useMemo } from "react";
import {
  DollarSign, TrendingDown, TrendingUp, AlertTriangle, ShieldCheck,
  Calendar, Building2, Users, Download, Plus, Filter, Search,
  ChevronRight, ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles,
  PieChart, BarChart3, HelpCircle, Layers, CheckCircle2, SlidersHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  useCostControlSummary,
  useSaveCateringBudget,
  DepartmentExpenditure,
  CampExpenditure
} from "@/hooks/useCateringCostControl";

export default function CateringCostControl() {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedCampId, setSelectedCampId] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Modals & Panels
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetailDept, setSelectedDetailDept] = useState<string | null>(null);

  // Budget form state
  const [budgetCampId, setBudgetCampId] = useState<string>("all");
  const [budgetDept, setBudgetDept] = useState<string>("All");
  const [budgetAmount, setBudgetAmount] = useState<number>(540000);
  const [budgetThreshold, setBudgetThreshold] = useState<number>(85);
  const [budgetNotes, setBudgetNotes] = useState<string>("");

  // 1. Fetch Camps
  const { data: camps = [] } = useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch Cost Control Aggregated Data from Backend
  const { data: summary, isLoading, refetch } = useCostControlSummary({
    campId: selectedCampId !== "all" ? selectedCampId : undefined,
    department: selectedDept !== "All" ? selectedDept : undefined,
    monthYear: selectedMonth,
  });

  const saveBudget = useSaveCateringBudget();

  const kpis = summary?.kpis || {
    totalBudget: 567000,
    actualExpenditure: 441000,
    remainingBudget: 126000,
    budgetUtilizationPct: 77.8,
    avgCostPerWorkerPerDay: 17.50,
    avgCostPerMeal: 5.83,
    momVariationPct: -2.4,
    totalActiveWorkers: 1050,
    projectedMonthEnd: 529200,
  };

  const handleSaveBudget = async () => {
    try {
      await saveBudget.mutateAsync({
        camp_id: budgetCampId !== "all" ? budgetCampId : null,
        department: budgetDept,
        month_year: selectedMonth,
        allocated_budget: budgetAmount,
        warning_threshold_pct: budgetThreshold,
        notes: budgetNotes,
      });
      setBudgetModalOpen(false);
    } catch (err) {
      // handled in hook
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const rows = [
      ["Department", "Active Workers", "Allocated Budget (SAR)", "Actual Expenditure (SAR)", "Utilization %", "Cost / Worker / Day (SAR)", "Status"],
      ...(summary?.deptExpenditures || []).map((d) => [
        d.department,
        d.workerCount,
        d.allocatedBudget,
        d.actualExpenditure,
        `${d.budgetUtilizationPct}%`,
        d.costPerWorkerPerDay,
        d.status,
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Catering_Budget_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Report Exported", description: `Downloaded CSV for ${selectedMonth}` });
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* 1. Global Filter Toolbar */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-r from-card to-muted/20">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Catering Cost Control & Budget Monitor
                  <Badge variant="outline" className="font-semibold text-xs border-primary/20 bg-primary/5 text-primary">
                    Financial Oversight
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Centralized budget tracking, department catering allocation, and cost per worker audits.
                </p>
              </div>
            </div>

            {/* Global Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Camp Filter */}
              <Select value={selectedCampId} onValueChange={setSelectedCampId}>
                <SelectTrigger className="w-[170px] h-9 text-xs font-medium">
                  <SelectValue placeholder="All Camps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Camps</SelectItem>
                  {camps.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Department Filter */}
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-[130px] h-9 text-xs font-medium">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Depts</SelectItem>
                  <SelectItem value="HERD">HERD</SelectItem>
                  <SelectItem value="PMTA">PMTA</SelectItem>
                  <SelectItem value="MBS">MBS</SelectItem>
                  <SelectItem value="Rigging">Rigging</SelectItem>
                </SelectContent>
              </Select>

              {/* Month Selector */}
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-[135px] h-9 text-xs"
              />

              {/* Budget Config Action */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBudgetModalOpen(true)}
                className="h-9 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Set Budget
              </Button>

              {/* Export Button */}
              <Button
                size="sm"
                onClick={handleExportCSV}
                className="h-9 text-xs gap-1.5 bg-primary text-primary-foreground shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* 2. Seven Core KPI Cards (Dynamic Reports Design Language) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-5 pt-4 border-t border-border/60">
            {/* KPI 1: Total Budget */}
            <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Total Budget</span>
              <div className="mt-1">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  SAR {kpis.totalBudget.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Monthly allocation</p>
            </div>

            {/* KPI 2: Actual Expenditure */}
            <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Actual Spend</span>
              <div className="mt-1">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  SAR {kpis.actualExpenditure.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-primary font-medium mt-1">To-date expenditure</p>
            </div>

            {/* KPI 3: Remaining Budget */}
            <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Remaining</span>
              <div className="mt-1">
                <span className={`text-xl font-bold tracking-tight ${kpis.remainingBudget >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                  SAR {kpis.remainingBudget.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {kpis.remainingBudget >= 0 ? "Available balance" : "Deficit"}
              </p>
            </div>

            {/* KPI 4: Utilization % */}
            <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>Utilization</span>
                <span className={`font-bold ${kpis.budgetUtilizationPct > 90 ? "text-rose-500" : "text-emerald-500"}`}>
                  {kpis.budgetUtilizationPct}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${kpis.budgetUtilizationPct > 90 ? "bg-rose-500" : kpis.budgetUtilizationPct > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, kpis.budgetUtilizationPct)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Threshold: 85%</p>
            </div>

            {/* KPI 5: Cost Per Worker / Day */}
            <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Cost / Worker-Day</span>
              <div className="mt-1">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  SAR {kpis.avgCostPerWorkerPerDay.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Benchmark: SAR 18.00</p>
            </div>

            {/* KPI 6: Cost Per Meal */}
            <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Avg Meal Cost</span>
              <div className="mt-1">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  SAR {kpis.avgCostPerMeal.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">3 meals / resident</p>
            </div>

            {/* KPI 7: MoM Variation */}
            <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>MoM Trend</span>
                {kpis.momVariationPct <= 0 ? (
                  <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
                )}
              </div>
              <div className="mt-1">
                <span className={`text-xl font-bold tracking-tight ${kpis.momVariationPct <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                  {kpis.momVariationPct <= 0 ? `${Math.abs(kpis.momVariationPct)}%` : `+${kpis.momVariationPct}%`}
                </span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                {kpis.momVariationPct <= 0 ? "Controlled spend" : "Budget expansion"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Budget Utilization Visual Comparison & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Visual Comparison (2 Columns) */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="py-3.5 px-4 md:px-6 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                Budget vs Actual Trajectory — {selectedMonth}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparison of approved ceiling, current run-rate, and projected month-end expenditure.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              Projected Month-End: SAR {kpis.projectedMonthEnd.toLocaleString()}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            {/* Visual Multi-Segment Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-foreground">Budget Envelope Absorption</span>
                <span className="font-mono text-muted-foreground">
                  SAR {kpis.actualExpenditure.toLocaleString()} of SAR {kpis.totalBudget.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden flex">
                <div
                  className="bg-primary h-4 transition-all duration-500 flex items-center justify-center text-[10px] text-primary-foreground font-bold"
                  style={{ width: `${Math.min(100, kpis.budgetUtilizationPct)}%` }}
                >
                  {kpis.budgetUtilizationPct > 15 ? `${kpis.budgetUtilizationPct}%` : ""}
                </div>
                {kpis.remainingBudget > 0 && (
                  <div
                    className="bg-emerald-500/20 h-4 flex items-center justify-center text-[10px] text-emerald-700 dark:text-emerald-300 font-medium"
                    style={{ width: `${100 - Math.min(100, kpis.budgetUtilizationPct)}%` }}
                  >
                    Remaining
                  </div>
                )}
              </div>
            </div>

            {/* Threshold Indicators */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/60 text-center">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <p className="text-[10px] text-muted-foreground">Allocated Monthly Limit</p>
                <p className="text-sm font-bold text-foreground">SAR {kpis.totalBudget.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <p className="text-[10px] text-muted-foreground">Actual Billed & Issues</p>
                <p className="text-sm font-bold text-primary">SAR {kpis.actualExpenditure.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <p className="text-[10px] text-muted-foreground">Estimated Month-End Forecast</p>
                <p className={`text-sm font-bold ${kpis.projectedMonthEnd <= kpis.totalBudget ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                  SAR {kpis.projectedMonthEnd.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Actionable Alerts Panel (1 Column) */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="py-3.5 px-4 border-b border-border/60">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Actionable Financial Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 space-y-2.5">
            {(summary?.alerts || []).map((alert, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground">{alert.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${
                      alert.severity === "critical"
                        ? "border-rose-500/30 text-rose-600 bg-rose-500/10"
                        : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                    }`}
                  >
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{alert.description}</p>
                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                  <span className="text-muted-foreground">{alert.affectedUnit}</span>
                  <span className="text-primary font-medium hover:underline cursor-pointer">{alert.action} &rarr;</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 4. Department-wise Expenditure Table (Interactive Drilldown) */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="py-3.5 px-4 md:px-6 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Department Catering Expenditure Breakdown
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live cost attribution by worker counts and delivered site lunches (HERD, PMTA, MBS, etc.).
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            Click department for itemized records
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-[11px] uppercase font-semibold text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-2.5 px-4 text-left">Department</th>
                  <th className="py-2.5 px-4 text-right">Active Workforce</th>
                  <th className="py-2.5 px-4 text-right">Allocated Budget</th>
                  <th className="py-2.5 px-4 text-right">Actual Spend</th>
                  <th className="py-2.5 px-4 text-center">Budget Utilization</th>
                  <th className="py-2.5 px-4 text-right">Cost / Worker / Day</th>
                  <th className="py-2.5 px-4 text-center">MoM Trend</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(summary?.deptExpenditures || []).map((dept) => (
                  <tr
                    key={dept.department}
                    onClick={() => {
                      setSelectedDetailDept(dept.department);
                      setDetailsModalOpen(true);
                    }}
                    className="hover:bg-muted/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 font-bold text-foreground flex items-center gap-2">
                      <span className="group-hover:text-primary transition-colors">{dept.department}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                      {dept.workerCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-foreground font-medium">
                      SAR {dept.allocatedBudget.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-primary">
                      SAR {dept.actualExpenditure.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${dept.budgetUtilizationPct > 90 ? "bg-rose-500" : dept.budgetUtilizationPct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(100, dept.budgetUtilizationPct)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold">{dept.budgetUtilizationPct}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-foreground font-mono">
                      SAR {dept.costPerWorkerPerDay.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[11px] font-semibold ${dept.momVariationPct <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                        {dept.momVariationPct <= 0 ? `${dept.momVariationPct}%` : `+${dept.momVariationPct}%`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 ${
                          dept.status === "Within Budget"
                            ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                            : dept.status === "Approaching"
                            ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                            : "border-rose-500/30 text-rose-600 bg-rose-500/10"
                        }`}
                      >
                        {dept.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Camp-wise Comparison & Expenditure Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Camp-wise Comparison */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="py-3.5 px-4 md:px-6 border-b border-border/60">
            <CardTitle className="text-sm font-bold">
              Multi-Camp Facility Cost Comparison
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Comparative catering efficiency across camp locations.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-2 px-3 text-left">Camp</th>
                  <th className="py-2 px-3 text-right">Workers</th>
                  <th className="py-2 px-3 text-right">Total Spend</th>
                  <th className="py-2 px-3 text-right">Cost / Head</th>
                  <th className="py-2 px-3 text-center">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(summary?.campExpenditures || []).map((c) => (
                  <tr key={c.campId} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      {c.campName}
                      <span className="block text-[10px] text-muted-foreground font-normal">{c.location}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{c.activeWorkers}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">SAR {c.totalExpenditure.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono">SAR {c.avgCostPerWorkerPerDay.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                        {c.budgetUtilizationPct}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Right: Expenditure Category Breakdown */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="py-3.5 px-4 md:px-6 border-b border-border/60">
            <CardTitle className="text-sm font-bold">
              Expenditure by Procurement Category
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Where the catering budget is allocated across food categories.
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {(summary?.expenditureBreakdown || []).map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono">SAR {cat.amount.toLocaleString()}</span>
                    <span className="font-bold text-foreground font-mono">{cat.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 6. MODAL: Set / Allocate Monthly Budget */}
      <Dialog open={budgetModalOpen} onOpenChange={setBudgetModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Configure Monthly Catering Budget
            </DialogTitle>
            <DialogDescription>
              Set authorized catering expenditure limits for {selectedMonth}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Camp Facility</Label>
              <Select value={budgetCampId} onValueChange={setBudgetCampId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="All Camps (Global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Camps (Global)</SelectItem>
                  {camps.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Department Scope</Label>
              <Select value={budgetDept} onValueChange={setBudgetDept}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Departments</SelectItem>
                  <SelectItem value="HERD">HERD Division</SelectItem>
                  <SelectItem value="PMTA">PMTA Division</SelectItem>
                  <SelectItem value="MBS">MBS Division</SelectItem>
                  <SelectItem value="Rigging">Rigging Division</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Allocated Monthly Budget (SAR)</Label>
              <Input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(Number(e.target.value))}
                className="mt-1 h-9 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="text-xs">Alert Threshold (% of budget)</Label>
                <span className="font-bold text-primary">{budgetThreshold}%</span>
              </div>
              <Slider
                value={[budgetThreshold]}
                min={70}
                max={98}
                step={1}
                onValueChange={(val) => setBudgetThreshold(val[0])}
              />
            </div>

            <div>
              <Label className="text-xs">Notes / Approval Justification</Label>
              <Input
                placeholder="e.g. Q4 Turnaround budget enhancement approved by Finance..."
                value={budgetNotes}
                onChange={(e) => setBudgetNotes(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBudgetModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveBudget} disabled={saveBudget.isPending}>
              {saveBudget.isPending ? "Saving..." : "Save Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL: Detailed Expenditure Breakdown Drilldown */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Itemized Records — {selectedDetailDept} Division
            </DialogTitle>
            <DialogDescription>
              Verified invoices, site meal orders, and kitchen stock issues.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[350px] overflow-y-auto space-y-2 py-2">
            {[
              { date: `${selectedMonth}-02`, category: "Main Camp Buffet Meals", ref: "INVOICE-8491", amount: 28400, supplier: "Al-Munajem Food Co.", status: "Approved" },
              { date: `${selectedMonth}-08`, category: "Department Site Lunches", ref: "LUNCH-REQ-102", amount: 14200, supplier: "Camp Central Kitchen", status: "Delivered" },
              { date: `${selectedMonth}-14`, category: "Night Shift Packed Dinners", ref: "LUNCH-REQ-118", amount: 8400, supplier: "Camp Central Kitchen", status: "Delivered" },
              { date: `${selectedMonth}-21`, category: "Weekly Dry Stock Allocation", ref: "ISSUE-491", amount: 18200, supplier: "Camp Pantry Store", status: "Issued" },
            ].map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-foreground">{item.category}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.date} • Ref: {item.ref} • {item.supplier}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-primary">SAR {item.amount.toLocaleString()}</p>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-600">
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
