import { useNavigate } from "react-router-dom";
import {
  Building2,
  UtensilsCrossed,
  ChefHat,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Users,
  Sparkles,
} from "lucide-react";
import campImage from "@/assets/camp-3d.jpg";

export default function CampHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted overflow-hidden">
      {/* Header */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Launchpad
        </button>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Camp-365</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Choose a division to continue into its dedicated workspace
            </p>
          </div>
        </div>
      </div>

      {/* Hero Dual Division + 3D View */}
      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-6 pb-12 lg:grid-cols-[minmax(0,480px)_1fr]">
        {/* Left Side: Division Launchpad Card */}
        <div className="relative z-10 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Operational Divisions
          </div>

          {/* 1. Camp Management Tile */}
          <button
            onClick={() => navigate("/camps")}
            className="group w-full rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-background/80 to-transparent p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/60 hover:shadow-md"
          >
            <div className="flex items-start gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Camp Management
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                    ACCOMMODATION
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Workforce rooms, beds, check-in / out, inmate stays, facility repair & asset tracking.
                </p>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
                  <span>Open Division</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          {/* 2. Catering Division Tile */}
          <button
            onClick={() => navigate("/catering/pantry-command-center")}
            className="group w-full rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-background/80 to-transparent p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/60 hover:shadow-md"
          >
            <div className="flex items-start gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 via-[#fe932c] to-orange-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <ChefHat className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Catering Division
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                    CATERING-365
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  52+ recipes, pantry digital twin, production planning, meal entitlements & Catering Copilot.
                </p>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mt-2">
                  <span>Open Division</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          {/* Quick Direct Links Grid */}
          <div className="pt-2 border-t border-border/50">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              Quick Navigation
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => navigate("/dashboard")}
                className="group flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 p-2.5 text-left text-xs font-medium text-foreground hover:bg-muted hover:border-primary/40 transition-colors"
              >
                <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Dashboard</span>
              </button>
              <button
                onClick={() => navigate("/check-in-out")}
                className="group flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 p-2.5 text-left text-xs font-medium text-foreground hover:bg-muted hover:border-primary/40 transition-colors"
              >
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Check-In / Out</span>
              </button>
              <button
                onClick={() => navigate("/catering/pantry-command-center")}
                className="group flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 p-2.5 text-left text-xs font-medium text-foreground hover:bg-muted hover:border-primary/40 transition-colors"
              >
                <UtensilsCrossed className="h-4 w-4 text-[#fe932c] shrink-0" />
                <span className="truncate">Pantry Center</span>
              </button>
              <button
                onClick={() => navigate("/ai-reports")}
                className="group flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 p-2.5 text-left text-xs font-medium text-foreground hover:bg-muted hover:border-primary/40 transition-colors"
              >
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">AI Reports</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: The Classic Signature 3D View of the Camp */}
        <div className="relative">
          <img
            src={campImage}
            alt="3D view of the camp"
            width={1536}
            height={1024}
            className="w-full rounded-3xl mix-blend-multiply shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
