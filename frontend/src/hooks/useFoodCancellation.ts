import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
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
  employee?: {
    id: string;
    name: string;
    employee_id: string;
    designation: string | null;
  } | null;
  meals: MealType[];
}

export function useCancellationRequests(filters?: { campId?: string; status?: CancelStatus }) {
  return useQuery({
    queryKey: ["food-cancellations", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.campId) params.append("campId", filters.campId);
      if (filters?.status) params.append("status", filters.status);
      const query = params.toString();
      const endpoint = `/food-cancellation/requests${query ? `?${query}` : ''}`;
      const data = await api.get<any[]>(endpoint);
      return (data ?? []).map((r: any) => ({
        ...r,
        meals: r.meals ?? []
      })) as CancellationRequest[];
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
      const payload = {
        ...input,
        submitted_by: user?.id ?? null
      };
      return await api.post('/food-cancellation/requests', payload);
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
      return await api.put(`/food-cancellation/requests/${id}/approve`, {
        approver_id: user?.id ?? null
      });
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
      return await api.put(`/food-cancellation/requests/${id}/reject`, {
        approver_id: user?.id ?? null,
        reason
      });
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
      const data = await api.get(`/food-cancellation/kitchen-count/${campId}?date=${d}`);
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
      const data = await api.get(`/food-cancellation/settings/${campId}`);
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
      return await api.post('/food-cancellation/settings', input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food-cancel-settings"] });
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
