import { useNavigate } from "react-router-dom";
import {
  BedDouble,
  Building2,
  UtensilsCrossed,
  ChefHat,
  ArrowLeft,
  ArrowRight,
  Users,
  Wrench,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Compass,
  Package,
  Layers,
  SlidersHorizontal,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react";
import campLogo from "@/assets/camp-365-logo.png";
import campImage from "@/assets/camp-3d.jpg";

export default function CampHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100/60 dark:from-slate-950 dark:via-background dark:to-slate-900/60 text-foreground font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>folkslogic Suite</span>
            </button>
            <span className="text-border">/</span>
            <div className="flex items-center gap-2">
              <img src={campLogo} alt="Camp-365 Logo" className="w-7 h-7 rounded shadow-2xs" />
              <span className="font-extrabold text-sm tracking-tight text-foreground">Camp-365</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Operations Hub
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Title & Introduction */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Layers className="h-3.5 w-3.5" />
            <span>Dual-Division Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Camp-365 Launchpad
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Choose an operational division to open its dedicated workspace, customized sidebar controls, and domain-tuned AI Copilot.
          </p>
        </div>

        {/* Dual Division Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          {/* ================================================================= */}
          {/* DIVISION 1: CAMP MANAGEMENT (ACCOMMODATION & FACILITIES)           */}
          {/* ================================================================= */}
          <div className="group relative rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-card via-card to-emerald-500/[0.03] p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between">
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-8 right-8 h-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />

            <div className="space-y-6">
              {/* Header with Icon & Badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-300">
                  <Building2 className="h-7 w-7" />
                </div>
                <span className="text-[11px] font-mono font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                  Workforce & Facilities
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Camp Management
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Workforce housing administration, room and bed inventory allocation, employee stay tracking, facility maintenance, and contractor billing reconciliations.
                </p>
              </div>

              {/* Key Features Bullet Points */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center gap-2.5 text-xs font-medium text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Room & bed allocation with bulk check-in / check-out</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Inmate rosters, visitor passes & key card locker records</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Repair tickets, preventive asset maintenance & staff KPIs</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Camp Copilot AI for occupancy forecasts and tariff audits</span>
                </div>
              </div>
            </div>

            {/* Actions & Quick Shortcuts */}
            <div className="pt-6 mt-6 border-t border-border/60 space-y-3">
              <button
                onClick={() => navigate("/camps")}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md hover:shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all duration-200"
              >
                <span>Enter Camp Management</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Quick Jump Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Quick:</span>
                <button
                  onClick={() => navigate("/camps")}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-muted/70 hover:bg-muted text-foreground border border-border/60 transition-colors"
                >
                  Camps List
                </button>
                <button
                  onClick={() => navigate("/check-in-out")}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-muted/70 hover:bg-muted text-foreground border border-border/60 transition-colors"
                >
                  Check-In/Out
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-muted/70 hover:bg-muted text-foreground border border-border/60 transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate("/inmates-report")}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-muted/70 hover:bg-muted text-foreground border border-border/60 transition-colors"
                >
                  Inmates Report
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* DIVISION 2: CATERING DIVISION (CATERING-365 INDUSTRIAL SUITE)      */}
          {/* ================================================================= */}
          <div className="group relative rounded-3xl border border-amber-500/25 bg-gradient-to-b from-card via-card to-amber-500/[0.03] p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between">
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-8 right-8 h-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 opacity-80" />

            <div className="space-y-6">
              {/* Header with Icon & Badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 via-[#fe932c] to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform duration-300">
                  <ChefHat className="h-7 w-7" />
                </div>
                <span className="text-[11px] font-mono font-bold tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">
                  Industrial Dining & Kitchen
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Catering Division
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  52+ recipe database, gram-accurate BOM scaled production batches, pantry digital twin with 5-day DoC stockout protection, smart meal turnstiles, and HACCP compliance.
                </p>
              </div>

              {/* Key Features Bullet Points */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center gap-2.5 text-xs font-medium text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Pantry Command Center with 5-Day stockout safety buffers</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Gram-level recipe portion scaling & shift batch entry</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Smart meal turnstiles, department lunches & food cancellations</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Dedicated Catering Copilot AI with diabetic & leave reduction RAG</span>
                </div>
              </div>
            </div>

            {/* Actions & Quick Shortcuts */}
            <div className="pt-6 mt-6 border-t border-border/60 space-y-3">
              <button
                onClick={() => navigate("/catering/pantry-command-center")}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-[#fe932c] to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-sm shadow-md hover:shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all duration-200"
              >
                <span>Enter Catering Division</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Quick Jump Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Quick:</span>
                <button
                  onClick={() => navigate("/catering/pantry-command-center")}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-muted/70 hover:bg-muted text-foreground border border-border/60 transition-colors"
                >
                  Pantry Command
                </button>
                <button
                  onClick={() => navigate("/mess-catering")}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-muted/70 hover:bg-muted text-foreground border border-border/60 transition-colors"
                >
                  Dishes & BOM
                </button>
                <button
                  onClick={() => navigate("/catering/enterprise-hub")}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-muted/70 hover:bg-muted text-foreground border border-border/60 transition-colors"
                >
                  6-Pillar Hub
                </button>
                <button
                  onClick={() => navigate("/catering/reports")}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-muted/70 hover:bg-muted text-foreground border border-border/60 transition-colors"
                >
                  Catering BI
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cross-Division Shared Intelligence Bar */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Cross-Division Operational Intelligence</div>
              <div className="text-xs text-muted-foreground">
                Run cross-cutting AI analytics, 3D dynamic reports, or download bottomline financial reconciliations.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/ai-reports")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>AI Reports</span>
            </button>
            <button
              onClick={() => navigate("/dynamic-reports")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              <span>3D Reports</span>
            </button>
            <button
              onClick={() => navigate("/bottomline")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>Bottomline Statement</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
