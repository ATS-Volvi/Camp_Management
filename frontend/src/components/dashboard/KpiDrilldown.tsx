import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Building2, DoorOpen, BedDouble, Users } from "lucide-react";

type DrilldownType = "camps" | "rooms" | "occupants" | "vacant" | "maintenance" | "assigned" | "available" | "reserved" | null;

interface KpiDrilldownProps {
  type: DrilldownType;
  onClose: () => void;
}

const titleMap: Record<string, string> = {
  camps: "All Camps",
  rooms: "Rooms by Camp",
  occupants: "Total Occupants — Camp → Block → Room",
  vacant: "Vacant Beds — Camp → Block → Room",
  maintenance: "Under Maintenance — Rooms",
  assigned: "Assigned Beds — Camp-wise Breakdown",
  available: "Available Beds — Camp-wise Breakdown",
  reserved: "Reserved Rooms — Camp-wise Breakdown",
};

export default function KpiDrilldown({ type, onClose }: KpiDrilldownProps) {
  const navigate = useNavigate();

  if (!type) return null;

  return (
    <Dialog open={!!type} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titleMap[type]}</DialogTitle>
        </DialogHeader>
        {type === "camps" && <CampsDrilldown onNavigate={(id) => { onClose(); navigate(`/camps/${id}`); }} />}
        {type === "rooms" && <RoomsByCampDrilldown onNavigate={(id) => { onClose(); navigate(`/camps/${id}`); }} />}
        {type === "occupants" && <CapacityDrilldown mode="occupants" />}
        {type === "vacant" && <CapacityDrilldown mode="vacant" />}
        {type === "maintenance" && <MaintenanceDrilldown />}
        {type === "assigned" && <AssignedDrilldown />}
        {type === "available" && <AvailableDrilldown />}
        {type === "reserved" && <ReservedDrilldown />}
      </DialogContent>
    </Dialog>
  );
}

