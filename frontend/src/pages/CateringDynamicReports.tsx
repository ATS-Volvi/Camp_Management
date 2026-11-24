import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  UtensilsCrossed,
  Recycle,
  Building2,
  Download,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers,
  PieChart,
  Search,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  PROJECT_DMC_DATA,
  SAMPLE_CLIENT_MEAL_CONSUMPTION,
  SAMPLE_DAILY_WASTAGE_LOGS,
  SAMPLE_PROJECT_PROFITABILITY,
  CURRENT_ARAMCO_BILLING_PACK,
  INVENTORY_BATCH_LOTS,
  SAMPLE_CONSUMPTION_VELOCITY,
  ProjectDmcRecord,
} from "@/data/enterpriseCateringSuiteData";

export default function CateringDynamicReports() {
  const navigate = useNavigate();

  // --------------------------------------------------------------------------
  // POWER BI SLICERS / FILTERS
  // --------------------------------------------------------------------------
  const [selectedCamp, setSelectedCamp] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("nov-2026");
  const [budgetCapSAR, setBudgetCapSAR] = useState<number>(19.5);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeReportPage, setActiveReportPage] = useState<
    "executive" | "dmc_cph" | "headcount" | "inventory" | "waste_haccp" | "sap_billing"
  >("executive");

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedCamp("all");
    setSelectedProject("all");
    setSelectedSession("all");
    setSelectedPeriod("nov-2026");
    setBudgetCapSAR(19.5);
    setSearchQuery("");
  };

  // --------------------------------------------------------------------------
  // FILTERED DATASET CALCULATION
  // --------------------------------------------------------------------------
  const filteredProjects = useMemo(() => {
    return PROJECT_DMC_DATA.filter((p) => {
      if (selectedProject !== "all" && p.projectCode !== selectedProject) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesName = p.projectName.toLowerCase().includes(q);
        const matchesClient = p.contractClient.toLowerCase().includes(q);
        const matchesCode = p.projectCode.toLowerCase().includes(q);
        if (!matchesName && !matchesClient && !matchesCode) return false;
      }
      return true;
    });
  }, [selectedProject, searchQuery]);

  // Aggregate Financial & Catering Metrics
  const summaryMetrics = useMemo(() => {
    const totalHeadcount = filteredProjects.reduce((acc, p) => acc + p.headcount, 0);
    const totalDailyDmcSAR = filteredProjects.reduce((acc, p) => acc + p.totalDailyDmcSAR, 0);
    const avgCph = totalHeadcount > 0 ? Number((totalDailyDmcSAR / totalHeadcount).toFixed(2)) : 0;
    const overBudgetCount = filteredProjects.filter((p) => p.overallCphSAR > budgetCapSAR).length;

    // Monthly projection
    const monthlyProjectedRevenueSAR = CURRENT_ARAMCO_BILLING_PACK.netInvoicedSAR;
    const monthlyFoodCostSAR = totalDailyDmcSAR * 30;
    const grossMarginPct =
      monthlyProjectedRevenueSAR > 0
        ? Number((((monthlyProjectedRevenueSAR - monthlyFoodCostSAR) / monthlyProjectedRevenueSAR) * 100).toFixed(1))
        : 43.7;

    return {
      totalHeadcount,
      totalDailyDmcSAR,
      avgCph,
      overBudgetCount,
      monthlyProjectedRevenueSAR,
      grossMarginPct,
    };
  }, [filteredProjects, budgetCapSAR]);

  // --------------------------------------------------------------------------
  // EXPORT HANDLERS (EXCEL & CSV)
  // --------------------------------------------------------------------------
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Project Cost & CPH
    const projectSheetData = filteredProjects.map((p) => ({
      "Project Code": p.projectCode,
      "Project Name": p.projectName,
      "Contract Client": p.contractClient,
      "Headcount": p.headcount,
      "Breakfast (SAR)": p.sessions.breakfast.cph,
      "Lunch (SAR)": p.sessions.lunch.cph,
      "Dinner (SAR)": p.sessions.dinner.cph,
      "Field Pack (SAR)": p.sessions.fieldPack.cph,
      "Total CPH (SAR)": p.overallCphSAR,
      "Budget Cap (SAR)": budgetCapSAR,
      "Variance from Cap (SAR)": Number((p.overallCphSAR - budgetCapSAR).toFixed(2)),
      "Status": p.overallCphSAR > budgetCapSAR ? "OVER_BUDGET" : "UNDER_BUDGET",
      "Total Daily DMC (SAR)": p.totalDailyDmcSAR,
      "Top Cost Driver": p.topCostDriver,
    }));
    const wsProjects = XLSX.utils.json_to_sheet(projectSheetData);
    XLSX.utils.book_append_sheet(wb, wsProjects, "Project_CPH_Report");

    // Sheet 2: Aramco Billing Binder
    const billingSheetData = [
      { Layer: "1. Inmate Bed-Nights", Count: 34500, RateSAR: 45.0, SubtotalSAR: 1552500 },
      { Layer: "2. Scanned Dining Meals", Count: 72400, RateSAR: 12.0, SubtotalSAR: 868800 },
      { Layer: "3. Approved Field Lunches", Count: 18200, RateSAR: 14.5, SubtotalSAR: 263900 },
      { Layer: "4. Deducted Cancellations", Count: 2150, RateSAR: -10.0, SubtotalSAR: -21500 },
      { Layer: "NET INVOICE TOTAL", Count: 125100, RateSAR: 0, SubtotalSAR: CURRENT_ARAMCO_BILLING_PACK.netInvoicedSAR },
    ];
    const wsBilling = XLSX.utils.json_to_sheet(billingSheetData);
    XLSX.utils.book_append_sheet(wb, wsBilling, "Aramco_Billing_VF01");

    // Sheet 3: Daily Wastage Audit
    const wsWastage = XLSX.utils.json_to_sheet(SAMPLE_DAILY_WASTAGE_LOGS);
    XLSX.utils.book_append_sheet(wb, wsWastage, "HACCP_Wastage_Audit");

    XLSX.writeFile(wb, `Catering_Mess_BI_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);

    setExportNotice("Power BI Catering Master Workbook (.xlsx) generated and downloaded.");
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleExportCsv = () => {
    const csvRows = [
      ["Project Code", "Project Name", "Client", "Headcount", "Total CPH", "Budget Cap", "Variance", "Daily DMC (SAR)"],
      ...filteredProjects.map((p) => [
        p.projectCode,
        `"${p.projectName}"`,
        `"${p.contractClient}"`,
        p.headcount,
        p.overallCphSAR,
        budgetCapSAR,
        (p.overallCphSAR - budgetCapSAR).toFixed(2),
        p.totalDailyDmcSAR,
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Catering_CPH_Pivot_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice("Catering CPH Pivot dataset exported to CSV successfully.");
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="space-y-6 pb-16 font-sans max-w-7xl mx-auto">
      {/* ==================================================================== */}
      {/* 1. TOP HEADER & BREADCRUMB (DYNAMIC REPORTS NAVY THEME)             */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              onClick={() => navigate("/mess-catering")}
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Mess Catering
            </button>
            <span>/</span>
            <button
              onClick={() => navigate("/catering/enterprise-hub")}
              className="hover:text-foreground transition-colors"
            >
              Enterprise Catering Hub
            </button>
            <span>/</span>
            <span className="text-foreground font-semibold">Catering BI Reports</span>
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="p-2.5 rounded-xl bg-[#0c2340] text-white shadow-sm border border-[#fe932c]/30">
              <BarChart3 className="h-6 w-6 text-[#fe932c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  Catering & Mess Intelligence Reports
                </h1>
                <Badge className="bg-[#fe932c] text-slate-950 font-black text-[10px] tracking-wider uppercase">
                  Power BI Suite
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-600">
                  SAP VF01 Verified
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Executive analytics engine for project-wise food cost (DMC), Cost Per Head (CPH), headcount variance, and SAP billing reconciliation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleExportExcel}
            className="h-8 text-xs font-bold gap-1.5 bg-[#0c2340] hover:bg-[#0c2340]/90 text-white shadow-2xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#fe932c]" />
            Export Power BI (.xlsx)
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            className="h-8 text-xs font-bold gap-1.5 border-border/70 hover:bg-muted/40 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            CSV Data
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="h-8 text-xs font-bold gap-1.5 border-border/70 hover:bg-muted/40 shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Dossier
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. POWER BI TOP SLICER BAR (INTERACTIVE CONTROLS)                    */}
      {/* ==================================================================== */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#fe932c]" />
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Power BI Slicers & Dynamic Dimensions
            </span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetFilters}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground font-semibold gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Slicers
          </Button>
        </div>

        {/* 5-Column Slicer Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Slicer 1: Camp Facility */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Camp Facility:</span>
            <Select value={selectedCamp} onValueChange={setSelectedCamp}>
              <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/70">
                <SelectValue placeholder="All Camps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Camps (Tanajib Complex)</SelectItem>
                <SelectItem value="camp-01">Camp-01 Tanajib Main (1,250 Pax)</SelectItem>
                <SelectItem value="camp-04">Camp-04 Rig Central Hub (500 Pax)</SelectItem>
                <SelectItem value="marjan-04">Marjan Offshore Cluster 4 (800 Pax)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Slicer 2: Project / Client */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Contract Project:</span>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/70">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contract Projects (5)</SelectItem>
                <SelectItem value="MRJ-EXP">Aramco Marjan Expansion (MRJ-EXP)</SelectItem>
                <SelectItem value="TAN-GAS">Tanajib Gas Plant Project (TAN-GAS)</SelectItem>
                <SelectItem value="HERD-RIG">Heavy Equipment Rental (HERD-RIG)</SelectItem>
                <SelectItem value="PMTA-PIPE">Plant Maint. Tech Assistance (PMTA)</SelectItem>
                <SelectItem value="MBS-MOD">Modular Building Services (MBS-MOD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Slicer 3: Meal Session */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Meal Session:</span>
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/70">
                <SelectValue placeholder="All Sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All 4 Meal Sessions (Full Day)</SelectItem>
                <SelectItem value="breakfast">Breakfast (05:30 - 08:30)</SelectItem>
                <SelectItem value="lunch">Dine-In Lunch (11:30 - 14:00)</SelectItem>
                <SelectItem value="dinner">Buffet Dinner (18:00 - 21:00)</SelectItem>
                <SelectItem value="fieldPack">Packed Rig Field Lunches</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Slicer 4: Billing Period */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Billing Cycle:</span>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/70">
                <SelectValue placeholder="November 2026" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nov-2026">November 2026 (Active Invoiced)</SelectItem>
                <SelectItem value="oct-2026">October 2026 (Historical Reconciled)</SelectItem>
                <SelectItem value="q4-2026">Q4 2026 (Quarter-to-Date)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Slicer 5: Search Filter */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Search Matrix:</span>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full pl-8 pr-3 text-xs rounded-md border border-border/70 bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Dynamic CPH Budget Ceiling Slicer Slider */}
        <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Contractual Budget Cap Slicer:</span>
            <Badge className="bg-[#0c2340] text-[#fe932c] font-mono font-bold text-xs">
              SAR {budgetCapSAR.toFixed(2)} / head
            </Badge>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              (Drag slider to test sensitivity against Aramco contractual cap)
            </span>
          </div>

          <div className="w-full sm:w-64 flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">15.00</span>
            <Slider
              value={[budgetCapSAR]}
              min={15.0}
              max={25.0}
              step={0.5}
              onValueChange={([val]) => setBudgetCapSAR(val)}
              className="w-full"
            />
            <span className="font-mono text-[10px] text-muted-foreground">25.00</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. POWER BI KPI CARD VISUALS (EXECUTIVE TELEMETRY)                  */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1 */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Portfolio Revenue</span>
          <strong className="text-lg font-black text-foreground font-mono block mt-1">
            SAR {(summaryMetrics.monthlyProjectedRevenueSAR / 1000).toFixed(0)}k
          </strong>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
            SAP VF01 Verified
          </span>
        </div>

        {/* KPI 2 */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Daily Food Cost (DMC)</span>
          <strong className="text-lg font-black text-foreground font-mono block mt-1">
            SAR {summaryMetrics.totalDailyDmcSAR.toLocaleString()}
          </strong>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            across {filteredProjects.length} active projects
          </span>
        </div>

        {/* KPI 3 */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Average CPH</span>
          <strong
            className={`text-lg font-black font-mono block mt-1 ${
              summaryMetrics.avgCph > budgetCapSAR ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            SAR {summaryMetrics.avgCph.toFixed(2)}
          </strong>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            Target Cap: SAR {budgetCapSAR.toFixed(2)}
          </span>
        </div>

        {/* KPI 4 */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Billed Workforce</span>
          <strong className="text-lg font-black text-[#fe932c] font-mono block mt-1">
            {summaryMetrics.totalHeadcount.toLocaleString()} Pax
          </strong>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            Turnstiles & Field Packs
          </span>
        </div>

        {/* KPI 5 */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Food Waste / Pax</span>
          <strong className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
            24.4 g / pax
          </strong>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
            ✅ &lt; 28g Aramco ESG
          </span>
        </div>

        {/* KPI 6 */}
        <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 shadow-2xs">
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold block">Gross Margin %</span>
          <strong className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
            {summaryMetrics.grossMarginPct}%
          </strong>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
            +2.4% vs Budget Plan
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. POWER BI REPORT PAGES NAVIGATION TABS                             */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60 text-xs">
        <Button
          size="sm"
          variant={activeReportPage === "executive" ? "default" : "ghost"}
          onClick={() => setActiveReportPage("executive")}
          className={`h-8 font-bold text-xs shrink-0 ${
            activeReportPage === "executive" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
          Executive Overview & CPH Matrix
        </Button>

        <Button
          size="sm"
          variant={activeReportPage === "dmc_cph" ? "default" : "ghost"}
          onClick={() => setActiveReportPage("dmc_cph")}
          className={`h-8 font-bold text-xs shrink-0 ${
            activeReportPage === "dmc_cph" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
          Project Food Cost & Session Breakdown
        </Button>

        <Button
          size="sm"
          variant={activeReportPage === "headcount" ? "default" : "ghost"}
          onClick={() => setActiveReportPage("headcount")}
          className={`h-8 font-bold text-xs shrink-0 ${
            activeReportPage === "headcount" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
          Client Headcount & Entitlements
        </Button>

        <Button
          size="sm"
          variant={activeReportPage === "inventory" ? "default" : "ghost"}
          onClick={() => setActiveReportPage("inventory")}
          className={`h-8 font-bold text-xs shrink-0 ${
            activeReportPage === "inventory" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
          Inventory Burn & Logistics
        </Button>

        <Button
          size="sm"
          variant={activeReportPage === "waste_haccp" ? "default" : "ghost"}
          onClick={() => setActiveReportPage("waste_haccp")}
          className={`h-8 font-bold text-xs shrink-0 ${
            activeReportPage === "waste_haccp" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
          }`}
        >
          <Recycle className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
          HACCP 3-Bucket Wastage Log
        </Button>

        <Button
          size="sm"
          variant={activeReportPage === "sap_billing" ? "default" : "ghost"}
          onClick={() => setActiveReportPage("sap_billing")}
          className={`h-8 font-bold text-xs shrink-0 ${
            activeReportPage === "sap_billing" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
          }`}
        >
          <Building2 className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
          Aramco 4-Tier Billing Binder
        </Button>
      </div>

      {/* ==================================================================== */}
      {/* 5. REPORT PAGE CONTENT CANVASES                                      */}
      {/* ==================================================================== */}

      {/* PAGE 1: EXECUTIVE OVERVIEW & CPH MATRIX */}
      {activeReportPage === "executive" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Visual: CPH vs Budget Cap Visual Bars */}
          <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-black text-foreground">
                  Visual Bar Chart: Daily CPH by Contract Project vs Budget Cap (SAR {budgetCapSAR.toFixed(2)})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Green indicates operations within contractual spending limits; Red indicates cost driver exceedance.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {filteredProjects.length} Projects Displayed
              </Badge>
            </div>

            {/* Power BI-style Horizontal Visual Bars */}
            <div className="space-y-3 pt-1">
              {filteredProjects.map((p) => {
                const isOver = p.overallCphSAR > budgetCapSAR;
                const variance = p.overallCphSAR - budgetCapSAR;
                const barWidthPct = Math.min(100, Math.max(10, (p.overallCphSAR / 28) * 100));

                return (
                  <div key={p.projectCode} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="font-bold text-foreground">{p.projectName}</strong>
                        <span className="text-[10px] text-muted-foreground">({p.contractClient})</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <strong className={isOver ? "text-rose-600 dark:text-rose-400 font-black" : "text-emerald-600 dark:text-emerald-400 font-black"}>
                          SAR {p.overallCphSAR.toFixed(2)}
                        </strong>
                        <span className={`text-[10px] font-bold ${isOver ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          ({isOver ? `+${variance.toFixed(2)}` : variance.toFixed(2)} SAR)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-4 bg-muted/40 rounded-lg overflow-hidden relative">
                      {/* Budget Cap Marker Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                        style={{ left: `${(budgetCapSAR / 28) * 100}%` }}
                        title={`Cap: SAR ${budgetCapSAR.toFixed(2)}`}
                      />
                      <div
                        className={`h-full rounded-lg transition-all duration-500 ${
                          isOver ? "bg-rose-500/80" : "bg-emerald-500/80"
                        }`}
                        style={{ width: `${barWidthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Matrix / Pivot Table */}
          <div className="bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden text-xs">
            <div className="bg-[#0c2340] text-white p-3.5 font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#fe932c]" />
                Power BI Matrix: Project Food Cost & DMC Variance
              </span>
              <span className="text-[11px] text-slate-300 font-mono">
                Grand Total: SAR {summaryMetrics.totalDailyDmcSAR.toLocaleString()} / day
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase">
                    <th className="p-3">Project & Client</th>
                    <th className="p-3 text-right">Headcount</th>
                    <th className="p-3 text-right">Breakfast</th>
                    <th className="p-3 text-right">Lunch</th>
                    <th className="p-3 text-right">Dinner</th>
                    <th className="p-3 text-right">Field Pack</th>
                    <th className="p-3 text-right">Total CPH</th>
                    <th className="p-3 text-right">Variance</th>
                    <th className="p-3 text-right">Total Daily DMC</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {filteredProjects.map((p) => {
                    const isOver = p.overallCphSAR > budgetCapSAR;
                    const diff = p.overallCphSAR - budgetCapSAR;
                    return (
                      <tr key={p.projectCode} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-sans font-medium text-foreground">
                          <strong className="block font-bold">{p.projectName}</strong>
                          <span className="text-[10px] text-muted-foreground">
                            {p.projectCode} • {p.contractClient}
                          </span>
                        </td>
                        <td className="p-3 text-right font-semibold text-foreground">{p.headcount}</td>
                        <td className="p-3 text-right text-muted-foreground">SAR {p.sessions.breakfast.cph.toFixed(2)}</td>
                        <td className="p-3 text-right text-muted-foreground">SAR {p.sessions.lunch.cph.toFixed(2)}</td>
                        <td className="p-3 text-right text-muted-foreground">SAR {p.sessions.dinner.cph.toFixed(2)}</td>
                        <td className="p-3 text-right text-muted-foreground">SAR {p.sessions.fieldPack.cph.toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-foreground">
                          SAR {p.overallCphSAR.toFixed(2)}
                        </td>
                        <td
                          className={`p-3 text-right font-bold ${
                            isOver ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-black text-primary font-sans">
                          SAR {p.totalDailyDmcSAR.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            className={`text-[9px] font-bold uppercase ${
                              isOver ? "bg-rose-500 text-white" : "bg-emerald-500 text-slate-950"
                            }`}
                          >
                            {isOver ? "Over Budget" : "Under Cap"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/60 font-bold border-t-2 border-border/80">
                    <td className="p-3 font-black text-foreground">GRAND TOTAL / PORTFOLIO AVERAGE</td>
                    <td className="p-3 text-right font-mono font-black text-foreground">{summaryMetrics.totalHeadcount}</td>
                    <td colSpan={4} className="p-3 text-center text-muted-foreground text-[10px]">
                      Aggregated across all active session runs
                    </td>
                    <td className="p-3 text-right font-mono font-black text-foreground">
                      SAR {summaryMetrics.avgCph.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {(summaryMetrics.avgCph - budgetCapSAR).toFixed(2)} SAR
                    </td>
                    <td className="p-3 text-right font-mono font-black text-primary">
                      SAR {summaryMetrics.totalDailyDmcSAR.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <Badge className="bg-emerald-500 text-slate-950 text-[9px] font-bold">
                        Compliant
                      </Badge>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 2: PROJECT FOOD COST & SESSIONS */}
      {activeReportPage === "dmc_cph" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p) => (
              <div key={p.projectCode} className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div>
                    <strong className="font-bold text-foreground block">{p.projectName}</strong>
                    <span className="text-[10px] text-muted-foreground">{p.contractClient}</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {p.headcount} Pax
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Breakfast CPH</span>
                    <strong className="font-mono font-bold">SAR {p.sessions.breakfast.cph.toFixed(2)}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Lunch CPH</span>
                    <strong className="font-mono font-bold">SAR {p.sessions.lunch.cph.toFixed(2)}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Dinner CPH</span>
                    <strong className="font-mono font-bold">SAR {p.sessions.dinner.cph.toFixed(2)}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Field Lunch CPH</span>
                    <strong className="font-mono font-bold text-[#fe932c]">SAR {p.sessions.fieldPack.cph.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Total Daily Food DMC:</span>
                    <strong className="font-mono font-black text-primary">SAR {p.totalDailyDmcSAR.toLocaleString()}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Driver:</span>
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block truncate max-w-[130px]">
                      {p.topCostDriver}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAGE 3: HEADCOUNT & ENTITLEMENTS */}
      {activeReportPage === "headcount" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-border/80 overflow-hidden text-xs bg-card">
            <div className="bg-[#0c2340] text-white p-3 font-bold flex items-center justify-between">
              <span>Client Entitlement vs Actual Scanned Consumption</span>
              <span>Audit Period: November 2026</span>
            </div>

            <div className="divide-y divide-border/60">
              {SAMPLE_CLIENT_MEAL_CONSUMPTION.map((c) => (
                <div key={c.clientCode} className="p-3.5 grid grid-cols-12 gap-3 items-center hover:bg-muted/20">
                  <div className="col-span-4">
                    <strong className="font-bold text-foreground block">{c.clientName}</strong>
                    <span className="text-[10px] text-muted-foreground">{c.contractRef}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] text-muted-foreground block">Entitled</span>
                    <strong className="font-mono text-foreground font-bold">{c.entitledHeadcount} pax</strong>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] text-muted-foreground block">Scanned Dine-In</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {c.actualDineInHeadcount} pax
                    </strong>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] text-muted-foreground block">Packed Dispatches</span>
                    <strong className="font-mono text-[#fe932c] font-bold">{c.packedMealsDispatched}</strong>
                  </div>
                  <div className="col-span-2 text-center">
                    <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px]">
                      {c.attendanceRatePct}% Active
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAGE 4: INVENTORY BURN VELOCITY */}
      {activeReportPage === "inventory" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-border/80 overflow-hidden text-xs bg-card">
            <div className="bg-[#0c2340] text-white p-3 font-bold flex items-center justify-between">
              <span>Daily Kitchen Consumption & Warehouse Burn Velocity</span>
              <span>ROP Alert Engine</span>
            </div>

            <div className="divide-y divide-border/60">
              {SAMPLE_CONSUMPTION_VELOCITY.map((item) => (
                <div key={item.materialCode} className="p-3.5 grid grid-cols-12 gap-3 items-center hover:bg-muted/20">
                  <div className="col-span-4">
                    <strong className="font-bold text-foreground block">{item.name}</strong>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {item.materialCode} • {item.category}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] text-muted-foreground block">Current Stock</span>
                    <strong className="font-mono text-foreground font-bold">
                      {item.currentStock} {item.unit}
                    </strong>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] text-muted-foreground block">Daily Burn</span>
                    <strong className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                      {item.dailyBurnRate} {item.unit}/day
                    </strong>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-[10px] text-muted-foreground block">Days of Cover</span>
                    <strong className="font-mono font-bold text-foreground">
                      {item.daysCoverRemaining} Days
                    </strong>
                  </div>
                  <div className="col-span-2 text-right">
                    <Badge
                      className={`text-[9px] font-bold uppercase ${
                        item.status === "critical_stockout"
                          ? "bg-rose-500 text-white animate-pulse"
                          : item.status === "reorder_warning"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-emerald-500 text-slate-950"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAGE 5: HACCP WASTAGE & RESCUE */}
      {activeReportPage === "waste_haccp" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-border/80 overflow-hidden text-xs bg-card">
            <div className="bg-[#0c2340] text-white p-3 font-bold flex items-center justify-between">
              <span>HACCP 3-Bucket Food Wastage Log</span>
              <span>Aramco Environmental Standard SAEP-327</span>
            </div>

            <div className="divide-y divide-border/60">
              {SAMPLE_DAILY_WASTAGE_LOGS.map((log) => (
                <div key={log.logId} className="p-3.5 grid grid-cols-12 gap-3 items-center hover:bg-muted/20">
                  <div className="col-span-3">
                    <strong className="font-mono text-primary font-bold block">{log.logId}</strong>
                    <span className="text-[10px] text-muted-foreground">{log.logDate} • {log.mealSession}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] text-muted-foreground block">Prep Trimmings</span>
                    <span className="font-mono font-semibold">{log.prepWasteKg.toFixed(1)} kg</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] text-muted-foreground block">Buffet Overprod</span>
                    <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {log.buffetOverproductionKg.toFixed(1)} kg
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[10px] text-muted-foreground block">Plate Scraps</span>
                    <span className="font-mono font-semibold">{log.plateScrapKg.toFixed(1)} kg</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-bold">
                      {log.wasteGramsPerPax} g/pax (Target: {log.targetGramsPerPax}g)
                    </Badge>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Loss: SAR {log.financialLossSAR}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAGE 6: SAP BILLING BINDER */}
      {activeReportPage === "sap_billing" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-border/80 overflow-hidden text-xs bg-card">
            <div className="bg-[#0c2340] text-white p-3 font-bold flex items-center justify-between">
              <span>Aramco 4-Tier Master Billing Binder (SAP VF01 Cleared)</span>
              <span>Net Approved: SAR {CURRENT_ARAMCO_BILLING_PACK.netInvoicedSAR.toLocaleString()}.00</span>
            </div>

            <div className="divide-y divide-border/60">
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <strong className="block text-foreground font-bold">1. Contract Inmate Bed-Nights</strong>
                  <span className="text-[10px] text-muted-foreground">34,500 units × SAR 45.00 contractual accommodation rate</span>
                </div>
                <strong className="font-mono text-primary font-black text-sm">SAR 1,552,500.00</strong>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <strong className="block text-foreground font-bold">2. Scanned Dining Meals</strong>
                  <span className="text-[10px] text-muted-foreground">72,400 meals × SAR 12.00 verified turnstile scans</span>
                </div>
                <strong className="font-mono text-primary font-black text-sm">SAR 868,800.00</strong>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <strong className="block text-foreground font-bold">3. Approved Field Lunches</strong>
                  <span className="text-[10px] text-muted-foreground">18,200 portions × SAR 14.50 remote site packed boxes</span>
                </div>
                <strong className="font-mono text-primary font-black text-sm">SAR 263,900.00</strong>
              </div>

              <div className="p-3.5 flex items-center justify-between bg-rose-500/5">
                <div>
                  <strong className="block text-rose-600 dark:text-rose-400 font-bold">4. Advance Cancellations Credit</strong>
                  <span className="text-[10px] text-muted-foreground">2,150 deductions × -SAR 10.00 credit to client account</span>
                </div>
                <strong className="font-mono text-rose-600 dark:text-rose-400 font-black text-sm">-SAR 21,500.00</strong>
              </div>
            </div>

            <div className="p-4 bg-muted/40 border-t border-border/80 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Net Approved Invoiced Total:
                </span>
                <strong className="text-xl font-black text-foreground font-mono">
                  SAR {CURRENT_ARAMCO_BILLING_PACK.netInvoicedSAR.toLocaleString()}.00
                </strong>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block font-bold">Variance vs SAP GL</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm">
                  0.00 SAR (Exact Match)
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. AI COPILOT OPERATIONAL INSIGHTS CARD                             */}
      {/* ==================================================================== */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0c2340] to-slate-900 text-white border border-[#fe932c]/40 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#fe932c]" />
          <span className="text-xs font-black uppercase tracking-wider text-[#fe932c]">
            Camp Copilot BI Executive Summary
          </span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          Across the current <strong>November 2026</strong> billing cycle, total daily catering DMC averages <strong>SAR {summaryMetrics.avgCph.toFixed(2)}</strong> per head, safely within the contractual budget ceiling of <strong>SAR {budgetCapSAR.toFixed(2)}</strong>. Project <em>Aramco Marjan</em> has an elevated dinner CPH driven by premium protein selections, while <em>MBS Modular</em> and <em>Tanajib Gas</em> run with healthy margins of +5.3% and +4.9% above plan. All 125,100 billed portions match the SAP VF01 accounting document with zero SAR discrepancy.
        </p>
      </div>
    </div>
  );
}
