import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Users, Recycle, Clock, Sparkles } from "lucide-react";
import DiningHallRushMonitor from "@/components/catering/DiningHallRushMonitor";
import FoodWasteHeatmap from "@/components/catering/FoodWasteHeatmap";

export default function CateringInsightsPage() {
  const location = useLocation();

  // Determine active tab based on path or state
  const isWaste = location.pathname.includes("waste");
  const [activeTab, setActiveTab] = useState<"rush" | "waste">(isWaste ? "waste" : "rush");

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Top Segmented Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border/60">
          <button
            onClick={() => setActiveTab("rush")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "rush"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4 text-primary" />
            <span>Dining Hall Rush & Density</span>
          </button>

          <button
            onClick={() => setActiveTab("waste")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "waste"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Recycle className="h-4 w-4 text-destructive" />
            <span>Food Waste & Cost Leaks</span>
          </button>
        </div>

        <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Real-time catering operations intelligence</span>
        </div>
      </div>

      {/* Render the Active Tab */}
      {activeTab === "rush" && <DiningHallRushMonitor />}
      {activeTab === "waste" && <FoodWasteHeatmap />}
    </div>
  );
}
