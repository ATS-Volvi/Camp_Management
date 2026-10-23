import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Department {
  id: string;
  name: string;
  code: string;
  cost_center: string | null;
  is_active: boolean;
  created_at: string;
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Department[];
    },
  });
}
