import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator, CommandShortcut
} from "@/components/ui/command";
import {
  Home, Gauge, Users, Building2, LogIn, Wrench, Cog, Package, Box,
  ClipboardList, UtensilsCrossed, ChefHat, Ban, UserCheck, Sparkles,
  AlertTriangle, ShieldCheck, LineChart, BarChart3, Activity, Bell,
  UserCog, Shield, FileText, Truck, BedDouble, Search, PlusCircle,
  TrendingUp, MapPin
} from "lucide-react";

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function GlobalCommandPalette({ open: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const navigate = useNavigate();

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    setInternalOpen(value);
  };

  // Keyboard shortcut listener (Ctrl + K or Cmd + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen]);

  // Query camps for dynamic camp search
  const { data: camps = [] } = useQuery({
    queryKey: ["command-palette-camps"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name, location");
      if (error) return [];
      return data || [];
    },
  });

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <div className="flex items-center border-b px-3 bg-muted/20">
        <CommandInput
          placeholder="Type a command, page, or search camps..."
          className="text-sm h-12"
        />
      </div>

      <CommandList className="max-h-[380px] overflow-y-auto p-2">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          No matching commands or camps found.
        </CommandEmpty>

        {/* 1. QUICK ACTIONS */}
        <CommandGroup heading="⚡ Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => navigate("/check-in-out"))}
            className="cursor-pointer gap-2.5 rounded-lg py-2.5"
          >
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <LogIn size={15} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-xs text-foreground">Inmate Check-In / Check-Out</span>
              <span className="text-[10px] text-muted-foreground">Process room assignment or employee clearance</span>
            </div>
            <CommandShortcut className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">Check-in</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/maintenance"))}
            className="cursor-pointer gap-2.5 rounded-lg py-2.5"
          >
            <div className="w-7 h-7 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Wrench size={15} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-xs text-foreground">Report Repair & Maintenance Issue</span>
              <span className="text-[10px] text-muted-foreground">Log plumbing, HVAC, electrical, or structural tickets</span>
            </div>
            <CommandShortcut className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">Tickets</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/ai-reports"))}
            className="cursor-pointer gap-2.5 rounded-lg py-2.5"
          >
            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles size={15} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-xs text-foreground">AI Intelligence & Chat Reports</span>
              <span className="text-[10px] text-muted-foreground">Ask natural language questions about camp operations</span>
            </div>
            <CommandShortcut className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">AI</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/anomaly-report"))}
            className="cursor-pointer gap-2.5 rounded-lg py-2.5"
          >
            <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle size={15} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-xs text-foreground">Run AI Anomaly Scan</span>
              <span className="text-[10px] text-muted-foreground">Detect occupancy mismatches, inventory leaks & duplicate check-ins</span>
            </div>
            <CommandShortcut className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">Scan</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-2" />

        {/* 2. DYNAMIC CAMPS */}
        {camps.length > 0 && (
          <>
            <CommandGroup heading="🏢 Camps & Locations">
              {camps.map((camp) => (
                <CommandItem
                  key={camp.id}
                  onSelect={() => runCommand(() => navigate(`/camps/${camp.id}`))}
                  className="cursor-pointer gap-2.5 rounded-lg py-2"
                >
                  <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Building2 size={13} />
                  </div>
                  <span className="text-xs font-semibold text-foreground flex-1">{camp.name}</span>
                  {camp.location && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin size={10} /> {camp.location}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator className="my-2" />
          </>
        )}

        {/* 3. CORE OPERATIONS */}
        <CommandGroup heading="📊 Dashboards & Analytics">
          <CommandItem onSelect={() => runCommand(() => navigate("/home"))} className="cursor-pointer gap-2 py-2">
            <Home size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Home Executive Overview</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))} className="cursor-pointer gap-2 py-2">
            <Gauge size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Operations Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/bottomline"))} className="cursor-pointer gap-2 py-2">
            <LineChart size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Bottomline Financial Report</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/reports"))} className="cursor-pointer gap-2 py-2">
            <BarChart3 size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Operational & Supplier Reports</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/staff-kpi"))} className="cursor-pointer gap-2 py-2">
            <TrendingUp size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Staff KPI Monitoring</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-2" />

        {/* 4. WORKFORCE & INVENTORY */}
        <CommandGroup heading="👥 Workforce, Assets & Logistics">
          <CommandItem onSelect={() => runCommand(() => navigate("/employees"))} className="cursor-pointer gap-2 py-2">
            <Users size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Employee Master</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/attendance"))} className="cursor-pointer gap-2 py-2">
            <ClipboardList size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Daily Camp Attendance</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/visitors"))} className="cursor-pointer gap-2 py-2">
            <UserCheck size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Visitor Pass Management</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/assets"))} className="cursor-pointer gap-2 py-2">
            <Box size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Asset & Equipment Register</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/inventory"))} className="cursor-pointer gap-2 py-2">
            <Package size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Material Inventory Management</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/preventive-maintenance"))} className="cursor-pointer gap-2 py-2">
            <Cog size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Preventive Maintenance Schedule</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-2" />

        {/* 5. CATERING & KITCHEN */}
        <CommandGroup heading="🍽️ Mess, Catering & Kitchen">
          <CommandItem onSelect={() => runCommand(() => navigate("/mess-catering"))} className="cursor-pointer gap-2 py-2">
            <UtensilsCrossed size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Mess & Catering Master</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/meal-management"))} className="cursor-pointer gap-2 py-2">
            <UtensilsCrossed size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Smart Meal Scheduling</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/grocery-inventory"))} className="cursor-pointer gap-2 py-2">
            <Package size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Grocery & Provisions Stock</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/cook-requests"))} className="cursor-pointer gap-2 py-2">
            <ChefHat size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Cook Requests & Purchase Orders</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/food-cancellation"))} className="cursor-pointer gap-2 py-2">
            <Ban size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Food Cancellations</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/food-safety"))} className="cursor-pointer gap-2 py-2">
            <ShieldCheck size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Food Safety & Hygiene Audit</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-2" />

        {/* 6. ADMIN & CONFIGURATION */}
        <CommandGroup heading="⚙️ Administration">
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/users"))} className="cursor-pointer gap-2 py-2">
            <UserCog size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">User & Access Management</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/permissions"))} className="cursor-pointer gap-2 py-2">
            <Shield size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Role Permission Matrix</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/suppliers"))} className="cursor-pointer gap-2 py-2">
            <Truck size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Supplier Master & Rates</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/room-categories"))} className="cursor-pointer gap-2 py-2">
            <BedDouble size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Room Categories & Bed Limits</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/audit-logs"))} className="cursor-pointer gap-2 py-2">
            <FileText size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">System Audit Logs</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>

      {/* Footer navigation hints */}
      <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 bg-muted/30 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Navigate with <kbd className="px-1 py-0.5 bg-background border rounded text-[10px] font-mono">↑</kbd> <kbd className="px-1 py-0.5 bg-background border rounded text-[10px] font-mono">↓</kbd></span>
          <span>•</span>
          <span>Select <kbd className="px-1 py-0.5 bg-background border rounded text-[10px] font-mono">↵</kbd></span>
        </div>
        <div className="flex items-center gap-1">
          <span>Close <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">ESC</kbd></span>
        </div>
      </div>
    </CommandDialog>
  );
}
