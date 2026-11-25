import { useState } from "react";
import { useCateringStock } from "@/hooks/useCatering";
import { useCamps } from "@/hooks/useInventory";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Recycle, RefreshCw, ChefHat, Layers } from "lucide-react";
import DailyProductionWasteLogger from "@/components/catering/DailyProductionWasteLogger";

export default function ProductionWastePage() {
  const { data: camps = [] } = useCamps();
  const [selectedCampId, setSelectedCampId] = useState<string>("");
  const effectiveCampId = selectedCampId || camps[0]?.id || "";

  const { data: stock = [], isLoading, refetch } = useCateringStock(effectiveCampId || undefined);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent p-5 rounded-2xl border border-emerald-500/20 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Recycle size={22} />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              End-of-Day Production & Food Waste Log
            </h1>
            <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
              YIELD RECONCILIATION
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Input cooked dish portions and leftover amounts. The system decomposes portions into raw ingredient quantities, decrements warehouse inventory, and generates real-time financial waste metrics.
          </p>
        </div>

        {/* Camp Selector & Refresh */}
        <div className="flex items-center gap-2">
          {camps.length > 0 && (
            <Select value={effectiveCampId} onValueChange={setSelectedCampId}>
              <SelectTrigger className="w-[190px] bg-card text-xs font-semibold">
                <SelectValue placeholder="Select Kitchen Camp" />
              </SelectTrigger>
              <SelectContent>
                {camps.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Logger */}
      <DailyProductionWasteLogger
        campId={effectiveCampId}
        camps={camps}
        stock={stock}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
