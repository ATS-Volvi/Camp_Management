import { useState, useMemo } from "react";
import {
  Users, Utensils, ChefHat, AlertTriangle, CheckCircle2,
  TrendingUp, Download, Sparkles, Scale, DollarSign,
  ArrowRight, ShieldCheck, Flame, Plus, X, Layers
} from "lucide-react";
import { DISH_RECIPES, RecipeIngredient } from "@/data/dishRecipes";
import { matchesDishIngredient } from "@/pages/MessCatering";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface BatchPrepScalerProps {
  campId?: string;
  stock?: any[];
  onOpenStoreIssue?: (items: { ingredientId: string; name: string; requiredQty: number; unit: string }[]) => void;
}

export default function BatchPrepScaler({ campId, stock = [], onOpenStoreIssue }: BatchPrepScalerProps) {
  const { toast } = useToast();

  const [paxCount, setPaxCount] = useState<number>(500);
  const [selectedDishes, setSelectedDishes] = useState<string[]>(["chicken biryani"]);
  const [dishSearch, setDishSearch] = useState<string>("");

  // Map stock by ingredient name (normalized)
  const stockByName = useMemo(() => {
    const map: Record<string, { balance: number; unit: string; id: string; unit_cost: number }> = {};
    (stock || []).forEach((s: any) => {
      const name = s.ingredients?.name?.toLowerCase().trim();
      if (name) {
        map[name] = {
          balance: Number(s.balance ?? 0),
          unit: s.ingredients?.unit || "kg",
          id: s.ingredient_id,
          unit_cost: Number(s.ingredients?.unit_cost || 0),
        };
      }
    });
    return map;
  }, [stock]);

  // List of all dishes from recipes
  const allDishes = useMemo(() => {
    return Object.keys(DISH_RECIPES)
      .map(key => ({
        id: key,
        name: key.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        ingredientsCount: DISH_RECIPES[key]?.length || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Filtered dishes for quick picker
  const filteredDishes = useMemo(() => {
    if (!dishSearch) return allDishes;
    return allDishes.filter(d => d.name.toLowerCase().includes(dishSearch.toLowerCase()));
  }, [allDishes, dishSearch]);

  // Consolidate ingredient requirements across all selected dishes
  const aggregatedIngredients = useMemo(() => {
    const agg: Record<string, {
      name: string;
      unit: string;
      totalRequired: number;
      dishes: string[];
      stockAvailable: number;
      ingredientId?: string;
      unitCost: number;
    }> = {};

    selectedDishes.forEach(dishKey => {
      const recipe = DISH_RECIPES[dishKey.toLowerCase()] || [];
      const dishTitle = dishKey.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

      recipe.forEach((ing: RecipeIngredient) => {
        const normIng = ing.name.toLowerCase().trim();

        // Find matching stock item using smart fuzzy matcher
        let matchedStockItem: any = null;
        for (const s of stock || []) {
          if (matchesDishIngredient(s.ingredients?.name, ing.name)) {
            matchedStockItem = {
              balance: Number(s.balance ?? 0),
              unit: s.ingredients?.unit || ing.unit,
              id: s.ingredient_id,
              unit_cost: Number(s.ingredients?.unit_cost || 0),
            };
            break;
          }
        }

        const requiredForDish = ing.qty_per_person * paxCount;

        if (!agg[normIng]) {
          agg[normIng] = {
            name: ing.name,
            unit: ing.unit,
            totalRequired: requiredForDish,
            dishes: [dishTitle],
            stockAvailable: matchedStockItem?.balance ?? 0,
            ingredientId: matchedStockItem?.id,
            unitCost: matchedStockItem?.unit_cost ?? 0,
          };
        } else {
          agg[normIng].totalRequired += requiredForDish;
          if (!agg[normIng].dishes.includes(dishTitle)) {
            agg[normIng].dishes.push(dishTitle);
          }
        }
      });
    });

    return Object.values(agg).sort((a, b) => {
      // Sort shortage items first
      const aDeficit = a.totalRequired - a.stockAvailable;
      const bDeficit = b.totalRequired - b.stockAvailable;
      return bDeficit - aDeficit;
    });
  }, [selectedDishes, paxCount, stock]);

  // Overall batch feasibility summary
  const summary = useMemo(() => {
    let totalItems = aggregatedIngredients.length;
    let readyItems = 0;
    let partialItems = 0;
    let criticalItems = 0;
    let totalBatchCost = 0;

    aggregatedIngredients.forEach(item => {
      totalBatchCost += item.totalRequired * item.unitCost;
      if (item.stockAvailable >= item.totalRequired) {
        readyItems++;
      } else if (item.stockAvailable > 0) {
        partialItems++;
      } else {
        criticalItems++;
      }
    });

    const isFullyCovered = totalItems > 0 && readyItems === totalItems;
    const costPerPax = paxCount > 0 ? totalBatchCost / paxCount : 0;

    return {
      totalItems,
      readyItems,
      partialItems,
      criticalItems,
      totalBatchCost,
      costPerPax,
      isFullyCovered,
    };
  }, [aggregatedIngredients, paxCount]);

  const toggleDish = (dishId: string) => {
    setSelectedDishes(prev =>
      prev.includes(dishId)
        ? prev.filter(d => d !== dishId)
        : [...prev, dishId]
    );
  };

  const handleExportPrepSheet = () => {
    const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    let text = `========================================================\n`;
    text += `       CHEF'S BATCH PREPARATION & STORE REQUISITION     \n`;
    text += `========================================================\n`;
    text += `Date: ${dateStr}\n`;
    text += `Headcount (Pax): ${paxCount} diners\n`;
    text += `Dishes Selected:\n`;
    selectedDishes.forEach((d, idx) => {
      text += `  ${idx + 1}. ${d.toUpperCase()}\n`;
    });
    text += `\nEstimated Batch Cost: SAR ${summary.totalBatchCost.toFixed(2)} (${summary.costPerPax.toFixed(2)} SAR/pax)\n`;
    text += `--------------------------------------------------------\n`;
    text += `INGREDIENTS REQUIRED:\n`;
    text += `--------------------------------------------------------\n`;
    aggregatedIngredients.forEach(item => {
      const deficit = item.totalRequired - item.stockAvailable;
      const statusStr = deficit <= 0 ? "[READY]" : `[SHORTAGE: Need +${deficit.toFixed(1)} ${item.unit}]`;
      text += `- ${item.name.padEnd(25)} : ${item.totalRequired.toFixed(2)} ${item.unit.padEnd(6)} | Stock: ${item.stockAvailable.toFixed(1)} ${item.unit.padEnd(6)} | ${statusStr}\n`;
    });
    text += `========================================================\n`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Batch-Prep-${paxCount}Pax-${dateStr.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Kitchen Prep Sheet Downloaded",
      description: `Downloaded batch sheet for ${paxCount} pax.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-br from-[#fe932c] to-amber-600 text-white shadow-xs">
                <ChefHat className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Chef's Batch Prep & Headcount Scaler
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                    Live Feasibility
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Simulate raw ingredient batching, live warehouse stock coverage, and total meal preparation cost in real time.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-card border border-border/80 text-center shadow-xs">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Estimated Cost</span>
              <span className="text-lg font-mono font-bold text-foreground">
                {summary.totalBatchCost.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">SAR</span>
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-card border border-border/80 text-center shadow-xs">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Cost / Pax</span>
              <span className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {summary.costPerPax.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">SAR</span>
              </span>
            </div>
          </div>
        </div>

        {/* Headcount Interactive Scaler Slider */}
        <div className="mt-6 pt-5 border-t border-border/60">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#fe932c]" />
              Diner Headcount (Pax):
              <span className="text-base font-mono font-black text-foreground ml-1.5 px-2 py-0.5 rounded-lg bg-background border border-border">
                {paxCount.toLocaleString()} pax
              </span>
            </label>
            <div className="flex items-center gap-1.5">
              {[100, 250, 500, 1000, 2500, 5000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPaxCount(val)}
                  className={`text-[10px] font-mono px-2 py-1 rounded-md transition-all font-semibold ${
                    paxCount === val
                      ? "bg-[#fe932c] text-white shadow-xs"
                      : "bg-background border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Range Bar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPaxCount(prev => Math.max(25, prev - 25))}
              className="h-8 w-8 rounded-lg bg-card border border-border text-foreground font-bold hover:bg-muted text-sm flex items-center justify-center shrink-0 shadow-2xs"
              title="-25 pax"
            >
              -
            </button>
            <input
              type="range"
              min="25"
              max="5000"
              step="25"
              value={paxCount}
              onChange={e => setPaxCount(parseInt(e.target.value) || 25)}
              className="w-full h-3 bg-muted rounded-lg appearance-none cursor-pointer accent-[#fe932c]"
            />
            <button
              type="button"
              onClick={() => setPaxCount(prev => Math.min(10000, prev + 25))}
              className="h-8 w-8 rounded-lg bg-card border border-border text-foreground font-bold hover:bg-muted text-sm flex items-center justify-center shrink-0 shadow-2xs"
              title="+25 pax"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Dish Selector Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Utensils className="h-4 w-4 text-[#fe932c]" />
                Select Dishes for Batch Preparation ({selectedDishes.length} selected)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click any dish to add or remove it from the consolidated batch scaler.
              </p>
            </div>
            <div className="w-full sm:w-60">
              <input
                type="text"
                placeholder="Search from 52 recipes..."
                value={dishSearch}
                onChange={e => setDishSearch(e.target.value)}
                className="w-full text-xs border rounded-lg px-3 py-1.5 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
            {filteredDishes.map(dish => {
              const isSelected = selectedDishes.includes(dish.id);
              return (
                <button
                  key={dish.id}
                  onClick={() => toggleDish(dish.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 font-medium ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-2xs"
                      : "bg-muted/50 border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{isSelected ? "✓" : "+"}</span>
                  <span>{dish.name}</span>
                  <span className="text-[10px] text-muted-foreground/70 font-mono">({dish.ingredientsCount})</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stock Readiness Overview Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Raw Ingredient Requirements & Pantry Readiness
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consolidated batch weight needed for {paxCount} diners vs actual stock stored in this camp.
              </p>
            </div>

            {/* Readiness Pills */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 size={12} /> {summary.readyItems} Ready
              </span>
              {summary.partialItems > 0 && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <AlertTriangle size={12} /> {summary.partialItems} Partial
                </span>
              )}
              {summary.criticalItems > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                  <Flame size={12} /> {summary.criticalItems} Deficit
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4 font-semibold">Ingredient</th>
                  <th className="py-2.5 px-3 font-semibold">Included in Dishes</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Required Batch</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Pantry Stock</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-40">Coverage Gauge</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Status / Deficit</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Estimated Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {aggregatedIngredients.map(item => {
                  const coveragePct = item.totalRequired > 0
                    ? Math.min(100, (item.stockAvailable / item.totalRequired) * 100)
                    : 100;
                  const deficit = Math.max(0, item.totalRequired - item.stockAvailable);
                  const isReady = item.stockAvailable >= item.totalRequired;
                  const isCritical = item.stockAvailable <= 0;
                  const estimatedCost = item.totalRequired * item.unitCost;

                  return (
                    <tr key={item.name} className={`hover:bg-muted/40 transition-colors ${!isReady ? "bg-rose-500/5" : ""}`}>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {item.name}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        <div className="flex flex-wrap gap-1">
                          {item.dishes.map(d => (
                            <span key={d} className="px-1.5 py-0.5 rounded bg-muted text-[10px]">
                              {d}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground text-sm">
                        {item.totalRequired.toFixed(2)} <span className="text-[10px] font-normal text-muted-foreground">{item.unit}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        {item.stockAvailable.toFixed(1)} {item.unit}
                      </td>

                      {/* Coverage Progress Gauge */}
                      <td className="py-3 px-3 text-center">
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isReady
                                ? "bg-emerald-500"
                                : isCritical
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${coveragePct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground mt-0.5 block">
                          {coveragePct.toFixed(0)}% available
                        </span>
                      </td>

                      {/* Status / Shortage */}
                      <td className="py-3 px-3 text-right">
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={12} /> Ready in Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <AlertTriangle size={12} /> Short by {deficit.toFixed(1)} {item.unit}
                          </span>
                        )}
                      </td>

                      {/* Estimated Cost */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                        {estimatedCost > 0 ? (
                          <>
                            {estimatedCost.toFixed(2)} <span className="text-[10px] font-normal text-muted-foreground">SAR</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {aggregatedIngredients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      No dishes selected. Please pick at least one dish above to calculate the batch preparation requirements.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Actions Bar */}
          <div className="p-4 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Showing {aggregatedIngredients.length} ingredients consolidated for <strong>{paxCount} diners</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPrepSheet}
                disabled={aggregatedIngredients.length === 0}
                className="text-xs h-9 gap-1.5"
              >
                <Download size={14} /> Download Kitchen Prep Sheet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
