import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Bed, BedDouble, User, CheckCircle2, ChevronLeft, ChevronRight, X,
  Building2, Users, Sparkles, AlertTriangle, ShieldAlert, Clock, ArrowRight,
  Info
} from "lucide-react";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Room {
  id: string;
  room_number: string;
  category: string;
  current_occupancy: number;
  max_capacity: number;
  status: string;
  building_id: string;
  buildings?: { name: string } | null;
}

interface RoomSeatMapPickerProps {
  room: Room;
  campId: string;
  allRooms?: Room[];
  selectedBedIndex?: number | null;
  onSelectBed?: (roomId: string, bedNumber: number) => void;
  onSelectRoom: (roomId: string) => void;
  onClose: () => void;
  mode?: "check-in" | "check-out";
  onCheckOutEmployee?: (employeeId: string) => void;
}

// Map common nationalities to flag emoji & ISO code
const NATIONALITY_FLAGS: Record<string, { flag: string; code: string }> = {
  indian: { flag: "🇮🇳", code: "IND" },
  india: { flag: "🇮🇳", code: "IND" },
  filipino: { flag: "🇵🇭", code: "PHL" },
  philippines: { flag: "🇵🇭", code: "PHL" },
  pakistani: { flag: "🇵🇰", code: "PAK" },
  pakistan: { flag: "🇵🇰", code: "PAK" },
  bangladeshi: { flag: "🇧🇩", code: "BGD" },
  bangladesh: { flag: "🇧🇩", code: "BGD" },
  nepali: { flag: "🇳🇵", code: "NPL" },
  nepal: { flag: "🇳🇵", code: "NPL" },
  egyptian: { flag: "🇪🇬", code: "EGY" },
  egypt: { flag: "🇪🇬", code: "EGY" },
  saudi: { flag: "🇸🇦", code: "SAU" },
  yemeni: { flag: "🇾🇪", code: "YEM" },
  sri_lankan: { flag: "🇱🇰", code: "LKA" },
};

function getNationalityBadge(nat?: string | null) {
  if (!nat) return { flag: "🌐", code: "EXP" };
  const lower = nat.toLowerCase().trim().replace(/[\s-]/g, "_");
  return NATIONALITY_FLAGS[lower] || { flag: "🌐", code: nat.slice(0, 3).toUpperCase() };
}