// ─── Assigned Beds Drilldown ───
function AssignedDrilldown() {
  const [expandedCamp, setExpandedCamp] = useState<string | null>(null);

  const { data: camps = [], isLoading } = useQuery({
    queryKey: ["drilldown-assigned"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camps")
        .select(`id, name, location, rooms(id, room_number, current_occupancy, max_capacity, status, category, buildings:building_id(name))`)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-1">
      {camps.map((camp: any) => {
        const rooms = (camp.rooms || []).filter((r: any) => r.current_occupancy > 0);
        const totalAssigned = rooms.reduce((s: number, r: any) => s + r.current_occupancy, 0);
        const totalCapacity = (camp.rooms || []).reduce((s: number, r: any) => s + r.max_capacity, 0);
        const isOpen = expandedCamp === camp.id;
        
        return (
          <div key={camp.id} className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left"
              onClick={() => setExpandedCamp(isOpen ? null : camp.id)}
            >
              <div className="flex items-center gap-3">
                <Building2 size={16} className="text-primary shrink-0" />
                <span className="font-medium text-sm">{camp.name}</span>
                <span className="text-xs text-muted-foreground">({camp.location})</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="default" className="text-xs">{totalAssigned} assigned</Badge>
                <span className="text-xs text-muted-foreground">of {totalCapacity}</span>
                <ProgressMini value={totalAssigned} max={totalCapacity} color="blue" />
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </button>
            {isOpen && rooms.length > 0 && (
              <div className="border-t">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-2 pl-6 font-medium text-muted-foreground">Room</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Block</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Category</th>
                      <th className="text-center p-2 font-medium text-muted-foreground">Occupied</th>
                      <th className="text-center p-2 font-medium text-muted-foreground">Capacity</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r: any) => (
                      <tr key={r.id} className="border-t hover:bg-muted/20">
                        <td className="p-2 pl-6 font-medium">{r.room_number}</td>
                        <td className="p-2 text-muted-foreground">{r.buildings?.name || "—"}</td>
                        <td className="p-2 capitalize text-muted-foreground">{r.category?.replace(/_/g, " ")}</td>
                        <td className="p-2 text-center font-bold text-primary">{r.current_occupancy}</td>
                        <td className="p-2 text-center">{r.max_capacity}</td>
                        <td className="p-2"><RoomStatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {isOpen && rooms.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground border-t">No occupied rooms in this camp.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Available Beds Drilldown ───
function AvailableDrilldown() {
  const [expandedCamp, setExpandedCamp] = useState<string | null>(null);

  const { data: camps = [], isLoading } = useQuery({
    queryKey: ["drilldown-available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camps")
        .select(`id, name, location, rooms(id, room_number, current_occupancy, max_capacity, status, category, buildings:building_id(name))`)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-1">
      {camps.map((camp: any) => {
        const rooms = (camp.rooms || []).filter((r: any) => r.max_capacity - r.current_occupancy > 0);
        const totalAvailable = rooms.reduce((s: number, r: any) => s + (r.max_capacity - r.current_occupancy), 0);
        const totalCapacity = (camp.rooms || []).reduce((s: number, r: any) => s + r.max_capacity, 0);
        const isOpen = expandedCamp === camp.id;

        return (
          <div key={camp.id} className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left"
              onClick={() => setExpandedCamp(isOpen ? null : camp.id)}
            >
              <div className="flex items-center gap-3">
                <Building2 size={16} className="text-green-600 dark:text-green-400 shrink-0" />
                <span className="font-medium text-sm">{camp.name}</span>
                <span className="text-xs text-muted-foreground">({camp.location})</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">{totalAvailable} available</Badge>
                <span className="text-xs text-muted-foreground">of {totalCapacity}</span>
                <ProgressMini value={totalCapacity - totalAvailable} max={totalCapacity} color="green" />
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </button>
            {isOpen && rooms.length > 0 && (
              <div className="border-t">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-2 pl-6 font-medium text-muted-foreground">Room</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Block</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Category</th>
                      <th className="text-center p-2 font-medium text-muted-foreground">Available</th>
                      <th className="text-center p-2 font-medium text-muted-foreground">Capacity</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r: any) => (
                      <tr key={r.id} className="border-t hover:bg-muted/20">
                        <td className="p-2 pl-6 font-medium">{r.room_number}</td>
                        <td className="p-2 text-muted-foreground">{r.buildings?.name || "—"}</td>
                        <td className="p-2 capitalize text-muted-foreground">{r.category?.replace(/_/g, " ")}</td>
                        <td className="p-2 text-center font-bold text-green-600 dark:text-green-400">{r.max_capacity - r.current_occupancy}</td>
                        <td className="p-2 text-center">{r.max_capacity}</td>
                        <td className="p-2"><RoomStatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {isOpen && rooms.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground border-t">All rooms are fully occupied.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Reserved Rooms Drilldown ───
function ReservedDrilldown() {
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["drilldown-reserved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_number, status, max_capacity, current_occupancy, category, camp_id, camps:camp_id(name), buildings:building_id(name)")
        .eq("status", "reserved")
        .order("room_number");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loading />;

  if (rooms.length === 0) {
    return <p className="text-center text-muted-foreground py-6 text-sm">No reserved rooms.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/50">
        <tr>
          <th className="text-left p-3 font-medium text-muted-foreground">Camp</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Block</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Room</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
          <th className="text-center p-3 font-medium text-muted-foreground">Capacity</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
        </tr>
      </thead>
      <tbody>
        {rooms.map((r: any) => (
          <tr key={r.id} className="border-b hover:bg-muted/30">
            <td className="p-3 font-medium">{r.camps?.name || "—"}</td>
            <td className="p-3">{r.buildings?.name || "—"}</td>
            <td className="p-3">{r.room_number}</td>
            <td className="p-3 capitalize text-muted-foreground">{r.category?.replace(/_/g, " ")}</td>
            <td className="p-3 text-center">{r.max_capacity}</td>
            <td className="p-3">
              <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0">Reserved</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Camps List ───
function CampsDrilldown({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { data: camps = [], isLoading } = useQuery({
    queryKey: ["drilldown-camps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camps")
        .select("id, name, location, camp_code, status, camp_type, rooms(id, max_capacity, current_occupancy)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loading />;

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/50">
        <tr>
          <th className="text-left p-3 font-medium text-muted-foreground">Camp</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Location</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
          <th className="text-center p-3 font-medium text-muted-foreground">Rooms</th>
          <th className="text-center p-3 font-medium text-muted-foreground">Capacity</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
        </tr>
      </thead>
      <tbody>
        {camps.map((c: any) => (
          <tr
            key={c.id}
            className="border-b hover:bg-muted/30 cursor-pointer"
            onClick={() => onNavigate(c.id)}
          >
            <td className="p-3 font-medium">{c.name}</td>
            <td className="p-3 font-mono text-xs">{c.camp_code || "—"}</td>
            <td className="p-3 text-muted-foreground">{c.location}</td>
            <td className="p-3 capitalize">{c.camp_type}</td>
            <td className="p-3 text-center">{c.rooms?.length || 0}</td>
            <td className="p-3 text-center">{c.rooms?.reduce((s: number, r: any) => s + r.max_capacity, 0) || 0}</td>
            <td className="p-3">
              <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize text-xs">
                {c.status}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Rooms by Camp ───
function RoomsByCampDrilldown({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [expandedCamp, setExpandedCamp] = useState<string | null>(null);

  const { data: camps = [], isLoading } = useQuery({
    queryKey: ["drilldown-rooms-by-camp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camps")
        .select("id, name, location, rooms(id, room_number, status, max_capacity, current_occupancy, floor, ac, attached_bathroom, buildings:building_id(name))")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-1">
      {camps.map((camp: any) => {
        const isOpen = expandedCamp === camp.id;
        const rooms = camp.rooms || [];
        return (
          <div key={camp.id} className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left"
              onClick={() => setExpandedCamp(isOpen ? null : camp.id)}
            >
              <div className="flex items-center gap-3">
                <Building2 size={16} className="text-primary shrink-0" />
                <span className="font-medium text-sm">{camp.name}</span>
                <span className="text-xs text-muted-foreground">({camp.location})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{rooms.length} rooms</span>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </button>
            {isOpen && rooms.length > 0 && (
              <div className="border-t">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-2 pl-10 font-medium text-muted-foreground">Room</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Block</th>
                      <th className="text-center p-2 font-medium text-muted-foreground">Floor</th>
                      <th className="text-center p-2 font-medium text-muted-foreground">Capacity</th>
                      <th className="text-center p-2 font-medium text-muted-foreground">Occupied</th>
                      <th className="text-center p-2 font-medium text-muted-foreground">AC</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r: any) => (
                      <tr key={r.id} className="border-t hover:bg-muted/20">
                        <td className="p-2 pl-10 font-medium">{r.room_number}</td>
                        <td className="p-2 text-muted-foreground">{r.buildings?.name || "—"}</td>
                        <td className="p-2 text-center">{r.floor}</td>
                        <td className="p-2 text-center">{r.max_capacity}</td>
                        <td className="p-2 text-center">{r.current_occupancy}</td>
                        <td className="p-2 text-center">{r.ac ? "✓" : "—"}</td>
                        <td className="p-2">
                          <RoomStatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Capacity Drilldown (Occupants / Vacant) — Camp → Block → Room ───
function CapacityDrilldown({ mode }: { mode: "occupants" | "vacant" }) {
  const [expandedCamp, setExpandedCamp] = useState<string | null>(null);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  const { data: camps = [], isLoading } = useQuery({
    queryKey: ["drilldown-capacity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camps")
        .select(`
          id, name, location,
          rooms(id, room_number, max_capacity, current_occupancy, status, building_id,
            buildings:building_id(id, name)
          )
        `)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loading />;

  const isVacant = mode === "vacant";
  const valueLabel = isVacant ? "Available Beds" : "Occupied Beds";

  return (
    <div className="space-y-1">
      {camps.map((camp: any) => {
        const rooms = camp.rooms || [];
        const campValue = isVacant
          ? rooms.reduce((s: number, r: any) => s + (r.max_capacity - r.current_occupancy), 0)
          : rooms.reduce((s: number, r: any) => s + r.current_occupancy, 0);
        const campCapacity = rooms.reduce((s: number, r: any) => s + r.max_capacity, 0);
        const isCampOpen = expandedCamp === camp.id;

        // Group rooms by block
        const blockMap: Record<string, { name: string; rooms: any[] }> = {};
        rooms.forEach((r: any) => {
          const bid = r.building_id;
          if (!blockMap[bid]) {
            blockMap[bid] = { name: r.buildings?.name || "Unknown", rooms: [] };
          }
          blockMap[bid].rooms.push(r);
        });

        return (
          <div key={camp.id} className="border rounded-lg overflow-hidden">
            {/* Camp Level */}
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left"
              onClick={() => { setExpandedCamp(isCampOpen ? null : camp.id); setExpandedBlock(null); }}
            >
              <div className="flex items-center gap-3">
                <Building2 size={16} className="text-primary shrink-0" />
                <span className="font-medium text-sm">{camp.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium">
                  {campValue} / {campCapacity}
                </span>
                <ProgressMini value={isVacant ? campCapacity - campValue : campValue} max={campCapacity} color={isVacant ? "green" : "blue"} />
                {isCampOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </button>

            {isCampOpen && (
              <div className="border-t pl-4">
                {Object.entries(blockMap).map(([bid, block]) => {
                  const blockValue = isVacant
                    ? block.rooms.reduce((s, r) => s + (r.max_capacity - r.current_occupancy), 0)
                    : block.rooms.reduce((s, r) => s + r.current_occupancy, 0);
                  const blockCap = block.rooms.reduce((s, r) => s + r.max_capacity, 0);
                  const isBlockOpen = expandedBlock === bid;

                  return (
                    <div key={bid} className="border-b last:border-0">
                      {/* Block Level */}
                      <button
                        className="w-full flex items-center justify-between p-2.5 hover:bg-muted/30 text-left"
                        onClick={() => setExpandedBlock(isBlockOpen ? null : bid)}
                      >
                        <div className="flex items-center gap-2">
                          <DoorOpen size={14} className="text-muted-foreground" />
                          <span className="text-sm">{block.name}</span>
                          <span className="text-xs text-muted-foreground">({block.rooms.length} rooms)</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-medium">{blockValue} / {blockCap}</span>
                          <ProgressMini value={isVacant ? blockCap - blockValue : blockValue} max={blockCap} color={isVacant ? "green" : "blue"} />
                          {isBlockOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      </button>

                      {/* Room Level */}
                      {isBlockOpen && (
                        <div className="border-t bg-muted/10">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/30">
                                <th className="text-left p-2 pl-8 font-medium text-muted-foreground">Room</th>
                                <th className="text-center p-2 font-medium text-muted-foreground">Capacity</th>
                                <th className="text-center p-2 font-medium text-muted-foreground">Occupied</th>
                                <th className="text-center p-2 font-medium text-muted-foreground">{valueLabel}</th>
                                <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {block.rooms.map((r) => {
                                const val = isVacant ? r.max_capacity - r.current_occupancy : r.current_occupancy;
                                return (
                                  <tr key={r.id} className="border-t hover:bg-muted/20">
                                    <td className="p-2 pl-8 font-medium">{r.room_number}</td>
                                    <td className="p-2 text-center">{r.max_capacity}</td>
                                    <td className="p-2 text-center">{r.current_occupancy}</td>
                                    <td className="p-2 text-center font-bold">
                                      <span className={isVacant ? "text-green-600" : "text-primary"}>{val}</span>
                                    </td>
                                    <td className="p-2"><RoomStatusBadge status={r.status} /></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Maintenance Drilldown ───
function MaintenanceDrilldown() {
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["drilldown-maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_number, status, max_capacity, camp_id, camps:camp_id(name), buildings:building_id(name)")
        .eq("status", "under_maintenance")
        .order("room_number");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loading />;

  if (rooms.length === 0) {
    return <p className="text-center text-muted-foreground py-6 text-sm">No rooms under maintenance.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/50">
        <tr>
          <th className="text-left p-3 font-medium text-muted-foreground">Camp</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Block</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Room</th>
          <th className="text-center p-3 font-medium text-muted-foreground">Capacity</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
        </tr>
      </thead>
      <tbody>
        {rooms.map((r: any) => (
          <tr key={r.id} className="border-b hover:bg-muted/30">
            <td className="p-3 font-medium">{r.camps?.name || "—"}</td>
            <td className="p-3">{r.buildings?.name || "—"}</td>
            <td className="p-3">{r.room_number}</td>
            <td className="p-3 text-center">{r.max_capacity}</td>
            <td className="p-3">
              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">Maintenance</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Helpers ───
function Loading() {
  return <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>;
}

function RoomStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    vacant: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    occupied: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    partially_occupied: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    reserved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    under_maintenance: "bg-muted text-muted-foreground",
  };
  const label: Record<string, string> = {
    vacant: "Vacant",
    occupied: "Full",
    partially_occupied: "Partial",
    reserved: "Reserved",
    under_maintenance: "Maintenance",
  };
  return (
    <Badge variant="secondary" className={`text-xs ${map[status] || ""}`}>
      {label[status] || status}
    </Badge>
  );
}

function ProgressMini({ value, max, color }: { value: number; max: number; color: "green" | "blue" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color === "green" ? "bg-green-500" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export type { DrilldownType };
