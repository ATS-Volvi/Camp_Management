import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  BedDouble, UtensilsCrossed, Wrench, LogIn, AlertCircle,
  CheckCircle2, Sparkles, ChevronRight, Activity
} from "lucide-react";
import { format } from "date-fns";

export default function OperationsPulseTicker() {
  const navigate = useNavigate();
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // 1. Fetch Room Capacity & Live Occupancy
  const { data: roomMetrics } = useQuery({
    queryKey: ["ticker-room-metrics"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("current_occupancy, max_capacity, status");
      if (error) throw error;
      const totalCapacity = (data || []).reduce((acc, r) => acc + (r.max_capacity || 0), 0);
      const totalOccupied = (data || []).reduce((acc, r) => acc + (r.current_occupancy || 0), 0);
      const pct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
      return { totalCapacity, totalOccupied, pct };
    },
  });

  // 2. Fetch Open Maintenance Tickets
  const { data: maintenanceMetrics } = useQuery({
    queryKey: ["ticker-maintenance-metrics"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("id, priority, status")
        .in("status", ["reported", "assigned", "in_progress"]);
      if (error) return { openCount: 0, criticalCount: 0 };
      const openCount = data.length;
      const criticalCount = data.filter((t) => t.priority === "high" || t.priority === "critical").length;
      return { openCount, criticalCount };
    },
  });

  // 3. Fetch Today's Check-ins
  const { data: todayCheckInsCount = 0 } = useQuery({
    queryKey: ["ticker-today-checkins", todayStr],
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .gte("check_in_date", `${todayStr}T00:00:00`);
      if (error) return 0;
      return count || 0;
    },
  });

  const occupancyRate = roomMetrics?.pct ?? 0;
  const criticalTickets = maintenanceMetrics?.criticalCount ?? 0;
  const openTickets = maintenanceMetrics?.openCount ?? 0;
  const totalOccupied = roomMetrics?.totalOccupied ?? 0;

  return (
    <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-muted/40 hover:bg-muted/60 transition-colors border border-border/60 rounded-full text-xs shadow-xs">
      {/* Live Pulse Indicator */}
      <div className="flex items-center gap-1.5 pr-2 border-r border-border/60">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
          Pulse
        </span>
      </div>

      {/* 1. Bed Occupancy Pill */}
      <button
        onClick={() => navigate("/camps")}
        title="View Camps & Room Occupancy"
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full hover:bg-background/80 transition-all cursor-pointer group"
      >
        <BedDouble size={13} className="text-primary" />
        <span className="text-muted-foreground text-[11px]">Occupancy:</span>
        <span className="font-bold text-foreground text-[11px] group-hover:text-primary transition-colors">
          {occupancyRate}%
        </span>
        <span className="text-[10px] text-muted-foreground/75 font-medium">
          ({totalOccupied} beds)
        </span>
      </button>

      <span className="inline-block w-1 h-1 rounded-full bg-border" />

      {/* 2. Maintenance Status Pill */}
      <button
        onClick={() => navigate("/maintenance")}
        title="View Repair & Maintenance Tickets"
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full hover:bg-background/80 transition-all cursor-pointer group"
      >
        <Wrench size={13} className={criticalTickets > 0 ? "text-rose-500" : "text-amber-500"} />
        <span className="text-muted-foreground text-[11px]">Repairs:</span>
        {criticalTickets > 0 ? (
          <span className="font-bold text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-1 group-hover:underline">
            {criticalTickets} Urgent
          </span>
        ) : openTickets > 0 ? (
          <span className="font-bold text-foreground text-[11px] group-hover:text-primary">
            {openTickets} Open
          </span>
        ) : (
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-0.5">
            <CheckCircle2 size={11} /> 0 All Good
          </span>
        )}
      </button>

      <span className="inline-block w-1 h-1 rounded-full bg-border" />

      {/* 3. Today's Check-ins */}
      <button
        onClick={() => navigate("/check-in-out")}
        title="View Today's Check-ins"
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full hover:bg-background/80 transition-all cursor-pointer group"
      >
        <LogIn size={13} className="text-emerald-500" />
        <span className="text-muted-foreground text-[11px]">Today In:</span>
        <span className="font-bold text-foreground text-[11px] group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
          +{todayCheckInsCount}
        </span>
      </button>

      <span className="inline-block w-1 h-1 rounded-full bg-border" />

      {/* 4. Active Diners / Meal Shift */}
      <button
        onClick={() => navigate("/mess-catering")}
        title="View Mess & Catering Meals"
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full hover:bg-background/80 transition-all cursor-pointer group"
      >
        <UtensilsCrossed size={13} className="text-amber-500" />
        <span className="text-muted-foreground text-[11px]">Diners:</span>
        <span className="font-bold text-foreground text-[11px] group-hover:text-amber-600">
          {totalOccupied > 0 ? `${totalOccupied} / meal` : "Active"}
        </span>
      </button>
    </div>
  );
}
