import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DepartmentLunch } from "@/lib/departmentLunch";

export function useDepartmentLunch(from: string, to: string) {
 return useQuery({ queryKey: ["department-lunch",from,to], queryFn: async () => {
  const rows: DepartmentLunch[] = [];
  for (let offset=0;;offset+=1000) {
   const {data,error}=await supabase.from("department_lunch_requests").select("*, departments(name,code,cost_center), camps(name)").gte("meal_date",from).lte("meal_date",to).order("meal_date").order("id").range(offset,offset+999);
   if(error) throw error; rows.push(...(data || [])); if((data || []).length<1000) break;
  } return rows;
 }});
}
export function useLunchManagers() {
 return useQuery({queryKey:["department-lunch-managers"],queryFn:async()=>{const {data,error}=await supabase.from("department_lunch_managers").select("*");if(error)throw error;return data;}});
}
export function useLunchRates() {
 return useQuery({queryKey:["department-lunch-rates"],queryFn:async()=>{const {data,error}=await supabase.from("department_lunch_rates").select("*,camps(name)").order("camp_id");if(error)throw error;return data;}});
}
export function useLunchMutation() {
 const cache=useQueryClient();
 return useMutation({mutationFn:async(action:()=>PromiseLike<{error: unknown}>)=>{const {error}=await action();if(error)throw error;},onSuccess:async()=>{await Promise.all(["department-lunch","department-lunch-managers","revenue-data","invoice-data"].map(key=>cache.invalidateQueries({queryKey:[key]})));}});
}