export default function RoomSeatMapPicker({
  room,
  campId,
  allRooms = [],
  selectedBedIndex,
  onSelectBed,
  onSelectRoom,
  onClose,
  mode = "check-in",
  onCheckOutEmployee,
}: RoomSeatMapPickerProps) {
  const [internalSelectedBed, setInternalSelectedBed] = useState<number | null>(
    selectedBedIndex ?? null
  );

  // Fetch current occupants in this room
  const { data: occupants = [], isLoading } = useQuery({
    queryKey: ["room-seat-map-occupants", room.id, campId],
    enabled: !!room.id && !!campId,
    queryFn: async () => {
      const { data: checkIns, error: ciErr } = await supabase
        .from("check_ins")
        .select("employee_id, check_in_date")
        .eq("room_id", room.id)
        .eq("camp_id", campId)
        .order("check_in_date", { ascending: false });
      if (ciErr) throw ciErr;

      const { data: checkOuts, error: coErr } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date")
        .eq("room_id", room.id)
        .eq("camp_id", campId)
        .order("check_out_date", { ascending: false });
      if (coErr) throw coErr;

      const latestCheckOut = new Map<string, string>();
      (checkOuts || []).forEach((co) => {
        if (!latestCheckOut.has(co.employee_id)) {
          latestCheckOut.set(co.employee_id, co.check_out_date);
        }
      });

      const activeMap = new Map<string, string>();
      (checkIns || []).forEach((ci) => {
        if (activeMap.has(ci.employee_id)) return;
        const lastOut = latestCheckOut.get(ci.employee_id);
        if (!lastOut || new Date(ci.check_in_date) > new Date(lastOut)) {
          activeMap.set(ci.employee_id, ci.check_in_date);
        }
      });

      if (activeMap.size === 0) return [];

      const { data: employees, error: empErr } = await supabase
        .from("employees")
        .select("id, name, employee_id, designation, company, supplier_name, nationality, phone")
        .in("id", [...activeMap.keys()]);
      if (empErr) throw empErr;

      return (employees || []).map((emp) => ({
        ...emp,
        check_in_date: activeMap.get(emp.id) || null,
      }));
    },
  });

  // Calculate current room position among all rooms to allow prev/next navigation
  const currentIndex = allRooms.findIndex((r) => r.id === room.id);
  const prevRoom = currentIndex > 0 ? allRooms[currentIndex - 1] : null;
  const nextRoom = currentIndex >= 0 && currentIndex < allRooms.length - 1 ? allRooms[currentIndex + 1] : null;

  // Build the array of bed slots based on max_capacity
  const capacity = Math.max(room.max_capacity || 1, 1);
  const bedSlots = useMemo(() => {
    return Array.from({ length: capacity }, (_, i) => {
      const occupant = occupants[i] || null;
      const bedNumber = i + 1;
      const isBunk = capacity >= 4;
      const tier = isBunk ? (i % 2 === 0 ? "Lower Bunk" : "Upper Bunk") : `Bed ${bedNumber}`;
      const bunkUnit = isBunk ? String.fromCharCode(65 + Math.floor(i / 2)) : null;

      return {
        bedNumber,
        tier,
        bunkUnit,
        occupant,
        isOccupied: !!occupant,
      };
    });
  }, [capacity, occupants]);

  const handleBedClick = (bedNumber: number, isOccupied: boolean, occupantId?: string) => {
    if (mode === "check-in") {
      if (isOccupied) return;
      setInternalSelectedBed(bedNumber);
      onSelectRoom(room.id);
      onSelectBed?.(room.id, bedNumber);
    } else {
      // Check-out mode
      if (isOccupied && occupantId) {
        setInternalSelectedBed(bedNumber);
        onSelectRoom(room.id);
        onCheckOutEmployee?.(occupantId);
      }
    }
  };

  const occupancyPercent = Math.min(
    100,
    Math.round(((occupants.length || room.current_occupancy) / capacity) * 100)
  );

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-card via-card/95 to-primary/5 p-4 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Header bar: Room Details + Navigation + Close */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
            <BedDouble size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Room {room.room_number}
              </h3>
              <Badge variant="outline" className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 border-primary/40 bg-primary/5 text-primary">
                {getRoomCategoryLabel(room.category)}
              </Badge>
              {room.buildings?.name && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                  <Building2 size={12} className="opacity-70" />
                  {room.buildings.name}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span>Beds: <strong className="text-foreground">{room.current_occupancy}/{capacity}</strong> occupied</span>
              <span className="inline-block w-1 h-1 rounded-full bg-border" />
              <span className={occupancyPercent >= 100 ? "text-destructive font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>
                {capacity - (occupants.length || room.current_occupancy)} Available
              </span>
            </p>
          </div>
        </div>

        {/* Prev / Next & Close */}
        <div className="flex items-center gap-1.5">
          {prevRoom && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-border/70 hover:bg-muted"
              onClick={() => onSelectRoom(prevRoom.id)}
              title={`Previous: Room ${prevRoom.room_number}`}
            >
              <ChevronLeft size={16} />
            </Button>
          )}
          {nextRoom && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-border/70 hover:bg-muted"
              onClick={() => onSelectRoom(nextRoom.id)}
              title={`Next: Room ${nextRoom.room_number}`}
            >
              <ChevronRight size={16} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground ml-1"
            onClick={onClose}
            title="Close seat map"
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Capacity progress bar */}
      <div className="space-y-1.5 bg-muted/40 p-2.5 rounded-xl border border-border/40">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground text-[11px] flex items-center gap-1.5">
            <Users size={12} className="text-primary" />
            Live Bed Occupancy
          </span>
          <span className="font-semibold text-xs text-foreground">
            {occupancyPercent}% Full
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/50">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              occupancyPercent >= 100
                ? "bg-destructive"
                : occupancyPercent >= 75
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
      </div>

      {/* Guide Banner */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/15 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5 text-foreground font-medium">
          <Sparkles size={13} className="text-primary" />
          {mode === "check-in"
            ? "Click an available bed slot below to assign room instantly"
            : "Click an occupied bed slot to initiate clearance & check-out"}
        </span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block" /> Occupied
          </span>
        </div>
      </div>

      {/* Seat-Map Visual Bed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3 pt-1">
        {bedSlots.map((slot) => {
          const isSelected = internalSelectedBed === slot.bedNumber;
          const { flag, code } = getNationalityBadge(slot.occupant?.nationality);

          if (slot.isOccupied && slot.occupant) {
            // OCCUPIED BED CARD
            return (
              <div
                key={slot.bedNumber}
                onClick={() => handleBedClick(slot.bedNumber, true, slot.occupant?.id)}
                className={`relative flex flex-col justify-between p-3 rounded-xl border transition-all ${
                  mode === "check-out"
                    ? "cursor-pointer hover:border-destructive/60 hover:bg-destructive/5 hover:shadow-md"
                    : "cursor-default bg-muted/30 border-border/70"
                } ${isSelected && mode === "check-out" ? "ring-2 ring-destructive bg-destructive/10 border-destructive" : ""}`}
              >
                {/* Bed Tag */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground border border-border/80">
                      {slot.bunkUnit ? `Bunk ${slot.bunkUnit} · ` : ""}Bed {slot.bedNumber}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {slot.tier}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
                    Occupied
                  </Badge>
                </div>

                {/* Occupant details */}
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 mt-0.5">
                    {slot.occupant.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">
                      {slot.occupant.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {slot.occupant.designation || slot.occupant.employee_id}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground flex items-center gap-0.5">
                        <span>{flag}</span> {code}
                      </span>
                      {slot.occupant.company && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[90px]">{slot.occupant.company}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer timestamp */}
                {slot.occupant.check_in_date && (
                  <div className="mt-2 pt-1.5 border-t border-border/40 text-[9px] text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      In: {slot.occupant.check_in_date.slice(0, 10)}
                    </span>
                    {mode === "check-out" && (
                      <span className="text-[10px] text-destructive font-medium flex items-center gap-0.5">
                        Select to Checkout &rarr;
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          }

          // VACANT BED CARD (SELECTABLE)
          return (
            <div
              key={slot.bedNumber}
              onClick={() => handleBedClick(slot.bedNumber, false)}
              className={`group relative flex flex-col justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-md scale-[1.01]"
                  : "border-dashed border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500 hover:bg-emerald-500/10 hover:shadow-sm"
              }`}
            >
              {/* Bed Label */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  }`}>
                    {slot.bunkUnit ? `Bunk ${slot.bunkUnit} · ` : ""}Bed {slot.bedNumber}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {slot.tier}
                  </span>
                </div>
                <Badge variant="outline" className="text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40">
                  Vacant
                </Badge>
              </div>

              {/* Vacant Bed Graphic */}
              <div className="py-2.5 flex flex-col items-center justify-center text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                }`}>
                  {isSelected ? <CheckCircle2 size={20} /> : <Bed size={20} />}
                </div>
                <p className="text-xs font-bold text-foreground mt-2">
                  {isSelected ? "Bed Selected" : "Available for Allocation"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isSelected ? "Click other beds to switch" : "Click to select this bed"}
                </p>
              </div>

              {/* Action Button Indicator */}
              <div className="mt-1 pt-2 border-t border-emerald-500/20 flex items-center justify-center">
                <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                  isSelected ? "text-primary" : "text-emerald-600 dark:text-emerald-400 group-hover:underline"
                }`}>
                  {isSelected ? (
                    <>
                      <CheckCircle2 size={12} /> Assigned to this Check-in
                    </>
                  ) : (
                    <>
                      Select Bed {slot.bedNumber} <ArrowRight size={11} />
                    </>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
