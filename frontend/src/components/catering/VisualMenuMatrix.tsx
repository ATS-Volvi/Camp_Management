import { useState, useMemo } from "react";
import {
  UtensilsCrossed, Sparkles, Plus, Trash2, Copy, Printer, Calendar,
  Coffee, Sun, Moon, AlertCircle, CheckCircle2, ChevronRight,
  TrendingDown, TrendingUp, Info, Search, Filter, Flame, Drumstick,
  Wheat, HeartPulse, Sliders, RefreshCw, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  calculateDishCost,
  estimateNutrition,
  getCuisineCategory,
  getFullDishCatalog,
  generateBalancedWeeklyMenu,
  CatalogDish
} from "@/lib/catering/menuCosting";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STANDARD_MEALS = ["Breakfast", "Lunch", "Dinner"];
const RAMADAN_MEALS = ["Suhoor", "Iftar"];

const mealIcons: Record<string, any> = {
  Breakfast: Coffee,
  Lunch: Sun,
  Dinner: Moon,
  Suhoor: Moon,
  Iftar: Sun,
  default: UtensilsCrossed
};

interface VisualMenuMatrixProps {
  campId?: string;
  camps: any[];
  mealTypes?: string[];
  onCampChange?: (id: string) => void;
}

export default function VisualMenuMatrix({
  campId: propCampId,
  camps = [],
  mealTypes: propMealTypes,
  onCampChange
}: VisualMenuMatrixProps) {
  const qc = useQueryClient();
  const [selectedCamp, setSelectedCamp] = useState<string>(propCampId || camps[0]?.id || "");
  const [ramadanMode, setRamadanMode] = useState<boolean>(false);
  const [targetDailyBudget, setTargetDailyBudget] = useState<number>(18.0);
  
  // Modals & Panels
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiCuisineFocus, setAiCuisineFocus] = useState<"Balanced" | "South Asian" | "Arabian" | "High Protein">("Balanced");
  const [aiTargetCost, setAiTargetCost] = useState<number>(18.0);

  const [addDishModal, setAddDishModal] = useState(false);
  const [targetSlot, setTargetSlot] = useState<{ day: number; meal: string }>({ day: 0, meal: "Breakfast" });
  const [dishSearch, setDishSearch] = useState("");
  const [dishCuisineFilter, setDishCuisineFilter] = useState("All");

  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [inspectedDish, setInspectedDish] = useState<string | null>(null);
  const [scaleInmates, setScaleInmates] = useState<number>(1000);

  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyFromDay, setCopyFromDay] = useState(0);
  const [copyToDay, setCopyToDay] = useState(1);

  const activeMealTypes = ramadanMode ? RAMADAN_MEALS : (propMealTypes || STANDARD_MEALS);

  // Synchronize camp if passed from parent
  const activeCampId = selectedCamp || propCampId || camps[0]?.id || "";

  // 1. Fetch Weekly Menu from Supabase
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["weekly-menu-config", activeCampId],
    enabled: !!activeCampId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_menu_config" as any)
        .select("*, menu_dishes(id, name, description, meal_type)")
        .eq("camp_id", activeCampId)
        .eq("is_active", true)
        .order("day_of_week")
        .order("meal_type")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // 2. Mutations
  const addDishMutation = useMutation({
    mutationFn: async ({ day, meal, dishName }: { day: number; meal: string; dishName: string }) => {
      const costInfo = calculateDishCost(dishName);
      const { data, error } = await supabase
        .from("weekly_menu_config" as any)
        .insert({
          camp_id: activeCampId,
          day_of_week: day,
          meal_type: meal,
          dish_name: dishName,
          description: `~${costInfo.costPerPerson} SAR/head`,
          sort_order: 1,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-menu-config"] });
      toast({ title: "Dish added to weekly menu" });
      setAddDishModal(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to add dish", description: err.message, variant: "destructive" });
    }
  });

  const deleteDishMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("weekly_menu_config" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-menu-config"] });
      toast({ title: "Dish removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete dish", description: err.message, variant: "destructive" });
    }
  });

  const applyWeeklyScheduleMutation = useMutation({
    mutationFn: async (schedule: any[]) => {
      // 1. Delete existing for this camp
      const { error: delErr } = await supabase
        .from("weekly_menu_config" as any)
        .delete()
        .eq("camp_id", activeCampId);
      if (delErr) throw delErr;

      // 2. Insert new schedule
      const { error: insErr } = await supabase
        .from("weekly_menu_config" as any)
        .insert(schedule);
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-menu-config"] });
      toast({ title: "✨ Weekly Menu Auto-Balanced & Applied!", description: "7-day balanced schedule populated." });
      setAiModalOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "AI Generation Error", description: err.message, variant: "destructive" });
    }
  });

  const copyDayMutation = useMutation({
    mutationFn: async ({ from, to }: { from: number; to: number }) => {
      const sourceItems = menuItems.filter((i) => i.day_of_week === from);
      // Remove destination day
      await supabase.from("weekly_menu_config" as any).delete().eq("camp_id", activeCampId).eq("day_of_week", to);

      if (sourceItems.length > 0) {
        const payload = sourceItems.map((item) => ({
          camp_id: activeCampId,
          day_of_week: to,
          meal_type: item.meal_type,
          dish_name: item.dish_name,
          description: item.description,
          sort_order: item.sort_order,
          is_active: true,
        }));
        const { error } = await supabase.from("weekly_menu_config" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-menu-config"] });
      toast({ title: "Day menu copied successfully" });
      setCopyModalOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Copy Failed", description: err.message, variant: "destructive" });
    }
  });

  // 3. Grid Building & Analytics Computations
  const { weekGrid, dayAnalytics, weeklyAvgCost, weeklyAvgCalories, weeklyAvgProtein, cuisineDistribution } = useMemo(() => {
    const grid: Record<number, Record<string, any[]>> = {};
    const dStats: Record<number, { totalCost: number; calories: number; protein: number; dishesCount: number }> = {};
    const cuisineCounts: Record<string, number> = {};

    for (let d = 0; d < 7; d++) {
      grid[d] = {};
      dStats[d] = { totalCost: 0, calories: 0, protein: 0, dishesCount: 0 };
      activeMealTypes.forEach((m) => {
        grid[d][m] = [];
      });
    }

    let grandCost = 0;
    let grandCalories = 0;
    let grandProtein = 0;
    let daysWithFood = 0;

    menuItems.forEach((item) => {
      const d = item.day_of_week;
      const m = item.meal_type;
      const dishName = item.menu_dishes?.name || item.dish_name || "Custom Dish";

      if (grid[d] && grid[d][m]) {
        const cost = calculateDishCost(dishName);
        const nutrition = estimateNutrition(dishName, m);
        const cuisine = getCuisineCategory(dishName);

        const enriched = {
          ...item,
          displayName: dishName,
          cost: cost.costPerPerson,
          nutrition,
          cuisine,
        };

        grid[d][m].push(enriched);

        dStats[d].totalCost += cost.costPerPerson;
        dStats[d].calories += nutrition.calories;
        dStats[d].protein += nutrition.protein;
        dStats[d].dishesCount += 1;

        cuisineCounts[cuisine.cuisine] = (cuisineCounts[cuisine.cuisine] || 0) + 1;
      }
    });

    for (let d = 0; d < 7; d++) {
      if (dStats[d].dishesCount > 0) {
        grandCost += dStats[d].totalCost;
        grandCalories += dStats[d].calories;
        grandProtein += dStats[d].protein;
        daysWithFood += 1;
      }
    }

    const divisor = daysWithFood || 1;

    return {
      weekGrid: grid,
      dayAnalytics: dStats,
      weeklyAvgCost: Number((grandCost / divisor).toFixed(2)),
      weeklyAvgCalories: Math.round(grandCalories / divisor),
      weeklyAvgProtein: Math.round(grandProtein / divisor),
      cuisineDistribution: cuisineCounts,
    };
  }, [menuItems, activeMealTypes]);

  // Full Catalog for quick add
  const dishCatalog = useMemo(() => getFullDishCatalog(), []);

  const filteredDishes = useMemo(() => {
    return dishCatalog.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(dishSearch.toLowerCase()) ||
        d.description.toLowerCase().includes(dishSearch.toLowerCase());
      const matchesCuisine = dishCuisineFilter === "All" || d.cuisine === dishCuisineFilter;
      return matchesSearch && matchesCuisine;
    });
  }, [dishCatalog, dishSearch, dishCuisineFilter]);

  // Handle AI Auto-generation trigger
  const handleRunAiPlanner = () => {
    const generated = generateBalancedWeeklyMenu({
      targetDailyBudget: aiTargetCost,
      cuisineFocus: aiCuisineFocus,
      mealTypes: activeMealTypes,
      campId: activeCampId,
    });
    applyWeeklyScheduleMutation.mutate(generated);
  };

  // Printable Noticeboard view
  const handlePrint = () => {
    window.print();
  };

  const activeCampName = camps.find((c) => c.id === activeCampId)?.name || "Primary Camp";

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-r from-card to-muted/30">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    Visual Menu Matrix & AI Chef Board
                    <Badge variant="outline" className="font-normal text-xs bg-primary/5 text-primary border-primary/20">
                      Camp 365 Enterprise
                    </Badge>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Plan 7-day menus with live SAR costing per head, Aramco calorie compliance, and instant AI balancing.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Selectors */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                value={activeCampId}
                onValueChange={(val) => {
                  setSelectedCamp(val);
                  onCampChange?.(val);
                }}
              >
                <SelectTrigger className="w-[190px] h-9 text-xs font-medium">
                  <SelectValue placeholder="Select Camp..." />
                </SelectTrigger>
                <SelectContent>
                  {camps.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Ramadan Toggle */}
              <Button
                variant={ramadanMode ? "default" : "outline"}
                size="sm"
                onClick={() => setRamadanMode(!ramadanMode)}
                className="h-9 text-xs gap-1.5"
              >
                <Moon className={`h-3.5 w-3.5 ${ramadanMode ? "text-amber-300" : ""}`} />
                {ramadanMode ? "Ramadan Mode (Suhoor/Iftar)" : "Standard 3-Meals"}
              </Button>

              {/* AI Auto-Balance Action */}
              <Button
                size="sm"
                onClick={() => {
                  setAiTargetCost(targetDailyBudget);
                  setAiModalOpen(true);
                }}
                className="h-9 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-sm gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                ⚡ AI Auto-Fill Week
              </Button>

              {/* Copy Day */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCopyModalOpen(true)}
                className="h-9 text-xs gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Day
              </Button>

              {/* Print Work Order */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-9 text-xs gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Noticeboard
              </Button>
            </div>
          </div>

          {/* 2. Executive KPI Cards (Dynamic Reports style) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border/60">
            {/* KPI 1: Cost per Head */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Avg Daily Cost / Head</span>
                {weeklyAvgCost <= targetDailyBudget ? (
                  <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                    <TrendingDown className="h-3 w-3" /> Under Budget
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                    <TrendingUp className="h-3 w-3" /> Over Budget
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  SAR {weeklyAvgCost.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">/ day</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Target Allowance:</span>
                <span className="font-semibold text-foreground">SAR {targetDailyBudget.toFixed(2)}</span>
              </div>
            </div>

            {/* KPI 2: Calorie Standard */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Aramco Calorie Index</span>
                <Flame className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {weeklyAvgCalories.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">kcal / day</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Standard Target:</span>
                <span className="font-semibold text-foreground">2,800 - 3,200 kcal</span>
              </div>
            </div>

            {/* KPI 3: Daily Protein */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Daily Protein Content</span>
                <Drumstick className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {weeklyAvgProtein}g
                </span>
                <span className="text-xs text-muted-foreground">protein / day</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Recommended:</span>
                <span className="font-semibold text-foreground">&gt; 85g / worker</span>
              </div>
            </div>

            {/* KPI 4: Cultural Diversity Ratio */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Cultural Cuisine Diversity</span>
                <HeartPulse className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <div className="mt-1 space-y-1">
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {Object.entries(cuisineDistribution).slice(0, 4).map(([cuisine, count]) => (
                    <Badge key={cuisine} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                      {cuisine}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Multi-national demographic balance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. The 7-Day Visual Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        {DAYS.map((dayName, dayIdx) => {
          const stats = dayAnalytics[dayIdx] || { totalCost: 0, calories: 0, protein: 0 };
          const isOverBudget = stats.totalCost > targetDailyBudget + 1.0;
          const isWeekend = dayIdx === 5; // Friday is weekend in Saudi Aramco camps

          return (
            <Card
              key={dayName}
              className={`border transition-all duration-200 flex flex-col justify-between ${
                isWeekend
                  ? "bg-amber-500/[0.03] border-amber-500/20 shadow-sm"
                  : "bg-card border-border/70 shadow-sm"
              }`}
            >
              {/* Day Header */}
              <div className="p-3 pb-2 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-foreground">{dayName}</span>
                    {isWeekend && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400">
                        Special
                      </Badge>
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      isOverBudget
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    SAR {stats.totalCost.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{stats.calories} kcal</span>
                  <span>{stats.protein}g protein</span>
                </div>
              </div>

              {/* Meals in Day */}
              <div className="p-2 space-y-2.5 flex-1">
                {activeMealTypes.map((meal) => {
                  const Icon = mealIcons[meal] || UtensilsCrossed;
                  const dishes = weekGrid[dayIdx]?.[meal] || [];

                  return (
                    <div
                      key={meal}
                      className="rounded-lg bg-muted/40 p-2 border border-border/40 hover:border-primary/30 transition-colors"
                    >
                      {/* Meal title bar */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Icon className="h-3 w-3 text-primary" /> {meal}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTargetSlot({ day: dayIdx, meal });
                            setAddDishModal(true);
                          }}
                          className="h-5 w-5 rounded text-primary hover:bg-primary/10"
                          title="Add Dish"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Dishes list */}
                      {dishes.length === 0 ? (
                        <div
                          onClick={() => {
                            setTargetSlot({ day: dayIdx, meal });
                            setAddDishModal(true);
                          }}
                          className="border border-dashed border-border/60 rounded-md py-2 text-center cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <span className="text-[10px] text-muted-foreground/70 flex items-center justify-center gap-1">
                            <Plus className="h-2.5 w-2.5" /> Empty slot
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {dishes.map((dish) => (
                            <div
                              key={dish.id}
                              onClick={() => {
                                setInspectedDish(dish.displayName);
                                setRecipeModalOpen(true);
                              }}
                              className="group relative bg-card rounded-md p-1.5 border border-border/60 hover:shadow-sm hover:border-primary/50 cursor-pointer transition-all"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p className="font-semibold text-xs text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                  {dish.displayName}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDishMutation.mutate(dish.id);
                                  }}
                                  className="h-4 w-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-600 transition-opacity"
                                  title="Delete dish"
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>

                              <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 h-3.5 border ${dish.cuisine.badgeClass}`}
                                >
                                  {dish.cuisine.label}
                                </Badge>
                                <span className="font-bold text-foreground">
                                  SAR {dish.cost.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* 4. DIALOG: AI Weekly Menu Auto-Balancer */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              AI Weekly Menu Auto-Balancer
            </DialogTitle>
            <DialogDescription>
              Automatically synthesize an optimized 7-day multi-cuisine meal rotation tailored to budget and Aramco standards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Target Budget slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Target Daily Budget / Head</Label>
                <span className="text-sm font-bold text-primary">SAR {aiTargetCost.toFixed(2)}</span>
              </div>
              <Slider
                value={[aiTargetCost]}
                min={12}
                max={26}
                step={0.5}
                onValueChange={(val) => setAiTargetCost(val[0])}
              />
              <p className="text-[11px] text-muted-foreground">
                Saudi Aramco contractor baseline: ~SAR 16.00 – 20.00 / inmate / day.
              </p>
            </div>

            {/* Cuisine Emphasis */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Cuisine & Demographic Focus</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "Balanced", label: "Balanced Multi-National", desc: "40% Desi, 30% Arab, 20% Asian, 10% Cont" },
                  { id: "South Asian", label: "South Asian Classic", desc: "Curries, Biryanis, Parotas, Dal Tadka" },
                  { id: "Arabian", label: "Arabian & Khaleeji", desc: "Mandi, Kabsa, Shawarma, Ful Medames" },
                  { id: "High Protein", label: "High Protein / Heavy Labor", desc: "Higher poultry, egg & legume portions" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setAiCuisineFocus(c.id as any)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      aiCuisineFocus === c.id
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border/60 hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <p className="font-semibold">{c.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Rules applied */}
            <div className="rounded-lg bg-muted/60 p-3 space-y-1.5 border border-border/40 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Guaranteed Constraints:
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>0 duplicate main courses on consecutive days.</li>
                <li>Friday features festive feast (Biryani / Mandi special).</li>
                <li>Net daily calories balanced between 2,800 – 3,200 kcal.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAiModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRunAiPlanner}
              disabled={applyWeeklyScheduleMutation.isPending}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            >
              {applyWeeklyScheduleMutation.isPending ? "Generating..." : "Apply AI Weekly Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. DIALOG: Add Dish Palette */}
      <Dialog open={addDishModal} onOpenChange={setAddDishModal}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Add Dish — {DAYS[targetSlot.day]} ({targetSlot.meal})
            </DialogTitle>
            <DialogDescription>
              Choose from standard camp dishes with pre-calculated recipe costs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search recipes (e.g. Biryani, Parota, Mandi)..."
                  value={dishSearch}
                  onChange={(e) => setDishSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <Select value={dishCuisineFilter} onValueChange={setDishCuisineFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Cuisine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Cuisines</SelectItem>
                  <SelectItem value="South Asian">South Asian</SelectItem>
                  <SelectItem value="Arabian & Khaleeji">Arabian</SelectItem>
                  <SelectItem value="Filipino & East Asian">Asian</SelectItem>
                  <SelectItem value="Continental">Continental</SelectItem>
                  <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
              {filteredDishes.map((dish) => (
                <div
                  key={dish.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-border/60 hover:bg-muted/50 hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-foreground">{dish.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {dish.cuisine}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {dish.calories} kcal • {dish.protein}g protein
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-foreground">
                      SAR {dish.cost.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() =>
                        addDishMutation.mutate({
                          day: targetSlot.day,
                          meal: targetSlot.meal,
                          dishName: dish.name,
                        })
                      }
                      className="h-7 text-xs px-2.5"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. DIALOG: Dish Recipe & Batch Kitchen Scaler */}
      <Dialog open={recipeModalOpen} onOpenChange={setRecipeModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          {inspectedDish && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between text-lg pr-4">
                  <span className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5 text-primary" />
                    {inspectedDish}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getCuisineCategory(inspectedDish).label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Chef Recipe Card & Batch Preparation Quantities
                </DialogDescription>
              </DialogHeader>

              {(() => {
                const costBreakdown = calculateDishCost(inspectedDish);
                const nutrition = estimateNutrition(inspectedDish);
                const totalBatchCost = costBreakdown.costPerPerson * scaleInmates;

                return (
                  <div className="space-y-4 py-2">
                    {/* Nutrition & Cost overview */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-muted/60 border border-border/40">
                        <p className="text-[10px] text-muted-foreground">Cost / Person</p>
                        <p className="text-sm font-bold text-primary">SAR {costBreakdown.costPerPerson.toFixed(2)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/60 border border-border/40">
                        <p className="text-[10px] text-muted-foreground">Calories</p>
                        <p className="text-sm font-bold text-foreground">{nutrition.calories} kcal</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/60 border border-border/40">
                        <p className="text-[10px] text-muted-foreground">Protein</p>
                        <p className="text-sm font-bold text-blue-600">{nutrition.protein}g</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/60 border border-border/40">
                        <p className="text-[10px] text-muted-foreground">Carbs</p>
                        <p className="text-sm font-bold text-amber-600">{nutrition.carbs}g</p>
                      </div>
                    </div>

                    {/* Batch Scaler Slider */}
                    <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/70">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">Batch Head Count Scaler:</span>
                        <span className="font-bold text-primary">{scaleInmates.toLocaleString()} Inmates</span>
                      </div>
                      <Slider
                        value={[scaleInmates]}
                        min={50}
                        max={3000}
                        step={50}
                        onValueChange={(val) => setScaleInmates(val[0])}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>50 heads</span>
                        <span>Estimated Total: SAR {totalBatchCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span>3,000 heads</span>
                      </div>
                    </div>

                    {/* Recipe Ingredients Scaled Table */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Standard Ingredient Batch Requisition</Label>
                      <div className="max-h-[200px] overflow-y-auto border border-border/60 rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-muted text-[10px] uppercase text-muted-foreground sticky top-0">
                            <tr>
                              <th className="py-1.5 px-3 text-left">Ingredient</th>
                              <th className="py-1.5 px-3 text-right">Per Person</th>
                              <th className="py-1.5 px-3 text-right">Required Batch</th>
                              <th className="py-1.5 px-3 text-right">Est. Cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {costBreakdown.recipeIngredients.map((ing) => {
                              const batchQty = ing.qtyPerPerson * scaleInmates;
                              const batchCost = batchQty * ing.unitCost;

                              return (
                                <tr key={ing.name} className="hover:bg-muted/30">
                                  <td className="py-1.5 px-3 font-medium text-foreground">{ing.name}</td>
                                  <td className="py-1.5 px-3 text-right text-muted-foreground">
                                    {ing.qtyPerPerson} {ing.unit}
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-bold text-foreground">
                                    {batchQty >= 10 ? Math.round(batchQty) : batchQty.toFixed(1)} {ing.unit}
                                  </td>
                                  <td className="py-1.5 px-3 text-right text-muted-foreground">
                                    SAR {batchCost.toFixed(1)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <DialogFooter>
                <Button size="sm" variant="outline" onClick={() => setRecipeModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. DIALOG: Copy Day */}
      <Dialog open={copyModalOpen} onOpenChange={setCopyModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Copy Day Menu</DialogTitle>
            <DialogDescription>
              Duplicate an entire day's dishes to another day of the week.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-3">
            <div>
              <Label className="text-xs">Copy From</Label>
              <Select value={String(copyFromDay)} onValueChange={(v) => setCopyFromDay(+v)}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Paste Into</Label>
              <Select value={String(copyToDay)} onValueChange={(v) => setCopyToDay(+v)}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCopyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={copyFromDay === copyToDay || copyDayMutation.isPending}
              onClick={() => copyDayMutation.mutate({ from: copyFromDay, to: copyToDay })}
            >
              Copy Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
