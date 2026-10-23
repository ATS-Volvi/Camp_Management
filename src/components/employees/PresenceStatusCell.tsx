import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, MapPin, Plane, Home, CircleDot } from "lucide-react";

const STATUSES: { key: PresenceStatus; label: string; icon: any; cls: string; billable: boolean }[] = [
  { key: "active", label: "Active", icon: CircleDot, cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", billable: true },
  { key: "on_site", label: "On Site", icon: MapPin, cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", billable: true },
  { key: "vacation", label: "Vacation", icon: Plane, cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", billable: false },
  { key: "away", label: "Away", icon: Home, cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", billable: false },
];

export type PresenceStatus = "active" | "on_site" | "vacation" | "away";

export default function PresenceStatusCell({
  employeeId,
  status,
}: {
  employeeId: string;
  status?: PresenceStatus | null;
}) {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const current = STATUSES.find(s => s.key === (status || "active")) || STATUSES[0];
  const Icon = current.icon;

  const handleChange = async (newStatus: PresenceStatus) => {
    if (newStatus === current.key) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.rpc("change_presence_status", {
      p_employee_id: employeeId,
      p_new_status: newStatus,
      p_reason: null,
      p_changed_by: user?.id || null,
    } as any);
    setBusy(false);
    if (error) {
      toast({ title: "Failed to change status", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["employees"] });
    toast({ title: `Status set to ${STATUSES.find(s => s.key === newStatus)?.label}` });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={busy}>
        <button className="inline-flex items-center gap-1 group">
          <Badge className={`${current.cls} gap-1`} variant="secondary">
            <Icon size={10} />
            {current.label}
            <ChevronDown size={10} className="opacity-60 group-hover:opacity-100" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel className="text-[10px] text-muted-foreground">Change presence</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STATUSES.map(s => {
          const SIcon = s.icon;
          return (
            <DropdownMenuItem key={s.key} onClick={() => handleChange(s.key)} className="text-xs">
              <SIcon size={12} className="mr-2" />
              <span className="flex-1">{s.label}</span>
              <span className={`text-[9px] px-1 rounded ${s.billable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {s.billable ? "Food billed" : "No food"}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
