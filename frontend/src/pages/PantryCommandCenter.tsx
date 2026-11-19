import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  calculatePantrySimulation,
  INITIAL_WHAT_IF_STATE,
  WhatIfState,
  ComputedIngredientStatus,
} from "@/data/pantryCommandData";
import PantrySkyline3D from "@/components/catering/PantrySkyline3D";
import PantrySkyline2D from "@/components/catering/PantrySkyline2D";
import DishHealthRings from "@/components/catering/DishHealthRings";
import PantrySmartBuyList from "@/components/catering/PantrySmartBuyList";
import IngredientDetailCard from "@/components/catering/IngredientDetailCard";
import {
  ShoppingCart, AlertTriangle, CheckCircle2, Play, Pause, RotateCcw,
  SlidersHorizontal, Calendar, Sparkles, ArrowLeft, Users, Moon, Truck,
  ShieldCheck, Clock, BarChart3, Box, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

export default function PantryCommandCenter() {
  const navigate = useNavigate();

  // 1. Interactive States
  const [daysAhead, setDaysAhead] = useState<number>(0);
  const [whatIfs, setWhatIfs] = useState<WhatIfState>(INITIAL_WHAT_IF_STATE);
  const [viewMode, setViewMode] = useState<"3D" | "2D">("3D");
  const [selectedIngredient, setSelectedIngredient] = useState<ComputedIngredientStatus | null>(null);

  // 2. Demo Mode Guided Tour State
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  // Compute live simulation based on daysAhead and whatIfs
  const simulation = useMemo(() => {
    return calculatePantrySimulation(daysAhead, whatIfs);
  }, [daysAhead, whatIfs]);

  // Keep selected ingredient data up to date when simulation recalculates
  useEffect(() => {
    if (selectedIngredient) {
      const refreshed = simulation.ingredients.find(
        (i) => i.item.id === selectedIngredient.item.id
      );
      if (refreshed) setSelectedIngredient(refreshed);
    }
  }, [simulation, selectedIngredient]);

  // Layman-friendly Demo Mode Steps
  const demoCaptions = [
    {
      title: "Step 1: Welcome to the Pantry Command Center",
      text: "This dashboard shows your camp's food stock measured in simple 'Days of Food Remaining'. Towers taller than the line have enough food.",
      action: () => {
        setDaysAhead(0);
        setWhatIfs(INITIAL_WHAT_IF_STATE);
        setViewMode("3D");
      },
    },
    {
      title: "Step 2: The Safety Line (5 Days)",
      text: "Any item that falls below the orange safety line pulses in RED (Cooking Oil, Onions, Eggs). This tells camp managers to buy them today.",
      action: () => {
        const oil = simulation.ingredients.find((i) => i.item.id === "cooking_oil");
        if (oil) setSelectedIngredient(oil);
      },
    },
    {
      title: "Step 3: Fast-Forward 4 Days",
      text: "Drag the slider to see what food remains after 4 days. Basmati Rice and Fresh Chicken now dip below the safety line.",
      action: () => {
        setDaysAhead(4);
      },
    },
    {
      title: "Step 4: Simulating a 3-Day Supplier Delay",
      text: "What if the delivery truck is delayed? Toggling this adds 3 extra safety days, showing you need to order earlier to protect meals.",
      action: () => {
        setWhatIfs((prev) => ({ ...prev, delayDelivery3Days: true }));
      },
    },
    {
      title: "Step 5: How Menu Dishes are Impacted",
      text: "Scroll to see upcoming dishes. Chicken Dum Biryani and Shakshuka are marked RED because essential ingredients have run out.",
      action: () => {},
    },
    {
      title: "Step 6: One-Click Purchase Order",
      text: "All items that need buying are automatically grouped by supplier. Click 'Send to Purchase' to dispatch the order instantly.",
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
      {/* 1. Dynamic Reports Signature Navy Command Ribbon */}
      <div className="bg-[#0c2340] text-white rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/mess-catering")}
              className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10 px-2 gap-1 mr-1"
            >
              <ArrowLeft size={13} /> Back
            </Button>
            <SlidersHorizontal size={20} className="text-[#fe932c]" />
            <h1 className="text-xl font-bold tracking-tight">Pantry Command Center</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fe932c]/20 text-[#fe932c] border border-[#fe932c]/30">
              <Sparkles size={10} /> Food Stock Intelligence
            </span>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Tracks food stock in simple <strong>Days of Supply</strong> against safety limits. Visual 3D towers show what is safe, low, or needs urgent buying.
          </p>
        </div>

        {/* Global Toolbar Commands */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 3D / 2D Studio Toggle (Matching Dynamic Reports 3D button) */}
          <Button
            size="sm"
            onClick={() => setViewMode(viewMode === "3D" ? "2D" : "3D")}
            className={`h-8 text-xs font-semibold gap-1.5 transition-all shadow-xs ${
              viewMode === "3D"
                ? "bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold border border-sky-300 ring-2 ring-sky-400/30"
                : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
            }`}
            title="Toggle between 3D Towers and 2D Bar View"
          >
            <Box size={13} className={viewMode === "3D" ? "text-slate-950" : "text-sky-400"} />
            <span>{viewMode === "3D" ? "← Switch to 2D View" : "Switch to 3D View"}</span>
          </Button>

          {/* Guided Demo Tour Button */}
          {isDemoMode ? (
            <Button
              size="sm"
              onClick={stopDemo}
              className="h-8 text-xs font-semibold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              <Pause size={13} />
              <span>Stop Tour</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={startDemo}
              className="h-8 text-xs font-semibold gap-1.5 bg-[#fe932c] hover:bg-[#e68222] text-slate-950 font-bold shadow-xs"
            >
              <Play size={13} />
              <span>Guided Demo Tour (3 Min)</span>
            </Button>
          )}
        </div>
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

      {/* 4. Visualizer Area: 3D Skyline (or 2D) + Side Drawer Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className={selectedIngredient ? "lg:col-span-8" : "lg:col-span-12"}>
          {viewMode === "3D" ? (
            <PantrySkyline3D
              ingredients={simulation.ingredients}
              onSelectIngredient={(ing) => setSelectedIngredient(ing)}
              selectedIngredientId={selectedIngredient?.item.id}
            />
          ) : (
            <PantrySkyline2D
              ingredients={simulation.ingredients}
              onSelectIngredient={(ing) => setSelectedIngredient(ing)}
              selectedIngredientId={selectedIngredient?.item.id}
            />
          )}
        </div>

        {/* Selected Tower Side Card */}
        {selectedIngredient && (
          <div className="lg:col-span-4">
            <IngredientDetailCard
              ingredient={selectedIngredient}
              onClose={() => setSelectedIngredient(null)}
            />
          </div>
        )}
      </div>

      {/* 5. Upcoming Menu Dish Health Cards */}
      <DishHealthRings
        dishes={simulation.dishes}
        onSelectIngredient={(ing) => {
          setSelectedIngredient(ing);
          setViewMode("3D");
        }}
      />

      {/* 6. Smart Buy List Panel */}
      <PantrySmartBuyList
        supplierGroups={simulation.supplierGroups}
        totalSAR={simulation.kpis.estimatedPurchaseValueSAR}
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
