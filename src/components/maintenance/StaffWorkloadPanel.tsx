import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User, Wrench, AlertTriangle, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StaffWorkload {
  name: string;
  staff_role: string;
  open: number;
  in_progress: number;
  completed: number;
  total: number;
}

export default function StaffWorkloadPanel({ campFilter }: { campFilter?: string }) {
  const { data: workloads = [], isLoading } = useQuery({
    queryKey: ["staff-workloads", campFilter],
    queryFn: async () => {
      // Get all camp staff
      let staffQuery = supabase
        .from("employees")
        .select("id, name, staff_role, camp_id")
        .eq("employee_type", "camp_staff")
        .eq("status", "active")
        .in("staff_role", ["Electrician", "Plumber", "Cleaner", "Supervisor", "Warden"]);

      if (campFilter) staffQuery = staffQuery.eq("camp_id", campFilter);

      const { data: staff, error: staffErr } = await staffQuery;
      if (staffErr) throw staffErr;

      // Get all open/in_progress tickets
      const { data: tickets, error: ticketErr } = await supabase
        .from("maintenance_tickets")
        .select("assigned_to, status");
      if (ticketErr) throw ticketErr;

      // Aggregate per staff
      const map = new Map<string, StaffWorkload>();
      for (const s of staff || []) {
        map.set(s.name, {
          name: s.name,
          staff_role: s.staff_role || "Staff",
          open: 0,
          in_progress: 0,
          completed: 0,
          total: 0,
        });
      }

      for (const t of tickets || []) {
        if (t.assigned_to && map.has(t.assigned_to)) {
          const w = map.get(t.assigned_to)!;
          if (t.status === "open") w.open++;
          else if (t.status === "in_progress") w.in_progress++;
          else if (t.status === "completed") w.completed++;
          w.total++;
        }
      }

      return Array.from(map.values()).sort((a, b) => (b.open + b.in_progress) - (a.open + a.in_progress));
    },
  });

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading workloads...</div>;

  const maxActive = Math.max(...workloads.map((w) => w.open + w.in_progress), 1);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <User size={16} /> Staff Workload ({workloads.length} staff)
      </h3>
      {workloads.length === 0 ? (
        <p className="text-xs text-muted-foreground">No maintenance staff found</p>
      ) : (
        <div className="space-y-2">
          {workloads.map((w) => {
            const activeCount = w.open + w.in_progress;
            const loadPct = (activeCount / maxActive) * 100;
            const loadColor = activeCount >= 5 ? "text-destructive" : activeCount >= 3 ? "text-amber-600" : "text-green-600";

            return (
              <div key={w.name} className="bg-muted/30 rounded-lg p-3 border">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium">{w.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{w.staff_role}</span>
                  </div>
                  <span className={`text-xs font-bold ${loadColor}`}>
                    {activeCount} active
                  </span>
                </div>
                <Progress value={loadPct} className="h-1.5 mb-2" />
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <AlertTriangle size={10} className="text-amber-500" /> {w.open} open
                  </span>
                  <span className="flex items-center gap-1">
                    <Wrench size={10} className="text-primary" /> {w.in_progress} in progress
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle size={10} className="text-green-500" /> {w.completed} done
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
