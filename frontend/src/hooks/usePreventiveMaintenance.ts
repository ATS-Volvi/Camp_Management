import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PMFrequency =
  | "daily" | "weekly" | "fortnightly" | "monthly"
  | "bi_monthly" | "quarterly" | "four_monthly"
  | "half_yearly" | "yearly" | "custom";

export type PMTaskStatus = "pending" | "in_progress" | "completed" | "overdue" | "skipped";

export const FREQUENCY_OPTIONS: { value: PMFrequency; label: string; days: number }[] = [
  { value: "daily", label: "Daily", days: 1 },
  { value: "weekly", label: "Weekly", days: 7 },
  { value: "fortnightly", label: "Fortnightly", days: 14 },
  { value: "monthly", label: "Monthly", days: 30 },
  { value: "bi_monthly", label: "Bi-Monthly", days: 60 },
  { value: "quarterly", label: "Quarterly", days: 90 },
  { value: "four_monthly", label: "Four-Monthly", days: 120 },
  { value: "half_yearly", label: "Half-Yearly", days: 180 },
  { value: "yearly", label: "Yearly", days: 365 },
  { value: "custom", label: "Custom", days: 0 },
];

export interface PMEquipment {
  id: string;
  camp_id: string;
  machine_code: string;
  name: string;
  category: string;
  location: string | null;
  frequency: PMFrequency;
  frequency_days: number;
  last_maintenance_date: string | null;
  next_due_date: string | null;
  status: "active" | "inactive" | "retired";
  notes: string | null;
  default_assignee_name: string | null;
  created_at: string;
}

export interface PMTask {
  id: string;
  equipment_id: string;
  camp_id: string;
  scheduled_date: string;
  due_date: string;
  status: PMTaskStatus;
  assigned_to: string | null;
  assigned_to_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  completed_by_name: string | null;
  issues_identified: string | null;
  action_taken: string | null;
  remarks: string | null;
  pm_equipment?: { name: string; machine_code: string; frequency_days: number; camp_id: string } | null;
}

export interface PMLog {
  id: string;
  equipment_id: string;
  camp_id: string;
  performed_on: string;
  performed_by_name: string | null;
  scheduled_due_date: string | null;
  status: PMTaskStatus;
  issues_identified: string | null;
  action_taken: string | null;
  remarks: string | null;
  next_due_date: string | null;
  pm_equipment?: { name: string; machine_code: string } | null;
}

export const useEquipment = (campId?: string) =>
  useQuery({
    queryKey: ["pm-equipment", campId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("pm_equipment" as any).select("*").order("machine_code");
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PMEquipment[];
    },
  });

export const useTasks = (campId?: string) =>
  useQuery({
    queryKey: ["pm-tasks", campId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("pm_tasks" as any)
        .select("*, pm_equipment(name, machine_code, frequency_days, camp_id)")
        .order("due_date", { ascending: true });
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q;
      if (error) throw error;
      // mark overdue locally if pending past due
      const today = new Date().toISOString().slice(0, 10);
      return ((data ?? []) as unknown as PMTask[]).map(t =>
        t.status === "pending" && t.due_date < today ? { ...t, status: "overdue" as PMTaskStatus } : t
      );
    },
  });

export const useLogs = (campId?: string) =>
  useQuery({
    queryKey: ["pm-logs", campId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("pm_logs" as any)
        .select("*, pm_equipment(name, machine_code)")
        .order("performed_on", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PMLog[];
    },
  });

export const useCreateEquipment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<PMEquipment>) => {
      const { data, error } = await supabase.from("pm_equipment" as any).insert(payload as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-equipment"] });
      qc.invalidateQueries({ queryKey: ["pm-tasks"] });
      toast.success("Equipment added — first task scheduled");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useUpdateEquipment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PMEquipment> & { id: string }) => {
      const { error } = await supabase.from("pm_equipment" as any).update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-equipment"] });
      toast.success("Equipment updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteEquipment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pm_equipment" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-equipment"] });
      qc.invalidateQueries({ queryKey: ["pm-tasks"] });
      toast.success("Equipment removed");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PMTask> & { id: string }) => {
      const { error } = await supabase.from("pm_tasks" as any).update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-tasks"] });
      qc.invalidateQueries({ queryKey: ["pm-logs"] });
      qc.invalidateQueries({ queryKey: ["pm-equipment"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};
