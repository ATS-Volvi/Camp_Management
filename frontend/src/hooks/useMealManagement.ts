import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type MealType = "breakfast" | "lunch" | "dinner";
export type Preference = "veg" | "non_veg";

export interface MealCycle {
  id: string;
  camp_id: string | null;
  name: string | null;
  start_date: string;
  end_date: string;
  cutoff_datetime: string;
  is_active: boolean;
  created_at: string;
}

export interface MealOrder {
  id: string;
  employee_id: string;
  cycle_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MealOrderItem {
  id: string;
  meal_order_id: string;
  meal_date: string;
  meal_type: MealType;
  preference: Preference;
}

export interface MealScan {
  id: string;
  employee_id: string;
  camp_id: string | null;
  meal_date: string;
  meal_type: MealType;
  preference: string | null;
  scanned_at: string;
  scanned_by: string | null;
  is_ordered: boolean;
  notes: string | null;
}

export function useMealCycles(campId?: string) {
  return useQuery({
    queryKey: ["meal-cycles", campId],
    queryFn: async () => {
      let q = supabase.from("meal_order_cycles").select("*").order("start_date", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MealCycle[];
    },
  });
}

export function useActiveCycle(campId?: string) {
  return useQuery({
    queryKey: ["active-meal-cycle", campId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      let q = supabase
        .from("meal_order_cycles")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("start_date", { ascending: false })
        .limit(1);
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q;
      if (error) throw error;
      return (data?.[0] ?? null) as MealCycle | null;
    },
  });
}

export function useCreateCycle() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      camp_id: string | null;
      name: string;
      start_date: string;
      end_date: string;
      cutoff_datetime: string;
    }) => {
      const { data, error } = await supabase
        .from("meal_order_cycles")
        .insert({ ...input, created_by: user?.id, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data as MealCycle;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-cycles"] });
      qc.invalidateQueries({ queryKey: ["active-meal-cycle"] });
      toast.success("Meal cycle created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useToggleCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("meal_order_cycles").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-cycles"] });
      qc.invalidateQueries({ queryKey: ["active-meal-cycle"] });
    },
  });
}

export function useEmployeeOrder(cycleId?: string, employeeId?: string) {
  return useQuery({
    queryKey: ["meal-order", cycleId, employeeId],
    enabled: !!cycleId && !!employeeId,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("meal_orders")
        .select("*, meal_order_items(*)")
        .eq("cycle_id", cycleId!)
        .eq("employee_id", employeeId!)
        .maybeSingle();
      if (error) throw error;
      return orders as (MealOrder & { meal_order_items: MealOrderItem[] }) | null;
    },
  });
}

