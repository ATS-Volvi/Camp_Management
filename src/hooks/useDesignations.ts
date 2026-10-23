import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Designation {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export function useDesignations() {
  return useQuery({
    queryKey: ["designations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("designations")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Designation[];
    },
  });
}
