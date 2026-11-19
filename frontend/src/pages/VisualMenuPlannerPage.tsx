import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import VisualMenuMatrix from "@/components/catering/VisualMenuMatrix";

export default function VisualMenuPlannerPage() {
  const { data: camps = [] } = useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      <VisualMenuMatrix camps={camps} />
    </div>
  );
}
