import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const CAMP_STAFF_ROLES = [
  "Warden",
  "Electrician",
  "Plumber",
  "Cleaner",
  "Security Guard",
  "Cook",
  "Driver",
  "Supervisor",
] as const;

export type CampStaffRole = (typeof CAMP_STAFF_ROLES)[number];

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  employee_type: string;
  designation: string | null;
  department: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  nationality: string | null;
  passport_number: string | null;
  iqama_number: string | null;
  is_blacklisted: boolean | null;
  status: string;
  join_date: string | null;
  contract_end_date: string | null;
  camp_id: string | null;
  room_id: string | null;
  supplier_name: string | null;
  project: string | null;
  id_document_url: string | null;
  staff_role: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmployees(type?: "own" | "supplier" | "camp_staff") {
  return useQuery({
    queryKey: ["employees", type],
    queryFn: async () => {
      let q: any = supabase.from("employees").select("*").order("created_at", { ascending: false });
      if (type) {
        q = q.eq("employee_type", type);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) as Employee[];
    },
  });
}

export function useAddEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (emp: Partial<Employee>) => {
      const { data, error } = await supabase.from("employees").insert(emp as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Employee added successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useBulkInsertEmployees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (employees: Partial<Employee>[]) => {
      const { data, error } = await supabase.from("employees").insert(employees as any[]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: `${(data as any[]).length} employees uploaded successfully` });
    },
    onError: (e: any) => toast({ title: "Bulk upload failed", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase.from("employees").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Employee updated successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
