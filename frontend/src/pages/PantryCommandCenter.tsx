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
  Layers, Sliders, Calendar, Sparkles, ArrowLeft, Users, Moon, Truck,
  ShieldCheck, Clock, Eye, BarChart3, Box
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

  // Demo Mode Choreography Steps
  const demoCaptions = [
    {
      title: "Step 1 of 6: Welcome to Pantry Command Center",
      text: "Real-time 3D inventory skyline tracking ingredient stock in 'days of cover' across remote workforce dining facilities.",
      action: () => {
        setDaysAhead(0);
        setWhatIfs(INITIAL_WHAT_IF_STATE);
        setViewMode("3D");
      },
    },
    {
      title: "Step 2 of 6: Translucent Safety Threshold Plane",
      text: "The floating plane marks the 5-day safety threshold. Towers submerged beneath it (Cooking Oil, Onions, Eggs) pulse in red — immediate stockout hazard.",
      action: () => {
        const oil = simulation.ingredients.find((i) => i.item.id === "cooking_oil");
        if (oil) setSelectedIngredient(oil);
      },
    },
    {
      title: "Step 3 of 6: Time Machine Forecast (Day +4)",
      text: "Dragging the date forward animates stock consumption. Notice how Basmati Rice and Fresh Chicken breach threshold by Day +4.",
      action: () => {
        setDaysAhead(4);
      },
    },
    {
      title: "Step 4 of 6: Stress Testing 'Delivery Delayed 3 Days'",
      text: "Activating the delivery delay simulation expands the required safety buffer, instantly flagging 8 ingredients at risk.",
      action: () => {
        setWhatIfs((prev) => ({ ...prev, delayDelivery3Days: true }));
      },
    },
    {
      title: "Step 5 of 6: Dish Impact Analysis",
      text: "Menu items evaluate in real-time. 'Chicken Biryani' and 'Shakshuka' glow red because their critical key ingredients are depleted.",
      action: () => {
        // scroll or highlight dishes
      },
    },
    {
      title: "Step 6 of 6: Smart Buy List & Instant Requisition",
      text: "At-risk ingredients are automatically grouped by supplier. One-click 'Send to Purchase' secures camp catering operations.",
      action: () => {
        // focus smart buy list
      },
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
    }, 7000); // 7 seconds per slide

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

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 md:p-6 space-y-5 max-w-[1700px] mx-auto font-sans selection:bg-cyan-500 selection:text-black">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/mess-catering")}
            className="h-8 text-xs text-slate-400 hover:text-white hover:bg-slate-800 gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Catering
          </Button>

          <div className="h-5 w-[1px] bg-white/10" />

          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <Box className="h-4 w-4" />
              </span>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Pantry Command Center
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 font-mono text-[10px] bg-cyan-500/10">
                  Camp-365 Industrial
                </Badge>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              3D threshold cover monitor & predictive purchase intelligence for 1,000+ worker facilities.
            </p>
          </div>
        </div>

        {/* Action Controls: 3D/2D toggle + Demo Mode */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 3D / 2D Toggle Switch */}
          <div className="p-1 rounded-xl bg-slate-950 border border-white/10 flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setViewMode("3D")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === "3D"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_#06b6d4]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              3D Skyline
            </button>
            <button
              onClick={() => setViewMode("2D")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === "2D"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_#06b6d4]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              2D Charts
            </button>
          </div>

          {/* Guided Tour Demo Button */}
          {isDemoMode ? (
            <Button
              onClick={stopDemo}
              size="sm"
              className="bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
            >
              <Pause className="h-3.5 w-3.5" />
              Exit Demo Mode
            </Button>
          ) : (
            <Button
              onClick={startDemo}
              size="sm"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              <Play className="h-3.5 w-3.5" />
              Guided Demo Tour
            </Button>
          )}
        </div>
      </div>

      {/* 2. Executive KPI Strip (Control-Room Dark Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Items to Buy Today */}
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-slate-900/80 backdrop-blur-md relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>ITEMS TO BUY TODAY</span>
            <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-400 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              {simulation.kpis.itemsToBuyToday}
            </span>
            <span className="text-xs text-rose-300 font-mono">below threshold</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Immediate reorder required to avert stockout
          </p>
        </div>

        {/* KPI 2: Dishes At Risk */}
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-slate-900/80 backdrop-blur-md relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>DISHES AT RISK (THIS WEEK)</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
              {simulation.kpis.dishesAtRiskThisWeek}
            </span>
            <span className="text-xs text-amber-300 font-mono">of 10 planned</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Menu items missing key safety ingredient buffer
          </p>
        </div>

        {/* KPI 3: Reorder Estimate SAR */}
        <div className="p-4 rounded-2xl border border-cyan-500/30 bg-slate-900/80 backdrop-blur-md relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>EST. REORDER VALUE</span>
            <ShoppingCart className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-300 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
              SAR {simulation.kpis.estimatedPurchaseValueSAR.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Consolidated PO across {simulation.supplierGroups.length} vendors
          </p>
        </div>

        {/* KPI 4: Stockouts Avoided */}
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-slate-900/80 backdrop-blur-md relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>STOCKOUTS AVOIDED</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
              {simulation.kpis.stockoutsAvoidedThisMonth}
            </span>
            <span className="text-xs text-emerald-300 font-mono">this month</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Aramco SLA dining uptime 100% maintained
          </p>
        </div>
      </div>

      {/* 3. What-If Scenario Toggles & Time Machine Slider */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl">
        {/* Left: What-If Chips (5 Cols) */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              What-If Stress Simulation:
            </span>
            {(whatIfs.extraWorkers200 || whatIfs.ramadanMode || whatIfs.delayDelivery3Days) && (
              <button
                onClick={() => setWhatIfs(INITIAL_WHAT_IF_STATE)}
                className="text-[10px] text-cyan-400 hover:underline font-mono"
              >
                Reset Scenarios
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {/* Chip 1: +200 Workers */}
            <button
              onClick={() =>
                setWhatIfs((prev) => ({ ...prev, extraWorkers200: !prev.extraWorkers200 }))
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 border ${
                whatIfs.extraWorkers200
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold"
                  : "bg-slate-950/60 text-slate-400 border-white/10 hover:border-white/20"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              +200 Workers (+20% Burn)
            </button>

            {/* Chip 2: Ramadan Mode */}
            <button
              onClick={() =>
                setWhatIfs((prev) => ({ ...prev, ramadanMode: !prev.ramadanMode }))
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 border ${
                whatIfs.ramadanMode
                  ? "bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] font-bold"
                  : "bg-slate-950/60 text-slate-400 border-white/10 hover:border-white/20"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              🌙 Ramadan Mode
            </button>

            {/* Chip 3: Delivery Delayed 3 Days */}
            <button
              onClick={() =>
                setWhatIfs((prev) => ({
                  ...prev,
                  delayDelivery3Days: !prev.delayDelivery3Days,
                }))
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 border ${
                whatIfs.delayDelivery3Days
                  ? "bg-rose-500/20 text-rose-300 border-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.3)] font-bold"
                  : "bg-slate-950/60 text-slate-400 border-white/10 hover:border-white/20"
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              🚚 Delivery Delayed 3 Days
            </button>
          </div>
        </div>

        {/* Right: Time Machine Date Slider (7 Cols) */}
        <div className="lg:col-span-7 space-y-2 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-4 pt-3 lg:pt-0">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              Time Machine Forecast Timeline:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold">
                {daysAhead === 0 ? "Today (Live)" : `Day +${daysAhead} (${formattedForecastDate})`}
              </span>
              {daysAhead > 0 && (
                <button
                  onClick={() => setDaysAhead(0)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  Reset to Today
                </button>
              )}
            </div>
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

          <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1">
            <span>Today (Live)</span>
            <span>+3 Days</span>
            <span>+7 Days (Week 1)</span>
            <span>+10 Days</span>
            <span>+14 Days (Week 2)</span>
          </div>
        </div>
      </div>

      {/* 4. Hero Visualizer Area: 3D Skyline (or 2D) + Interactive Side Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Visualizer (8 or 12 Cols) */}
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

        {/* Selected Tower Side Card (4 Cols if opened) */}
        {selectedIngredient && (
          <div className="lg:col-span-4">
            <IngredientDetailCard
              ingredient={selectedIngredient}
              onClose={() => setSelectedIngredient(null)}
            />
          </div>
        )}
      </div>

      {/* 5. Upcoming Menu Dish Health Rings */}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[700px] p-4 rounded-2xl bg-slate-900/95 border-2 border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.5)] backdrop-blur-2xl animate-in slide-in-from-bottom-6">
          <div className="flex items-center justify-between pb-1 border-b border-white/10 text-xs font-mono">
            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              {demoCaptions[demoStep]?.title}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDemoStep((p) => Math.max(0, p - 1))}
                disabled={demoStep === 0}
                className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 disabled:opacity-40"
              >
                &larr; Prev
              </button>
              <button
                onClick={() => setDemoStep((p) => Math.min(demoCaptions.length - 1, p + 1))}
                disabled={demoStep === demoCaptions.length - 1}
                className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 disabled:opacity-40"
              >
                Next &rarr;
              </button>
              <button
                onClick={stopDemo}
                className="px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 text-[10px] font-bold"
              >
                Exit
              </button>
            </div>
          </div>

          <p className="text-sm font-medium text-white mt-2 leading-relaxed">
            {demoCaptions[demoStep]?.text}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-300"
              style={{ width: `${((demoStep + 1) / demoCaptions.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
