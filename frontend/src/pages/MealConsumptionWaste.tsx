import { useState, useMemo } from "react";
import {
  UtensilsCrossed, CheckCircle2, AlertTriangle, ShieldCheck,
  TrendingDown, TrendingUp, Clock, Users, PieChart, Sparkles,
  BarChart3, RefreshCw, Calendar, ArrowRight, Check, X, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  useConsumptionWasteSummary,
  useSaveMealDisposition,
  MealPerformanceItem
} from "@/hooks/useCateringCostControl";

export default function MealConsumptionWaste() {
  const [selectedCampId, setSelectedCampId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Disposition dialog states
  const [dispositionModalOpen, setDispositionModalOpen] = useState(false);
  const [targetMeal, setTargetMeal] = useState<MealPerformanceItem | null>(null);
  const [dispositionStatus, setDispositionStatus] = useState<"retained" | "reused" | "discarded" | "pending">("retained");
  const [discardedQty, setDiscardedQty] = useState<number>(0);
  const [retainedQty, setRetainedQty] = useState<number>(0);
  const [dispositionReason, setDispositionReason] = useState<string>("");
  const [dispositionNotes, setDispositionNotes] = useState<string>("");

  // Detailed session modal
  const [sessionDetailModalOpen, setSessionDetailModalOpen] = useState(false);
  const [inspectedMeal, setInspectedMeal] = useState<MealPerformanceItem | null>(null);

  // 1. Fetch Camps
  const { data: camps = [] } = useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch Consumption & Waste Aggregated Data from Backend
  const { data: summary, isLoading, refetch } = useConsumptionWasteSummary({
    campId: selectedCampId !== "all" ? selectedCampId : undefined,
    date: selectedDate,
  });

  const saveDisposition = useSaveMealDisposition();

  const overview = summary?.dailyOverview || {
    mealsScheduled: 3360,
    mealsPrepared: 3192,
    mealsCollected: 2886,
    uncollectedMeals: 306,
    collectionPercentage: 90.4,
    confirmedDiscarded: 52,
    reusedOrRetained: 184,
    pendingDisposition: 70,
    estimatedValueUncollectedSAR: 1989,
    estimatedConfirmedFoodWasteCostSAR: 338,
  };

  const openDispositionModal = (meal: MealPerformanceItem) => {
    setTargetMeal(meal);
    setDiscardedQty(meal.confirmedDiscarded || 0);
    setRetainedQty(meal.retainedOrReused || Math.max(0, meal.uncollectedQuantity - (meal.confirmedDiscarded || 0)));
    setDispositionStatus(meal.confirmedDiscarded > 0 ? "discarded" : "retained");
    setDispositionReason("Surplus headcount over-prep");
    setDispositionNotes("");
    setDispositionModalOpen(true);
  };

  const handleSaveDisposition = async () => {
    if (!targetMeal) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await saveDisposition.mutateAsync({
        camp_id: selectedCampId || null,
        meal_date: selectedDate,
        meal_type: targetMeal.mealType,
        department: "All",
        uncollected_count: targetMeal.uncollectedQuantity,
        disposition_status: dispositionStatus,
        discarded_qty: dispositionStatus === "discarded" ? discardedQty : 0,
        retained_qty: dispositionStatus !== "discarded" ? retainedQty : 0,
        reason: dispositionReason,
        notes: dispositionNotes,
        recorded_by: user?.email || "Supervisor",
      });
      setDispositionModalOpen(false);
    } catch (err) {
      // handled in hook
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* 1. Global Filter Toolbar */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-r from-card to-muted/20">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Meal Consumption & Waste Intelligence
                  <Badge variant="outline" className="font-semibold text-xs border-primary/20 bg-primary/5 text-primary">
                    Operational Intelligence
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time reconciliation of scheduled meals, actual QR collections, uncollected trays, and confirmed waste disposition.
                </p>
              </div>
            </div>

            {/* Quick Pickers */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Select value={selectedCampId} onValueChange={setSelectedCampId}>
                <SelectTrigger className="w-[180px] h-9 text-xs font-medium">
                  <SelectValue placeholder="All Camps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Camps</SelectItem>
                  {camps.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[140px] h-9 text-xs"
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-9 text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </div>

          {/* 2. Four Primary KPI Cards (Daily Overview) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border/60">
            {/* KPI 1: Meals Scheduled */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>1. Scheduled Meals</span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {overview.mealsScheduled.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">registered</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Based on physical camp occupancy</p>
            </div>

            {/* KPI 2: Meals Prepared */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>2. Prepared Meals</span>
                <UtensilsCrossed className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {overview.mealsPrepared.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">kitchen count</span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                Net after approved food cancellations
              </p>
            </div>

            {/* KPI 3: Meals Collected */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>3. Confirmed Collected</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {overview.mealsCollected.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({overview.collectionPercentage}%)
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Verified QR scans at serving lines</p>
            </div>

            {/* KPI 4: Uncollected Meals */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>4. Uncollected Meals</span>
                <Clock className="h-4 w-4 text-purple-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {overview.uncollectedMeals.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">portions</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-600">
                  Retained: {overview.reusedOrRetained}
                </Badge>
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-rose-500/30 text-rose-600">
                  Waste: {overview.confirmedDiscarded}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Meal-Wise Performance Cards (Breakfast, Lunch, Dinner) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(summary?.mealPerformance || []).map((meal) => {
          const isHighCollection = meal.collectionRatePct >= 90;
          return (
            <Card
              key={meal.mealType}
              className="border-border/60 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="py-3.5 px-4 border-b border-border/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>{meal.mealType}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        isHighCollection
                          ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                          : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                      }`}
                    >
                      {meal.collectionRatePct}% Collected
                    </Badge>
                  </CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setInspectedMeal(meal);
                    setSessionDetailModalOpen(true);
                  }}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Inspect &rarr;
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5">
                {/* Visual Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Collection Progress</span>
                    <span className="font-bold text-foreground">
                      {meal.collectedQuantity} / {meal.preparedQuantity}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${isHighCollection ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(100, meal.collectionRatePct)}%` }}
                    />
                  </div>
                </div>

                {/* Metric Grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-[10px] text-muted-foreground">Prepared</p>
                    <p className="font-bold text-foreground">{meal.preparedQuantity}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-[10px] text-muted-foreground">Collected</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{meal.collectedQuantity}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-[10px] text-muted-foreground">Uncollected</p>
                    <p className="font-bold text-foreground">{meal.uncollectedQuantity}</p>
                  </div>
                </div>

                {/* Disposition Status Pill & Quick Action */}
                <div className="p-2.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Disposition:</span>
                    <span className="font-semibold text-foreground capitalize">
                      {meal.confirmedDiscarded > 0
                        ? `${meal.confirmedDiscarded} Discarded`
                        : `${meal.retainedOrReused} Retained`}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDispositionModal(meal)}
                    className="h-7 text-xs font-medium border-primary/30 text-primary hover:bg-primary/5"
                  >
                    Set Disposition
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 4. Consumption Trends Chart & Operational Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: 14-Day Prepared vs Collected Trend Chart (2 Columns) */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="py-3.5 px-4 md:px-6 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                14-Day Consumption Run-Rate (Prepared vs Collected)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily comparison of kitchen preparation volumes against verified meal collections.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Collected</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span>Prepared</span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            {/* Visual Bar Columns */}
            <div className="grid grid-cols-14 gap-1.5 sm:gap-2 items-end h-[160px] pt-4 px-1">
              {(summary?.consumptionTrends || []).map((d) => {
                const maxVal = 3500;
                const prepPct = Math.round((d.prepared / maxVal) * 100);
                const collPct = Math.round((d.collected / maxVal) * 100);

                return (
                  <div key={d.date} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="text-[9px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 font-mono transition-opacity">
                      {d.collected}
                    </div>
                    {/* Double Bar */}
                    <div className="w-full flex items-end justify-center gap-0.5 h-full">
                      <div
                        className="w-2.5 bg-muted-foreground/30 rounded-t-sm"
                        style={{ height: `${prepPct}%` }}
                        title={`Prepared: ${d.prepared}`}
                      />
                      <div
                        className="w-2.5 bg-emerald-500 rounded-t-sm group-hover:bg-emerald-600 transition-colors"
                        style={{ height: `${collPct}%` }}
                        title={`Collected: ${d.collected}`}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[32px]">
                      {d.displayDate.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right: Operational Insights & Recommendations (1 Column) */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="py-3.5 px-4 border-b border-border/60">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Operational Insights & Advisory
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 space-y-2.5">
            {(summary?.operationalInsights || []).map((insight, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-border/60 bg-muted/20 text-xs text-foreground flex items-start gap-2.5 leading-relaxed"
              >
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <p>{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 5. Department-wise Consumption Breakdown Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="py-3.5 px-4 md:px-6 border-b border-border/60">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Department Meal Consumption & Collection Rate
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Identifies departments with high cancellation rates or uncollected meal gaps (HERD, PMTA, MBS, etc.).
          </p>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-[11px] uppercase font-semibold text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-2.5 px-4 text-left">Department</th>
                  <th className="py-2.5 px-4 text-right">Registered Staff</th>
                  <th className="py-2.5 px-4 text-right">Expected Meals</th>
                  <th className="py-2.5 px-4 text-right">Cancellations</th>
                  <th className="py-2.5 px-4 text-right">Prepared</th>
                  <th className="py-2.5 px-4 text-right">Collected</th>
                  <th className="py-2.5 px-4 text-center">Collection %</th>
                  <th className="py-2.5 px-4 text-right">Uncollected Portions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(summary?.departmentConsumptions || []).map((dept) => (
                  <tr key={dept.department} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">{dept.department}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground font-mono">{dept.registeredWorkers}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground font-mono">{dept.expectedMeals}</td>
                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-mono">-{dept.confirmedCancellations}</td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">{dept.preparedMeals}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{dept.collectedMeals}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 ${
                          dept.collectionPct >= 90
                            ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                            : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                        }`}
                      >
                        {dept.collectionPct}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground font-mono">
                      {dept.uncollectedQuantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 6. MODAL: Quick 15-Second Disposition Action */}
      <Dialog open={dispositionModalOpen} onOpenChange={setDispositionModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Record Uncollected Meal Disposition — {targetMeal?.mealType}
            </DialogTitle>
            <DialogDescription>
              Uncollected meals are not automatically waste. Verify whether portions were safely retained, reused, or discarded.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground">Uncollected Portions:</span>
                <span className="font-bold text-foreground text-sm ml-2">{targetMeal?.uncollectedQuantity}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Estimated Meal Value:</span>
                <span className="font-bold text-primary text-sm ml-2">SAR {targetMeal?.estimatedValueUncollectedSAR}</span>
              </div>
            </div>

            {/* Disposition Status Choice */}
            <div className="space-y-1.5">
              <Label className="text-xs">Disposition Outcome</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "retained", label: "Safely Retained", desc: "Chilled for next shift" },
                  { id: "reused", label: "Reused", desc: "Camp catering policy" },
                  { id: "discarded", label: "Discarded", desc: "Confirmed food waste" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDispositionStatus(s.id as any)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      dispositionStatus === s.id
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border/60 hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {dispositionStatus === "discarded" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Discarded Portions</Label>
                  <Input
                    type="number"
                    value={discardedQty}
                    onChange={(e) => setDiscardedQty(Number(e.target.value))}
                    className="mt-1 h-9 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs">Discard Reason</Label>
                  <Select value={dispositionReason} onValueChange={setDispositionReason}>
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Exceeded holding temperature (> 2 hrs)">Exceeded 2-hr holding</SelectItem>
                      <SelectItem value="Plate scrapings surplus">Plate scrapings</SelectItem>
                      <SelectItem value="Shift cancellation unexpected">Shift cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-xs">Retained / Chilled Portions</Label>
                <Input
                  type="number"
                  value={retainedQty}
                  onChange={(e) => setRetainedQty(Number(e.target.value))}
                  className="mt-1 h-9 text-xs font-mono font-bold"
                />
              </div>
            )}

            <div>
              <Label className="text-xs">Supervisor Notes (Optional)</Label>
              <Input
                placeholder="e.g. 50 portions safely transferred to night-shift holding..."
                value={dispositionNotes}
                onChange={(e) => setDispositionNotes(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDispositionModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveDisposition} disabled={saveDisposition.isPending}>
              {saveDisposition.isPending ? "Recording..." : "Confirm Disposition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL: Meal Session Detail View */}
      <Dialog open={sessionDetailModalOpen} onOpenChange={setSessionDetailModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UtensilsCrossed className="h-4 w-4 text-primary" />
              Meal Session Audit — {inspectedMeal?.mealType} ({selectedDate})
            </DialogTitle>
          </DialogHeader>

          {inspectedMeal && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <p className="text-[10px] text-muted-foreground">Expected Workers</p>
                  <p className="font-bold text-foreground text-sm">{inspectedMeal.scheduledQuantity}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <p className="text-[10px] text-muted-foreground">Approved Cancellations</p>
                  <p className="font-bold text-rose-600 text-sm">-{inspectedMeal.cancellations}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <p className="text-[10px] text-muted-foreground">Actual Kitchen Prep</p>
                  <p className="font-bold text-foreground text-sm">{inspectedMeal.preparedQuantity}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <p className="text-[10px] text-muted-foreground">Confirmed QR Collections</p>
                  <p className="font-bold text-emerald-600 text-sm">{inspectedMeal.collectedQuantity}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-card space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uncollected Meals:</span>
                  <span className="font-bold text-foreground">{inspectedMeal.uncollectedQuantity} portions</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uncollected Meal Value:</span>
                  <span className="font-bold text-primary">SAR {inspectedMeal.estimatedValueUncollectedSAR}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed Discarded Waste:</span>
                  <span className="font-bold text-rose-600">{inspectedMeal.confirmedDiscarded} portions</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setSessionDetailModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
