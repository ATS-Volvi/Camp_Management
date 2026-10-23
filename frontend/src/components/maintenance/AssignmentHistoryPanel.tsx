import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Clock, ArrowRight } from "lucide-react";

export default function AssignmentHistoryPanel({ ticketId }: { ticketId: string }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["assignment-history", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_assignment_history")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  if (isLoading) return <div className="text-xs text-muted-foreground">Loading history...</div>;
  if (history.length === 0) return <div className="text-xs text-muted-foreground">No assignment history</div>;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignment History</h4>
      <div className="space-y-1.5">
        {history.map((h) => (
          <div key={h.id} className="flex items-start gap-2 text-xs bg-muted/30 rounded p-2">
            <Clock size={12} className="mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-1">
                {h.assigned_from && (
                  <>
                    <span className="text-muted-foreground">{h.assigned_from}</span>
                    <ArrowRight size={10} />
                  </>
                )}
                <span className="font-medium">{h.assigned_to || "Unassigned"}</span>
              </div>
              {h.notes && <div className="text-muted-foreground mt-0.5">{h.notes}</div>}
              <div className="text-muted-foreground/70 mt-0.5">
                {format(new Date(h.created_at), "dd MMM yyyy, HH:mm")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
