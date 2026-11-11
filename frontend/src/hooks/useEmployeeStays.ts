import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildEmployeeStays, type Arrival, type Departure, type StayCancellation } from "@/lib/employeeStays";
import { billingToday } from "@/lib/stayBilling";

const relations = "employees(name, employee_id, employee_type, department, designation, supplier_name, company, project), camps(name), rooms(room_number, category)";
export function useEmployeeStays() {
  const today = billingToday();
  return useQuery({
    queryKey: ["employee-stays", today],
    queryFn: async () => {
      async function page<T>(load: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>) {
        const rows: T[] = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await load(from, from + 999);
          if (error) throw error;
          rows.push(...(data ?? []) as T[]);
          if (!data || data.length < 1000) return rows;
        }
      }
      const [arrivals, departures, requests] = await Promise.all([
        page<Arrival>((f, t) => supabase.from("check_ins").select(`id, employee_id, camp_id, room_id, check_in_date, ${relations}`).order("check_in_date").order("id").range(f, t)),
        page<Departure>((f, t) => supabase.from("check_outs").select(`id, employee_id, camp_id, room_id, check_out_date, assets_returned, damage_remarks, clearance_notes, ${relations}`).order("check_out_date").order("id").range(f, t)),
        page<StayCancellation>((f, t) => supabase.from("food_cancellation_requests").select("id, employee_id, camp_id, from_date, to_date, status, reason, source, remarks, food_cancellation_request_meals(meal_type)").order("submitted_at").order("id").range(f, t)),
      ]);
      return buildEmployeeStays(arrivals, departures, requests, today);
    },
  });
}