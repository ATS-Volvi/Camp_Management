import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function allPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await fetchPage(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

export function useCommandDashboard() {
  return useQuery({
    queryKey: ["command-dashboard"],
    queryFn: async () => {
      const [camps, rooms, employees, checkIns, checkOuts, presence] = await Promise.all([
        allPages((a, b) => supabase.from("camps").select("id,name,status,is_rented,monthly_rent").order("id").range(a, b)),
        allPages((a, b) => supabase.from("rooms").select("id,room_number,building_id,floor,category,camp_id,max_capacity,status,ac,attached_bathroom,buildings:building_id(name)").order("id").range(a, b)),
        allPages((a, b) => supabase.from("employees").select("id,employee_id,name,designation,department,nationality,employee_type,supplier_name,project,phone,join_date,contract_end_date,status").order("id").range(a, b)),
        allPages((a, b) => supabase.from("check_ins").select("id,employee_id,camp_id,room_id,check_in_date,food_required").order("id").range(a, b)),
        allPages((a, b) => supabase.from("check_outs").select("id,employee_id,camp_id,check_out_date").order("id").range(a, b)),
        allPages((a, b) => supabase.from("employee_status_log").select("id,employee_id,to_status,effective_from,effective_to").order("id").range(a, b)),
      ]);
      return { camps, rooms, employees, checkIns, checkOuts, presence };
    },
  });
}