import { useState, useMemo } from "react";
import {
  UtensilsCrossed, Recycle, ChefHat, CheckCircle2, AlertTriangle,
  Plus, Trash2, ArrowRight, DollarSign, Scale, Layers, Download,
  TrendingDown, TrendingUp, Sparkles, ShieldAlert, Calendar, Users,
  SlidersHorizontal, Check, Edit2, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DISH_RECIPES, RecipeIngredient } from "@/data/dishRecipes";
import { matchesDishIngredient } from "@/pages/MessCatering";
import { format } from "date-fns";

export interface ProductionEntry {
  id: string;
  dishKey: string;
  dishName: string;
  cookedPax: number;
  wastedPax: number;
  wasteReason: string;
  customIngredients: RecipeIngredient[];
  isCustomizingRecipe: boolean;
}

interface DailyProductionWasteLoggerProps {
  campId: string;
  camps: any[];
  stock: any[];
  mealTypes?: string[];
  onSuccess?: () => void;
}

const WASTE_REASONS = [
  "Over-prepared / Excess unserved",
  "Cold holding time expired (HACCP)",
  "Buffet display leftover",
  "Plate waste / Return from mess hall",
  "Kitchen burn / Spoilage during cook",
  "Donated / Staff mess allocation",
];

export default function DailyProductionWasteLogger({
  campId,
  camps = [],
  stock = [],
  mealTypes = ["Breakfast", "Lunch", "Dinner"],
  onSuccess,
}: DailyProductionWasteLoggerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCamp, setSelectedCamp] = useState<string>(campId || camps[0]?.id || "");
  const [selectedMeal, setSelectedMeal] = useState<string>(mealTypes[1] || "Lunch");
  const [logDate, setLogDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isPosting, setIsPosting] = useState<boolean>(false);

  // Safety switch to prevent double deduction
  const [deductFromStock, setDeductFromStock] = useState<boolean>(true);

  // Helper to deep clone recipe ingredients for a dish
  const getRecipeClone = (key: string): RecipeIngredient[] => {
    const raw = DISH_RECIPES[key.toLowerCase()] || [];
    return raw.map(ri => ({ ...ri }));
  };

  // Initial dishes: e.g. Chicken Biryani
  const [entries, setEntries] = useState<ProductionEntry[]>([
    {
      id: "1",
      dishKey: "chicken biryani",
      dishName: "Chicken Biryani",
      cookedPax: 500,
      wastedPax: 25,
      wasteReason: "Over-prepared / Excess unserved",
      customIngredients: getRecipeClone("chicken biryani"),
      isCustomizingRecipe: false,
    },
  ]);

  // List of all dishes in recipe catalog
  const dishCatalog = useMemo(() => {
    return Object.keys(DISH_RECIPES).map(key => ({
      key,
      name: key.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      ingredientCount: DISH_RECIPES[key]?.length || 0,
    }));
  }, []);

  // Map stock by name for quick ingredient resolution
  const stockByName = useMemo(() => {
    const map: Record<string, any> = {};
    stock.forEach((s: any) => {
      const name = s.ingredients?.name?.toLowerCase().trim();
      if (name) map[name] = s;
    });
    return map;
  }, [stock]);

  // Resolve best matching ingredient from stock / master
  const resolveIngredient = (recipeIngName: string) => {
    const norm = recipeIngName.toLowerCase().trim();
    if (stockByName[norm]) return stockByName[norm];
    const found = stock.find((s: any) =>
      matchesDishIngredient(s.ingredients?.name, recipeIngName)
    );
    if (found) return found;
    return null;
  };

  // Add dish row
  const handleAddDish = (dishKey: string = "dal tadka") => {
    const item = dishCatalog.find(d => d.key === dishKey);
    const newEntry: ProductionEntry = {
      id: String(Date.now() + Math.random()),
      dishKey,
      dishName: item?.name || dishKey,
      cookedPax: 300,
      wastedPax: 0,
      wasteReason: WASTE_REASONS[0],
      customIngredients: getRecipeClone(dishKey),
      isCustomizingRecipe: false,
    };
    setEntries(prev => [...prev, newEntry]);
  };

  const handleRemoveDish = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateEntry = (id: string, field: keyof ProductionEntry, value: any) => {
    setEntries(prev =>
      prev.map(e => {
        if (e.id !== id) return e;
        if (field === "dishKey") {
          const item = dishCatalog.find(d => d.key === value);
          return {
            ...e,
            dishKey: value,
            dishName: item?.name || value,
            customIngredients: getRecipeClone(value),
          };
        }
        return { ...e, [field]: value };
      })
    );
  };

  // Recipe customization handlers for a single dish entry
  const handleToggleCustomize = (entryId: string) => {
    setEntries(prev =>
      prev.map(e => (e.id === entryId ? { ...e, isCustomizingRecipe: !e.isCustomizingRecipe } : e))
    );
  };

  const handleUpdateIngredientQty = (entryId: string, ingIdx: number, newQty: number) => {
    setEntries(prev =>
      prev.map(e => {
        if (e.id !== entryId) return e;
        const updated = [...e.customIngredients];
        if (updated[ingIdx]) {
          updated[ingIdx] = { ...updated[ingIdx], qty_per_person: Math.max(0, newQty) };
        }
        return { ...e, customIngredients: updated };
      })
    );
  };

  const handleAddIngredientToDish = (entryId: string) => {
    setEntries(prev =>
      prev.map(e => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          customIngredients: [
            ...e.customIngredients,
            { name: "Cooking Oil", unit: "litres", qty_per_person: 0.01 },
          ],
        };
      })
    );
  };

  const handleRemoveIngredientFromDish = (entryId: string, ingIdx: number) => {
    setEntries(prev =>
      prev.map(e => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          customIngredients: e.customIngredients.filter((_, idx) => idx !== ingIdx),
        };
      })
    );
  };

  // Decompose all entries into aggregated raw ingredients using their customized recipe portions!
  const decomposedIngredients = useMemo(() => {
    const map: Record<
      string,
      {
        recipeName: string;
        unit: string;
        cookedQty: number;
        wastedQty: number;
        consumedQty: number;
        unitCost: number;
        wasteCost: number;
        cookedCost: number;
        stockRow: any | null;
        ingredientId: string | null;
      }
    > = {};

    entries.forEach(entry => {
      const recipe = entry.customIngredients || DISH_RECIPES[entry.dishKey.toLowerCase()] || [];
      const cooked = Math.max(0, entry.cookedPax || 0);
      const wasted = Math.min(cooked, Math.max(0, entry.wastedPax || 0));
      const consumed = Math.max(0, cooked - wasted);

      recipe.forEach(ri => {
        const key = ri.name.toLowerCase().trim();
        const stockRow = resolveIngredient(ri.name);
        const unitCost = Number(stockRow?.ingredients?.unit_cost || 0);

        const cookedPart = ri.qty_per_person * cooked;
        const wastedPart = ri.qty_per_person * wasted;
        const consumedPart = ri.qty_per_person * consumed;

        if (!map[key]) {
          map[key] = {
            recipeName: ri.name,
            unit: ri.unit,
            cookedQty: 0,
            wastedQty: 0,
            consumedQty: 0,
            unitCost,
            wasteCost: 0,
            cookedCost: 0,
            stockRow,
            ingredientId: stockRow?.ingredient_id || stockRow?.ingredients?.id || null,
          };
        }

        map[key].cookedQty += cookedPart;
        map[key].wastedQty += wastedPart;
        map[key].consumedQty += consumedPart;
        map[key].cookedCost += cookedPart * unitCost;
        map[key].wasteCost += wastedPart * unitCost;
      });
    });

    return Object.values(map).sort((a, b) => b.cookedCost - a.cookedCost);
  }, [entries, stockByName]);

  // Overall KPIs
  const metrics = useMemo(() => {
    let totalCookedCost = 0;
    let totalWasteCost = 0;
    let totalCookedPortions = 0;
    let totalWastedPortions = 0;

    entries.forEach(e => {
      totalCookedPortions += e.cookedPax;
      totalWastedPortions += e.wastedPax;
    });

    decomposedIngredients.forEach(item => {
      totalCookedCost += item.cookedCost;
      totalWasteCost += item.wasteCost;
    });

    const netConsumedCost = Math.max(0, totalCookedCost - totalWasteCost);
    const yieldPercentage =
      totalCookedCost > 0
        ? ((totalCookedCost - totalWasteCost) / totalCookedCost) * 100
        : 100;

    return {
      totalCookedPortions,
      totalWastedPortions,
      netConsumedPortions: totalCookedPortions - totalWastedPortions,
      totalCookedCost,
      totalWasteCost,
      netConsumedCost,
      yieldPercentage,
    };
  }, [entries, decomposedIngredients]);

  // Submit and Post to Database
  const handlePostProduction = async () => {
    if (!selectedCamp) {
      toast({ title: "Camp required", description: "Please select the kitchen camp.", variant: "destructive" });
      return;
    }
    if (entries.length === 0) {
      toast({ title: "No dishes logged", description: "Add at least one dish produced in this shift.", variant: "destructive" });
      return;
    }

    setIsPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      let stockDeductedCount = 0;
      let wasteLoggedCount = 0;

      // 1. Process each decomposed ingredient for Stock Out (ONLY IF deductFromStock IS TRUE!)
      if (deductFromStock) {
        for (const item of decomposedIngredients) {
          if (!item.ingredientId) continue;

          const { data: existing } = await supabase
            .from("catering_stock")
            .select("id, stock_out, opening_stock, stock_in")
            .eq("camp_id", selectedCamp)
            .eq("ingredient_id", item.ingredientId)
            .maybeSingle();

          if (existing) {
            const newStockOut = (Number(existing.stock_out) || 0) + item.cookedQty;
            const { error: stockErr } = await supabase
              .from("catering_stock")
              .update({
                stock_out: newStockOut,
                updated_at: now,
              })
              .eq("id", existing.id);
            if (stockErr) throw stockErr;
            stockDeductedCount++;
          } else {
            const { error: insErr } = await supabase.from("catering_stock").insert({
              camp_id: selectedCamp,
              ingredient_id: item.ingredientId,
              opening_stock: 0,
              stock_in: 0,
              stock_out: item.cookedQty,
              min_level: 5,
              updated_at: now,
            });
            if (insErr) throw insErr;
            stockDeductedCount++;
          }
        }
      }

      // 2. Always Log Food Wastage rows if portions were wasted
      for (const item of decomposedIngredients) {
        if (item.wastedQty > 0 && item.ingredientId) {
          const relevantReason =
            entries.find(e => e.wastedPax > 0)?.wasteReason || "Portion Leftover / Unserved";

          const { error: wasteErr } = await supabase.from("food_wastage").insert({
            camp_id: selectedCamp,
            wastage_date: logDate,
            meal_type: selectedMeal,
            ingredient_id: item.ingredientId,
            wasted_qty: +item.wastedQty.toFixed(3),
            unit_cost: item.unitCost,
            reason: relevantReason,
            recorded_by: user?.id,
          });
          if (wasteErr) throw wasteErr;
          wasteLoggedCount++;
        }
      }

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ["catering-stock"] });
      await queryClient.invalidateQueries({ queryKey: ["catering-stock-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["food-wastage"] });
      await queryClient.invalidateQueries({ queryKey: ["grocery-items"] });

      const stockMsg = deductFromStock
        ? `Deducted ingredients for ${metrics.totalCookedPortions} portions from warehouse.`
        : `Warehouse stock untouched (prevented double deduction).`;

      toast({
        title: "Shift Production & Waste Reconciled! 🎉",
        description: `${stockMsg} Logged ${wasteLoggedCount} waste line items (SAR ${metrics.totalWasteCost.toFixed(2)} loss).`,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        title: "Error posting production",
        description: err.message || "Failed to update database",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
                <ChefHat size={22} />
              </span>
              <h2 className="text-xl font-black tracking-tight text-foreground">
                End-of-Day Production & Portion Waste Reconciliation
              </h2>
              <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                REVERSE-BOM YIELD ENGINE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Cooks enter <strong>Dishes & Portions cooked</strong> plus leftovers. You can inspect and customize <strong>exact ingredient portions per person</strong> for any dish.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-card border border-border shadow-2xs text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Shift Yield Score
              </span>
              <span
                className={`text-lg font-black tracking-tight ${
                  metrics.yieldPercentage >= 95
                    ? "text-emerald-500"
                    : metrics.yieldPercentage >= 88
                    ? "text-amber-500"
                    : "text-rose-500"
                }`}
              >
                {metrics.yieldPercentage.toFixed(1)}% Consumed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Controls Header */}
      <Card className="border-border/70 shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Kitchen Camp Location</Label>
              <Select value={selectedCamp} onValueChange={setSelectedCamp}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue placeholder="Select Camp..." />
                </SelectTrigger>
                <SelectContent>
                  {camps.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Shift Meal Type</Label>
              <Select value={selectedMeal} onValueChange={setSelectedMeal}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mealTypes.map(m => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Service Date</Label>
              <Input
                type="date"
                value={logDate}
                onChange={e => setLogDate(e.target.value)}
                className="h-9 text-xs mt-1 font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Dish Portions Input Section with Recipe Customizer */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between border-b border-border/50">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-primary" />
              1. Dishes Cooked & Portions Leftover
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter batch quantities. Click <strong>"Customize Recipe Portions"</strong> on any dish to tweak single-portion ingredient weights.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddDish()}
            className="text-xs gap-1.5 h-8 font-semibold"
          >
            <Plus size={14} /> Add Another Dish
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {entries.map((entry, idx) => {
            const netPax = Math.max(0, entry.cookedPax - entry.wastedPax);
            const lossPct = entry.cookedPax > 0 ? (entry.wastedPax / entry.cookedPax) * 100 : 0;

            return (
              <div
                key={entry.id}
                className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-all space-y-3 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Dish Selector */}
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-bold text-foreground">
                        Dish #{idx + 1}
                      </Label>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {entry.customIngredients.length} Ingredients in BOM
                      </Badge>
                    </div>
                    <Select
                      value={entry.dishKey}
                      onValueChange={v => handleUpdateEntry(entry.id, "dishKey", v)}
                    >
                      <SelectTrigger className="h-9 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {dishCatalog.map(d => (
                          <SelectItem key={d.key} value={d.key}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cooked Portions */}
                  <div className="w-full sm:w-[140px]">
                    <Label className="text-xs font-semibold text-foreground">
                      Portions Cooked
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        min="0"
                        value={entry.cookedPax}
                        onChange={e =>
                          handleUpdateEntry(entry.id, "cookedPax", Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="h-9 text-xs font-mono font-bold"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                        pax
                      </span>
                    </div>
                  </div>

                  {/* Wasted / Leftover Portions */}
                  <div className="w-full sm:w-[140px]">
                    <Label className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <Recycle size={12} /> Leftover / Waste
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        min="0"
                        max={entry.cookedPax}
                        value={entry.wastedPax}
                        onChange={e =>
                          handleUpdateEntry(entry.id, "wastedPax", Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="h-9 text-xs font-mono font-bold text-rose-600 border-rose-300 dark:border-rose-900/50"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-rose-500 font-mono">
                        pax
                      </span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  {entries.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDish(entry.id)}
                      className="text-muted-foreground hover:text-rose-600 h-9 px-2 self-end"
                    >
                      <Trash2 size={15} />
                    </Button>
                  )}
                </div>

                {/* Waste Reason, Net Badge, & Recipe Customizer Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                      Waste Reason:
                    </span>
                    <Select
                      value={entry.wasteReason}
                      onValueChange={v => handleUpdateEntry(entry.id, "wasteReason", v)}
                      disabled={entry.wastedPax === 0}
                    >
                      <SelectTrigger className="h-7 text-[11px] max-w-xs bg-muted/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WASTE_REASONS.map(r => (
                          <SelectItem key={r} value={r} className="text-xs">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Customize Recipe Portion Trigger */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleCustomize(entry.id)}
                      className={`text-xs font-semibold gap-1.5 h-7 px-2.5 ${
                        entry.isCustomizingRecipe
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <SlidersHorizontal size={13} />
                      {entry.isCustomizingRecipe ? "Close Recipe Editor" : "Customize Portion Quantities"}
                    </Button>

                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                      Net: <strong>{netPax} pax</strong>
                    </Badge>
                    {entry.wastedPax > 0 && (
                      <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[11px]">
                        Waste: <strong>{lossPct.toFixed(1)}%</strong>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* INLINE RECIPE PORTION EDITOR (Editable ingredients per single pax!) */}
                {entry.isCustomizingRecipe && (
                  <div className="mt-3 p-3.5 bg-muted/40 rounded-xl border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Edit2 size={13} className="text-primary" />
                        Single-Portion Recipe Formulation for <span className="underline">{entry.dishName}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddIngredientToDish(entry.id)}
                        className="text-[11px] h-6 px-2 text-primary hover:bg-primary/10 gap-1"
                      >
                        <Plus size={11} /> Add Extra Ingredient
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {entry.customIngredients.map((ri, ingIdx) => (
                        <div
                          key={ingIdx}
                          className="p-2.5 rounded-lg bg-card border border-border/80 flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-foreground block truncate">
                              {ri.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Standard: {ri.unit} / pax
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={ri.qty_per_person}
                              onChange={e =>
                                handleUpdateIngredientQty(entry.id, ingIdx, parseFloat(e.target.value) || 0)
                              }
                              className="w-16 h-7 text-xs font-mono font-bold text-right px-1.5"
                            />
                            <span className="text-[10px] font-mono text-muted-foreground w-8">
                              {ri.unit}
                            </span>
                            {entry.customIngredients.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveIngredientFromDish(entry.id, ingIdx)}
                                className="text-muted-foreground hover:text-rose-500 p-0.5"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 2. Decomposed Ingredients Breakdown (Live BOM Reverse-Mapping) */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader className="pb-3 pt-4 px-5 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Scale size={16} className="text-primary" />
                2. Live Recipe BOM Decomposition & Warehouse Stock Impact
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Exact ingredient quantities mapped from portion counts. Cooked amounts will be deducted from warehouse inventory.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {decomposedIngredients.length} Ingredients Affected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-[11px]">
                  <TableHead className="w-[200px]">Ingredient Name</TableHead>
                  <TableHead className="text-right">Total Cooked Qty (Stock Out)</TableHead>
                  <TableHead className="text-right">Wasted Qty</TableHead>
                  <TableHead className="text-right">Useful Consumed Qty</TableHead>
                  <TableHead className="text-right">Rate (SAR)</TableHead>
                  <TableHead className="text-right">Waste Loss (SAR)</TableHead>
                  <TableHead className="text-right">Warehouse Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decomposedIngredients.map((item, i) => {
                  const currentBal = Number(item.stockRow?.balance ?? 0);
                  const projectedBal = currentBal - item.cookedQty;

                  return (
                    <TableRow key={i} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-semibold text-foreground">
                        {item.recipeName}
                        {item.stockRow?.ingredients?.category && (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            {item.stockRow.ingredients.category}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {item.cookedQty.toFixed(2)} {item.unit}
                      </TableCell>

                      <TableCell className="text-right font-mono font-semibold text-rose-500">
                        {item.wastedQty > 0 ? `${item.wastedQty.toFixed(2)} ${item.unit}` : "—"}
                      </TableCell>

                      <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {item.consumedQty.toFixed(2)} {item.unit}
                      </TableCell>

                      <TableCell className="text-right font-mono text-muted-foreground">
                        {item.unitCost > 0 ? `SAR ${item.unitCost.toFixed(2)}` : "—"}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-rose-600">
                        {item.wasteCost > 0 ? `SAR ${item.wasteCost.toFixed(2)}` : "—"}
                      </TableCell>

                      <TableCell className="text-right font-mono text-[11px]">
                        {item.stockRow ? (
                          <span>
                            {currentBal.toFixed(1)} ➔{" "}
                            <span className={projectedBal < 0 ? "text-rose-600 font-bold" : "text-foreground font-semibold"}>
                              {projectedBal.toFixed(1)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-amber-500 text-[10px]">Unlinked to Stock</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 3. Financial Loss & Reconciliation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Portions</p>
              <p className="text-xl font-black tracking-tight mt-1 text-foreground">
                {metrics.totalCookedPortions} pax
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {metrics.netConsumedPortions} eaten • {metrics.totalWastedPortions} wasted
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Users size={19} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Production Value</p>
              <p className="text-xl font-black tracking-tight mt-1 text-foreground">
                SAR {metrics.totalCookedCost.toFixed(2)}
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                SAR {metrics.netConsumedCost.toFixed(2)} useful
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <DollarSign size={19} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Food Waste Loss</p>
              <p className={`text-xl font-black tracking-tight mt-1 ${metrics.totalWasteCost > 0 ? "text-rose-500" : "text-muted-foreground"}`}>
                SAR {metrics.totalWasteCost.toFixed(2)}
              </p>
              <p className="text-[10px] text-rose-500 font-semibold mt-0.5">
                {metrics.totalCookedCost > 0 ? ((metrics.totalWasteCost / metrics.totalCookedCost) * 100).toFixed(1) : "0"}% financial loss
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
              <TrendingDown size={19} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Kitchen Yield Score</p>
              <p className="text-xl font-black tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">
                {metrics.yieldPercentage.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Target: &gt; 95.0%
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Sparkles size={19} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DOUBLE DEDUCTION SAFETY SWITCH */}
      <div className="p-4 rounded-xl border border-border/80 bg-card/80 space-y-2 shadow-2xs">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="deduct-stock-toggle"
            checked={deductFromStock}
            onChange={e => setDeductFromStock(e.target.checked)}
            className="h-4 w-4 mt-0.5 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <div className="flex-1 cursor-pointer" onClick={() => setDeductFromStock(!deductFromStock)}>
            <label htmlFor="deduct-stock-toggle" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-2">
              <span>Automatically Deduct Raw Ingredients from Warehouse Physical Stock</span>
              {deductFromStock ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  ✓ Active (Deducts Stock)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                  ⚠️ Safe Mode (Waste & Yield Only)
                </Badge>
              )}
            </label>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              {deductFromStock ? (
                <span>
                  <strong>Standard Mode:</strong> Increments <code className="text-primary font-mono font-bold">stock_out</code> in the warehouse balance for this shift.
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  <strong>Prevent Double Deduction:</strong> Warehouse stock will <strong>NOT</strong> be touched. Use this if your storekeeper already deducted the raw items during morning store requisition.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation & Post Action Bar */}
      <div className="p-4 rounded-xl border border-border bg-card/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <div className="text-xs text-muted-foreground">
            {deductFromStock
              ? "Confirming will update warehouse stock_out and insert food waste audit rows."
              : "Confirming will log food waste and yield analytics without modifying warehouse balance."}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            size="lg"
            onClick={handlePostProduction}
            disabled={isPosting || entries.length === 0}
            className="gap-2 font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20"
          >
            {isPosting ? "Reconciling Warehouse & Posting..." : "Confirm & Post Shift Production"}
          </Button>
        </div>
      </div>
    </div>
  );
}
