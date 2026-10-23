import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type MealType = "breakfast" | "lunch" | "dinner" | "iftar" | "suhoor";
export type CancelStatus = "pending" | "approved" | "rejected" | "cancelled";
export type CancelReason =
  | "leave" | "site_transfer" | "official_duty" | "off_camp_stay" | "absent"
  | "medical" | "shift_change" | "ramadan" | "resignation" | "opt_out"
  | "suspension" | "client_meals" | "other";

export const REASON_LABELS: Record<CancelReason, string> = {
  leave: "Leave (annual/emergency/personal)",
  site_transfer: "Site Transfer / Rotation",
  official_duty: "Official Duty / Business Travel",
  off_camp_stay: "Hotel / Guest House (off-camp)",
  absent: "Absent / Not Staying in Camp",
  medical: "Medical (hospitalization/sick)",
  shift_change: "Shift Change",
  ramadan: "Ramadan",
  resignation: "Resignation / Termination",
  opt_out: "Opt-out of Camp Food",
  suspension: "Disciplinary Suspension",
  client_meals: "Overtime / Client-provided Meals",
  other: "Other",
};

export interface CancellationRequest {
  id: string;
  employee_id: string;
  camp_id: string | null;
  from_date: string;
  to_date: string;
  reason: CancelReason;
  remarks: string | null;
  status: CancelStatus;
  source: string;
  approval_levels_required: number;
  current_level: number;
  is_late: boolean;
  submitted_by: string | null;
  submitted_at: string;
  rejection_reason: string | null;
  level1_approver: string | null;
  level1_approved_at: string | null;
  level2_approver: string | null;
  level2_approved_at: string | null;
  level3_approver: string | null;
  level3_approved_at: string | null;
}

export function useCancellationRequests(filters?: { campId?: string; status?: CancelStatus }) {
  return useQuery({
    queryKey: ["food-cancellations", filters],
    queryFn: async () => {
      let q = supabase
        .from("food_cancellation_requests")
        .select("*, food_cancellation_request_meals(meal_type)")
        .order("submitted_at", { ascending: false });
      if (filters?.campId) q = q.eq("camp_id", filters.campId);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;

      const ids = Array.from(new Set((data ?? []).map((r: any) => r.employee_id)));
      const { data: emps } = ids.length
        ? await supabase.from("employees").select("id, name, employee_id, designation").in("id", ids)
        : { data: [] as any[] };
      const empMap = new Map((emps ?? []).map((e: any) => [e.id, e]));
      return (data ?? []).map((r: any) => ({
        ...r,
        employee: empMap.get(r.employee_id) ?? null,
        meals: (r.food_cancellation_request_meals ?? []).map((m: any) => m.meal_type as MealType),
      }));
    },
  });
}

export function useSubmitCancellation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      from_date: string;
      to_date: string;
      meals: MealType[];
      reason: CancelReason;
      remarks?: string;
      force?: boolean;
    }) => {
      const { data, error } = await supabase.rpc("submit_food_cancellation", {
        p_employee_id: input.employee_id,
        p_from_date: input.from_date,
        p_to_date: input.to_date,
        p_meals: input.meals as any,
        p_reason: input.reason as any,
        p_remarks: input.remarks ?? null,
        p_source: "manual" as any,
        p_submitted_by: user?.id ?? null,
        p_force: input.force ?? false,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food-cancellations"] });
      qc.invalidateQueries({ queryKey: ["kitchen-meal-count"] });
      toast.success("Cancellation request submitted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useApproveCancellation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("approve_food_cancellation", {
        p_request_id: id,
        p_approver: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food-cancellations"] });
      qc.invalidateQueries({ queryKey: ["kitchen-meal-count"] });
      toast.success("Approved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRejectCancellation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc("reject_food_cancellation", {
        p_request_id: id,
        p_approver: user?.id ?? null,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food-cancellations"] });
      toast.success("Rejected");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useKitchenMealCount(campId?: string, date?: string) {
  return useQuery({
    queryKey: ["kitchen-meal-count", campId, date],
    enabled: !!campId,
    queryFn: async () => {
      const d = date ?? new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.rpc("get_kitchen_meal_count", {
        p_camp_id: campId!,
        p_date: d,
      });
      if (error) throw error;
      return (data ?? []) as { meal_type: string; total_active: number; cancelled: number; net_count: number }[];
    },
    refetchInterval: 10000,
  });
}

export function useCampCancellationSettings(campId?: string) {
  return useQuery({
    queryKey: ["food-cancel-settings", campId],
    enabled: !!campId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camp_food_cancellation_settings")
        .select("*")
        .eq("camp_id", campId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertCancellationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      camp_id: string;
      approval_levels: number;
      cutoff_time: string;
      cutoff_strict: boolean;
      ramadan_mode: boolean;
      ramadan_start: string | null;
      ramadan_end: string | null;
      night_shift_auto_breakfast: boolean;
    }) => {
      const { data: existing } = await supabase
        .from("camp_food_cancellation_settings")
        .select("id")
        .eq("camp_id", input.camp_id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("camp_food_cancellation_settings")
          .update(input)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("camp_food_cancellation_settings").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food-cancel-settings"] });
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
