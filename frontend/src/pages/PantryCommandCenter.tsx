import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCampOccupancy } from "@/hooks/useCatering";
import { useMenuDishes } from "@/hooks/useMenuDishes";
import CateringNavHeader from "@/components/catering/CateringNavHeader";
import {
  calculatePantrySimulation,
  INITIAL_WHAT_IF_STATE,
  WhatIfState,
  ComputedIngredientStatus,
  buildCatalogUpcomingDishes,
} from "@/data/pantryCommandData";
import PantrySkyline2D from "@/components/catering/PantrySkyline2D";
import DishHealthRings from "@/components/catering/DishHealthRings";
import PantrySmartBuyList from "@/components/catering/PantrySmartBuyList";
import IngredientDetailCard from "@/components/catering/IngredientDetailCard";
import {
  ShoppingCart, AlertTriangle, CheckCircle2, Play, Pause, RotateCcw,
  SlidersHorizontal, Calendar, Sparkles, ArrowLeft, Users, Moon, Truck,
  ShieldCheck, Clock, Layers, HelpCircle, Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

export default function PantryCommandCenter() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Camps Query & Filter State
  const { data: camps = [] } = useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const [selectedCampId, setSelectedCampId] = useState<string>(() => {
    return searchParams.get("campId") || "";
  });

  // Keep search params in sync
  const handleCampChange = (newCampId: string) => {
    setSelectedCampId(newCampId);
    if (newCampId) {
      setSearchParams({ campId: newCampId });
    } else {
      setSearchParams({});
    }
  };

  const selectedCamp = useMemo(() => {
    return camps.find((c: any) => c.id === selectedCampId) || null;
  }, [camps, selectedCampId]);

  // Camp occupancy for portion scaling
  const { data: campOccupancy } = useCampOccupancy(selectedCampId || null);
  const effectiveHeadcount = campOccupancy || (selectedCampId ? 850 : 1250);

  // 2. Configured Dishes from Supabase
  const { data: dbDishes = [] } = useMenuDishes();

  // Generate dynamic upcoming dishes merging configured DB dishes and standard recipes
  const dynamicDishes = useMemo(() => {
    return buildCatalogUpcomingDishes(dbDishes, effectiveHeadcount, selectedCamp?.name);
  }, [dbDishes, effectiveHeadcount, selectedCamp]);

  // 3. Interactive States
  const [daysAhead, setDaysAhead] = useState<number>(0);
  const [whatIfs, setWhatIfs] = useState<WhatIfState>(INITIAL_WHAT_IF_STATE);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [selectedDishFilter, setSelectedDishFilter] = useState<string>("all");

  // 4. Demo Mode Guided Tour State
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  // Compute live simulation based on daysAhead, whatIfs, dynamicDishes and camp occupancy
  const simulation = useMemo(() => {
    return calculatePantrySimulation(daysAhead, whatIfs, dynamicDishes, effectiveHeadcount);
  }, [daysAhead, whatIfs, dynamicDishes, effectiveHeadcount]);

  // Derived selected ingredient (auto-updates cleanly with simulation changes)
  const selectedIngredient = useMemo(() => {
    if (!selectedIngredientId) return null;
    return simulation.ingredients.find((i) => i.item.id === selectedIngredientId) ?? null;
  }, [simulation, selectedIngredientId]);

  // Layman-friendly Demo Mode Steps
  const demoCaptions = [
    {
      title: "Step 1: Welcome to the Pantry Command Center",
      text: "This dashboard displays camp food inventory in simple 'Days of Supply Remaining'. Any item below the 5-day safety line is flagged for purchase.",
      action: () => {
        setDaysAhead(0);
        setWhatIfs(INITIAL_WHAT_IF_STATE);
      },
    },
    {
      title: "Step 2: The Safety Line (5 Days)",
      text: "Items falling below the orange safety line are flagged with red 'Buy Today' badges (Cooking Oil, Onions, Eggs). Click any card to inspect suppliers.",
      action: () => {
        setSelectedIngredientId("cooking_oil");
      },
    },
    {
      title: "Step 3: Fast-Forward 4 Days",
      text: "Fast forward 4 days using the timeline. As kitchen meals are cooked, Basmati Rice and Fresh Chicken also fall below the safety line.",
      action: () => {
        setDaysAhead(4);
      },
    },
    {
      title: "Step 4: Simulating a 3-Day Supplier Delay",
      text: "What if the delivery truck is delayed? Toggling this adds 3 extra safety buffer days, immediately adjusting required order volumes.",
      action: () => {
        setWhatIfs((prev) => ({ ...prev, delayDelivery3Days: true }));
      },
    },
    {
      title: "Step 5: How Menu Dishes are Impacted",
      text: "Upcoming menu items update automatically. Dishes like Chicken Dum Biryani and Shakshuka are marked RED because ingredients have run low.",
      action: () => {},
    },
    {
      title: "Step 6: One-Click Purchase Order",
      text: "All items that need buying are automatically grouped by approved camp supplier. Click 'Send to Purchase' to dispatch the purchase order.",
      action: () => {},
    },
  ];

  // Auto-play demo mode timer
  useEffect(() => {
    if (!isDemoMode) return;
    demoCaptions[demoStep]?.action();

    const timer = setTimeout(() => {
      if (demoStep < demoCaptions.length - 1) {
        setDemoStep((prev) => prev + 1);
      } else {
        setIsDemoMode(false);
        setDemoStep(0);
      }
    }, 7000);

    return () => clearTimeout(timer);
  }, [isDemoMode, demoStep]);

  const startDemo = () => {
    setDemoStep(0);
    setIsDemoMode(true);
  };

  const stopDemo = () => {
    setIsDemoMode(false);
    setDemoStep(0);
    setDaysAhead(0);
    setWhatIfs(INITIAL_WHAT_IF_STATE);
  };

  // Formatted date string for Time Machine
  const forecastDate = new Date();
  forecastDate.setDate(forecastDate.getDate() + daysAhead);
  const formattedForecastDate = forecastDate.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  // Calculate average days of food remaining across all items
  const avgDaysLeft = useMemo(() => {
    const sum = simulation.ingredients.reduce((acc, i) => acc + i.daysOfCoverLeft, 0);
    return Number((sum / simulation.ingredients.length).toFixed(1));
  }, [simulation]);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto p-4 md:p-6 text-foreground">
      {/* 1. Global Unified Catering Suite Ribbon */}
      <CateringNavHeader
        activeTab="pantry"
        campId={selectedCampId}
        camps={camps}
        onCampChange={handleCampChange}
      />

      {/* Guided Tour Banner / Controls */}
      <div className="flex items-center justify-between gap-3 p-2 bg-muted/40 rounded-xl border border-border/60 text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5 pl-2">
          <Sparkles className="h-4 w-4 text-[#fe932c]" />
          <span>Food Inventory Intelligence · Tracks stock in simple <strong>Days of Supply</strong></span>
        </span>

        {isDemoMode ? (
          <Button
            size="sm"
            onClick={stopDemo}
            className="h-7 text-xs font-semibold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <Pause size={12} />
            <span>Stop Tour</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={startDemo}
            className="h-7 text-xs font-semibold gap-1.5 bg-[#fe932c] hover:bg-[#e68222] text-slate-950 font-bold shadow-xs"
          >
            <Play size={12} />
            <span>Guided Demo Tour (3 Min)</span>
          </Button>
        )}
      </div>

      {/* 2. Layman-Friendly KPI Cards (Clean Dynamic Reports Theme) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Needs Buy Today */}
        <div className="p-4 rounded-xl border border-rose-500/30 bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>BUY TODAY</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-600 dark:text-rose-400 font-mono">
              {simulation.kpis.itemsToBuyToday}
            </span>
            <span className="text-xs text-rose-600 font-medium">items low</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Below 5-day safety line: Cooking Oil, Onions, Eggs
          </p>
        </div>

        {/* KPI 2: Dishes Affected */}
        <div className="p-4 rounded-xl border border-amber-500/30 bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>MEALS AT RISK</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {simulation.kpis.dishesAtRiskThisWeek}
            </span>
            <span className="text-xs text-amber-600 font-medium">of 10 planned</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Dishes needing restocked ingredients
          </p>
        </div>

        {/* KPI 3: Reorder Estimate SAR */}
        <div className="p-4 rounded-xl border border-blue-500/30 bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>ESTIMATED REORDER COST</span>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary font-mono">
              SAR {simulation.kpis.estimatedPurchaseValueSAR.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Grouped across {simulation.supplierGroups.length} approved vendors
          </p>
        </div>

        {/* KPI 4: Average Camp Food Supply */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>AVERAGE FOOD SUPPLY</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {avgDaysLeft}
            </span>
            <span className="text-xs text-emerald-600 font-medium">days overall</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Healthy baseline for 1,000+ workers
          </p>
        </div>
      </div>

      {/* 3. Layman-Friendly Time Slider & What-If Controls */}
      <div className="p-4 rounded-xl border border-border/70 bg-card shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Forecast Food Supply Over Time</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a future day to see how much food remains after daily meals are served.
            </p>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Quick Jump:</span>
            {[
              { label: "Today (Live)", days: 0 },
              { label: "In 3 Days", days: 3 },
              { label: "In 7 Days (1 Wk)", days: 7 },
              { label: "In 14 Days (2 Wks)", days: 14 },
            ].map((preset) => (
              <button
                key={preset.days}
                onClick={() => setDaysAhead(preset.days)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  daysAhead === preset.days
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Slider */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Timeline:{" "}
              <span className="text-primary font-bold">
                {daysAhead === 0 ? "Today" : `Day +${daysAhead} (${formattedForecastDate})`}
              </span>
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {daysAhead === 0 ? "Current physical pantry inventory" : `${daysAhead} days of kitchen consumption deducted`}
            </span>
          </div>
          <div className="pt-2 px-1">
            <Slider
              min={0}
              max={14}
              step={1}
              value={[daysAhead]}
              onValueChange={(val) => setDaysAhead(val[0])}
              className="cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
            <span>Today</span>
            <span>Day +3</span>
            <span>Day +7 (Week 1)</span>
            <span>Day +10</span>
            <span>Day +14 (Week 2)</span>
          </div>
        </div>

        {/* What-If Scenarios (Plain English) */}
        <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#fe932c]" />
            What-If Scenarios (Test Operational Changes):
          </span>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                setWhatIfs((prev) => ({ ...prev, extraWorkers200: !prev.extraWorkers200 }))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                whatIfs.extraWorkers200
                  ? "bg-primary/15 text-primary border-primary font-bold shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              +200 Workers (+20% More Food)
            </button>

            <button
              onClick={() =>
                setWhatIfs((prev) => ({ ...prev, ramadanMode: !prev.ramadanMode }))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                whatIfs.ramadanMode
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500 font-bold shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              🌙 Ramadan Meals
            </button>

            <button
              onClick={() =>
                setWhatIfs((prev) => ({
                  ...prev,
                  delayDelivery3Days: !prev.delayDelivery3Days,
                }))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                whatIfs.delayDelivery3Days
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500 font-bold shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              🚚 Delivery Delayed 3 Days
            </button>
          </div>
        </div>
      </div>

      {/* 4. Visualizer Area: 2D Inventory Monitor + Side Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className={selectedIngredient ? "lg:col-span-8" : "lg:col-span-12"}>
          <PantrySkyline2D
            ingredients={simulation.ingredients}
            dishes={simulation.dishes}
            selectedDishFilter={selectedDishFilter}
            onSelectDishFilter={setSelectedDishFilter}
            onSelectIngredient={(ing) => setSelectedIngredientId(ing.item.id)}
            selectedIngredientId={selectedIngredientId ?? undefined}
          />
        </div>

        {/* Selected Item Side Card */}
        {selectedIngredient && (
          <div className="lg:col-span-4">
            <IngredientDetailCard
              ingredient={selectedIngredient}
              onClose={() => setSelectedIngredientId(null)}
            />
          </div>
        )}
      </div>

      {/* 5. Upcoming Menu Dish Health Cards */}
      <DishHealthRings
        dishes={simulation.dishes}
        selectedDishFilter={selectedDishFilter}
        onSelectDishFilter={setSelectedDishFilter}
        onSelectIngredient={(ing) => setSelectedIngredientId(ing.item.id)}
      />

      {/* 6. Smart Buy List Panel */}
      <PantrySmartBuyList
        supplierGroups={simulation.supplierGroups}
        totalSAR={simulation.kpis.estimatedPurchaseValueSAR}
        dishes={simulation.dishes}
        selectedDishFilter={selectedDishFilter}
      />

      {/* 7. Demo Mode Guided Tour Floating Banner (When Active) */}
      {isDemoMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[680px] p-4 rounded-xl bg-[#0c2340] border-2 border-[#fe932c] shadow-2xl text-white animate-in slide-in-from-bottom-6">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/15 text-xs font-semibold">
            <span className="text-[#fe932c] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#fe932c] animate-ping" />
              {demoCaptions[demoStep]?.title}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDemoStep((p) => Math.max(0, p - 1))}
                disabled={demoStep === 0}
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-white disabled:opacity-40"
              >
                &larr; Prev
              </button>
              <button
                onClick={() => setDemoStep((p) => Math.min(demoCaptions.length - 1, p + 1))}
                disabled={demoStep === demoCaptions.length - 1}
                className="px-2.5 py-1 rounded bg-[#fe932c] hover:bg-[#e68222] text-xs font-bold text-slate-950 disabled:opacity-40"
              >
                Next &rarr;
              </button>
              <button
                onClick={stopDemo}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white"
              >
                ✕ Exit Tour
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-100 mt-2 leading-relaxed">
            {demoCaptions[demoStep]?.text}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#fe932c] h-full transition-all duration-300"
              style={{ width: `${((demoStep + 1) / demoCaptions.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
