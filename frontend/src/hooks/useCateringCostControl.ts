import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";

export interface CostControlSummaryKPIs {
  totalBudget: number;
  actualExpenditure: number;
  remainingBudget: number;
  budgetUtilizationPct: number;
  avgCostPerWorkerPerDay: number;
  avgCostPerMeal: number;
  momVariationPct: number;
  totalActiveWorkers: number;
  projectedMonthEnd: number;
}

export interface DepartmentExpenditure {
  department: string;
  workerCount: number;
  allocatedBudget: number;
  actualExpenditure: number;
  budgetUtilizationPct: number;
  costPerWorkerPerDay: number;
  momVariationPct: number;
  status: "Within Budget" | "Approaching" | "Exceeded";
}

export interface CampExpenditure {
  campId: string;
  campName: string;
  location: string;
  activeWorkers: number;
  totalExpenditure: number;
  allocatedBudget: number;
  avgCostPerWorkerPerDay: number;
  avgMealCost: number;
  budgetUtilizationPct: number;
}

export interface ExpenditureBreakdownCategory {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface CostAlert {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affectedUnit: string;
  date: string;
  action: string;
  link: string;
}

export interface CostControlSummaryResponse {
  monthYear: string;
  kpis: CostControlSummaryKPIs;
  deptExpenditures: DepartmentExpenditure[];
  campExpenditures: CampExpenditure[];
  expenditureBreakdown: ExpenditureBreakdownCategory[];
  alerts: CostAlert[];
}

export function useCostControlSummary(filters: { campId?: string; department?: string; monthYear?: string } = {}) {
  return useQuery<CostControlSummaryResponse>({
    queryKey: ["catering-cost-control-summary", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.campId) params.append("campId", filters.campId);
      if (filters.department) params.append("department", filters.department);
      if (filters.monthYear) params.append("monthYear", filters.monthYear);

      const qs = params.toString();
      const url = `/catering/cost-control-summary${qs ? `?${qs}` : ""}`;
      return await api.get(url);
    },
    refetchInterval: 30000,
  });
}

export function useCateringBudgets(campId?: string, monthYear?: string) {
  return useQuery({
    queryKey: ["catering-budgets", campId, monthYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (campId) params.append("camp_id", campId);
      if (monthYear) params.append("month_year", monthYear);
      const qs = params.toString();
      return await api.get(`/catering/budgets${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useSaveCateringBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (budget: any) => {
      return await api.post("/catering/budgets", budget);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catering-budgets"] });
      qc.invalidateQueries({ queryKey: ["catering-cost-control-summary"] });
      toast({ title: "Catering Budget Saved", description: "Budget allocation updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error saving budget", description: err.message, variant: "destructive" });
    },
  });
}

// Module 2 Types & Hooks
export interface MealPerformanceItem {
  mealType: string;
  scheduledQuantity: number;
  cancellations: number;
  preparedQuantity: number;
  collectedQuantity: number;
  uncollectedQuantity: number;
  collectionRatePct: number;
  confirmedDiscarded: number;
  retainedOrReused: number;
  estimatedValueUncollectedSAR: number;
  confirmedWasteCostSAR: number;
  dispositionStatus: string;
}

export interface DepartmentConsumptionItem {
  department: string;
  registeredWorkers: number;
  expectedMeals: number;
  confirmedCancellations: number;
  preparedMeals: number;
  collectedMeals: number;
  collectionPct: number;
  uncollectedQuantity: number;
  uncollectedValueSAR: number;
}

export interface ConsumptionWasteSummaryResponse {
  date: string;
  dailyOverview: {
    mealsScheduled: number;
    mealsPrepared: number;
    mealsCollected: number;
    uncollectedMeals: number;
    collectionPercentage: number;
    confirmedDiscarded: number;
    reusedOrRetained: number;
    pendingDisposition: number;
    estimatedValueUncollectedSAR: number;
    estimatedConfirmedFoodWasteCostSAR: number;
  };
  mealPerformance: MealPerformanceItem[];
  consumptionTrends: Array<{ date: string; displayDate: string; prepared: number; collected: number; uncollected: number }>;
  departmentConsumptions: DepartmentConsumptionItem[];
  operationalInsights: string[];
  alerts: Array<{ severity: string; title: string; description: string; mealType?: string; department?: string; action: string }>;
}

export function useConsumptionWasteSummary(filters: { campId?: string; date?: string } = {}) {
  return useQuery<ConsumptionWasteSummaryResponse>({
    queryKey: ["catering-consumption-waste-summary", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.campId) params.append("campId", filters.campId);
      if (filters.date) params.append("date", filters.date);

      const qs = params.toString();
      const url = `/catering/consumption-waste-summary${qs ? `?${qs}` : ""}`;
      return await api.get(url);
    },
    refetchInterval: 20000,
  });
}

export function useSaveMealDisposition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (disposition: any) => {
      return await api.post("/catering/dispositions", disposition);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catering-consumption-waste-summary"] });
      toast({ title: "Meal Disposition Recorded", description: "Uncollected meal disposition verified." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to record disposition", description: err.message, variant: "destructive" });
    },
  });
}
