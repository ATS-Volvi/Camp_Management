import { useState } from "react";
import { useCateringStock } from "@/hooks/useCatering";
import { useCamps } from "@/hooks/useInventory";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, RefreshCw } from "lucide-react";
import BatchPrepScaler from "@/components/catering/BatchPrepScaler";

export default function BatchPrepScalerPage() {
  const { data: camps = [] } = useCamps();
  const [selectedCampId, setSelectedCampId] = useState<string>("");
  const effectiveCampId = selectedCampId || camps[0]?.id || "";

  const { data: stock = [], isLoading, refetch } = useCateringStock(effectiveCampId || undefined);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent p-5 rounded-2xl border border-orange-500/20 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20">
              <ChefHat size={22} />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Chef's Batch Prep Scaler & Stock Readiness
            </h1>
            <Badge className="bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30 text-[10px] font-mono">
              PRODUCTION SIMULATOR
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Simulate recipe batch sizes for 25 to 5,000+ pax. Check immediate warehouse coverage, pinpoint ingredient deficits, calculate cost-per-head, and export kitchen prep sheets.
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

      {/* Main Scaler Engine */}
      <BatchPrepScaler campId={effectiveCampId} stock={stock} />
    </div>
  );
}