export function useSubmitOrder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      cycle_id: string;
      items: { meal_date: string; meal_type: MealType; preference: Preference }[];
    }) => {
      // upsert order header
      const { data: existing } = await supabase
        .from("meal_orders")
        .select("id")
        .eq("cycle_id", input.cycle_id)
        .eq("employee_id", input.employee_id)
        .maybeSingle();

      let orderId = existing?.id;
      if (!orderId) {
        const { data, error } = await supabase
          .from("meal_orders")
          .insert({
            employee_id: input.employee_id,
            cycle_id: input.cycle_id,
            status: "submitted",
            submitted_by: user?.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        orderId = data.id;
      } else {
        await supabase.from("meal_orders").update({ status: "modified" }).eq("id", orderId);
        await supabase.from("meal_order_items").delete().eq("meal_order_id", orderId);
      }

      const items = input.items.map((it) => ({ ...it, meal_order_id: orderId! }));
      if (items.length > 0) {
        const { error } = await supabase.from("meal_order_items").insert(items);
        if (error) throw error;
      }
      return orderId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-order"] });
      qc.invalidateQueries({ queryKey: ["meal-forecast"] });
      qc.invalidateQueries({ queryKey: ["meal-orders-all"] });
      toast.success("Meal order saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMealForecast(cycleId?: string) {
  return useQuery({
    queryKey: ["meal-forecast", cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("meal_orders")
        .select("id, meal_order_items(meal_date, meal_type, preference)")
        .eq("cycle_id", cycleId!);
      if (error) throw error;
      const map = new Map<string, { veg: number; non_veg: number }>();
      (orders ?? []).forEach((o: any) => {
        (o.meal_order_items ?? []).forEach((it: any) => {
          const key = `${it.meal_date}|${it.meal_type}`;
          if (!map.has(key)) map.set(key, { veg: 0, non_veg: 0 });
          map.get(key)![it.preference as Preference] += 1;
        });
      });
      return Array.from(map.entries()).map(([k, v]) => {
        const [meal_date, meal_type] = k.split("|");
        return { meal_date, meal_type: meal_type as MealType, veg: v.veg, non_veg: v.non_veg };
      });
    },
  });
}

export function useMealScans(date?: string) {
  return useQuery({
    queryKey: ["meal-scans", date],
    queryFn: async () => {
      let q = supabase
        .from("meal_scans")
        .select("*")
        .order("scanned_at", { ascending: false })
        .limit(200);
      if (date) q = q.eq("meal_date", date);
      const { data: scans, error } = await q;
      if (error) throw error;

      const employeeIds = Array.from(new Set((scans ?? []).map((s) => s.employee_id).filter(Boolean)));
      if (employeeIds.length === 0) return scans ?? [];

      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, name, employee_id")
        .in("id", employeeIds);
      if (empError) throw empError;

      const employeeById = new Map((employees ?? []).map((e) => [e.id, e]));
      return (scans ?? []).map((scan) => ({
        ...scan,
        employees: employeeById.get(scan.employee_id) ?? null,
      }));
    },
    refetchInterval: 5000,
  });
}

export function useScanMeal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { employee_id: string; meal_type: MealType; meal_date?: string }) => {
      const meal_date = input.meal_date ?? new Date().toISOString().split("T")[0];

      // Look up employee + camp
      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .select("id, name, employee_id, camp_id")
        .eq("id", input.employee_id)
        .maybeSingle();
      if (empErr) throw empErr;
      if (!emp) throw new Error("Employee not found");

      // Check ordered
      const { data: ordered } = await supabase
        .from("meal_order_items")
        .select("preference, meal_orders!inner(employee_id)")
        .eq("meal_date", meal_date)
        .eq("meal_type", input.meal_type)
        .eq("meal_orders.employee_id", emp.id)
        .maybeSingle();

      const is_ordered = !!ordered;
      const preference = (ordered as any)?.preference ?? null;

      // Prevent duplicate scan same employee/date/meal
      const { data: existing } = await supabase
        .from("meal_scans")
        .select("id")
        .eq("employee_id", emp.id)
        .eq("meal_date", meal_date)
        .eq("meal_type", input.meal_type)
        .maybeSingle();
      if (existing) {
        return { duplicate: true, employee: emp, is_ordered, preference };
      }

      const { error } = await supabase.from("meal_scans").insert({
        employee_id: emp.id,
        camp_id: emp.camp_id,
        meal_date,
        meal_type: input.meal_type,
        preference,
        is_ordered,
        scanned_by: user?.id,
      });
      if (error) throw error;
      return { duplicate: false, employee: emp, is_ordered, preference };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-scans"] });
    },
  });
}

export function useCycleAnalytics(cycleId?: string) {
  return useQuery({
    queryKey: ["meal-analytics", cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data: cycle } = await supabase.from("meal_order_cycles").select("*").eq("id", cycleId!).single();
      if (!cycle) return null;

      const { data: items } = await supabase
        .from("meal_order_items")
        .select("meal_date, meal_type, preference, meal_orders!inner(employee_id, cycle_id)")
        .eq("meal_orders.cycle_id", cycleId!);

      const { data: scans } = await supabase
        .from("meal_scans")
        .select("*")
        .gte("meal_date", cycle.start_date)
        .lte("meal_date", cycle.end_date);

      const orderKey = (e: string, d: string, m: string) => `${e}|${d}|${m}`;
      const orderedSet = new Set<string>();
      (items ?? []).forEach((it: any) => {
        orderedSet.add(orderKey(it.meal_orders.employee_id, it.meal_date, it.meal_type));
      });
      const scanSet = new Set<string>();
      (scans ?? []).forEach((s: any) => {
        scanSet.add(orderKey(s.employee_id, s.meal_date, s.meal_type));
      });

      let noShows = 0;
      orderedSet.forEach((k) => {
        if (!scanSet.has(k)) noShows += 1;
      });
      let unauthorized = 0;
      scanSet.forEach((k) => {
        if (!orderedSet.has(k)) unauthorized += 1;
      });

      return {
        ordered: orderedSet.size,
        collected: scanSet.size,
        noShows,
        unauthorized,
      };
    },
  });
}
