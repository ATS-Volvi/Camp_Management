import { useMemo, useState } from "react";
import { DoorOpen, Building2, MapPin } from "lucide-react";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import { Badge } from "@/components/ui/badge";

const CATEGORY_STYLES: Record<string, { bg: string; border: string; badge: string; label: string }> = {
  executive_single: { bg: "bg-violet-500/15", border: "border-violet-400", badge: "bg-violet-500 text-white", label: "EXEC-S" },
  executive_twin:   { bg: "bg-violet-500/10", border: "border-violet-300", badge: "bg-violet-400 text-white", label: "EXEC-T" },
  supervisor_twin:  { bg: "bg-blue-500/15",   border: "border-blue-400",   badge: "bg-blue-500 text-white",   label: "SUPV" },
  staff_4bed:       { bg: "bg-teal-500/15",    border: "border-teal-400",   badge: "bg-teal-500 text-white",   label: "STAFF" },
  skilled_6bed:     { bg: "bg-amber-500/15",   border: "border-amber-400",  badge: "bg-amber-600 text-white",  label: "SKILL" },
  general_8bed:     { bg: "bg-orange-500/15",  border: "border-orange-400", badge: "bg-orange-500 text-white", label: "GEN" },
  guest_single:     { bg: "bg-pink-500/15",    border: "border-pink-400",   badge: "bg-pink-500 text-white",   label: "GUEST" },
  transit_4bed:     { bg: "bg-cyan-500/15",    border: "border-cyan-400",   badge: "bg-cyan-500 text-white",   label: "TRNST" },
};
const DEFAULT_CAT_STYLE = { bg: "bg-muted/50", border: "border-border", badge: "bg-muted-foreground text-background", label: "OTHER" };

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

interface CampItem {
  id: string;
  name: string;
  location: string;
  totalRooms?: number;
  totalCapacity?: number;
  totalOccupants?: number;
}

interface Props {
  rooms: Room[];
  selectedRoom: string;
  onSelectRoom: (roomId: string) => void;
  onViewOccupants?: (roomId: string) => void;
  mode: "check-in" | "check-out";
  camps?: CampItem[];
  selectedCamp?: string;
  onSelectCamp?: (campId: string) => void;
}

function getRoomColor(room: Room, isSelected: boolean) {
  const catStyle = CATEGORY_STYLES[room.category] || DEFAULT_CAT_STYLE;
  if (isSelected) return `ring-2 ring-primary bg-primary text-primary-foreground`;
  if (room.status === "under_maintenance") return "bg-destructive/80 text-destructive-foreground";
  if (room.status === "reserved") return "bg-amber-500/80 text-white";
  if (room.current_occupancy >= room.max_capacity) return `${catStyle.bg} ${catStyle.border} border-2 text-foreground opacity-70`;
  if (room.current_occupancy > 0) return `${catStyle.bg} ${catStyle.border} border-2 text-foreground`;
  return `${catStyle.bg} ${catStyle.border} border text-foreground hover:border-2`;
}

function getRoomStatusLabel(room: Room) {
  if (room.status === "under_maintenance") return "N/A";
  if (room.status === "reserved") return "RESERVED";
  if (room.current_occupancy >= room.max_capacity) return "FULL";
  if (room.current_occupancy > 0) return "PARTIAL";
  return "AVAILABLE";
}

export default function RoomVisualMap({ rooms, selectedRoom, onSelectRoom, onViewOccupants, mode, camps = [], selectedCamp, onSelectCamp }: Props) {
  const [activeBlock, setActiveBlock] = useState<string | null>(null);

  const roomsByBlock = useMemo(() => {
    const map = new Map<string, { name: string; rooms: Room[] }>();
    rooms.forEach(r => {
      const key = r.building_id;
      if (!map.has(key)) {
        map.set(key, { name: (r.buildings?.name) || "Block", rooms: [] });
      }
      map.get(key)!.rooms.push(r);
    });
    // Sort rooms within each block
    map.forEach(v => v.rooms.sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true })));
    return [...map.entries()];
  }, [rooms]);

  const blockNames = roomsByBlock.map(([id, data]) => ({ id, name: data.name }));
  const displayBlocks = activeBlock
    ? roomsByBlock.filter(([id]) => id === activeBlock)
    : roomsByBlock;

  const isClickable = (room: Room) => {
    // All rooms with occupants or available for check-in are clickable
    if (room.status === "under_maintenance" || room.status === "reserved") return false;
    if (mode === "check-in") return true; // available rooms open employee dialog, occupied rooms show occupants
    return room.current_occupancy > 0;
  };

  const handleRoomClick = (room: Room) => {
    if (mode === "check-in") {
      // In check-in mode: select room for check-in, show occupants only if full
      if (room.current_occupancy < room.max_capacity) {
        onSelectRoom(room.id);
      }
      if (room.current_occupancy > 0) {
        onViewOccupants?.(room.id);
      }
    } else {
      // In check-out mode: show occupants
      if (room.current_occupancy > 0) {
        onViewOccupants?.(room.id);
      }
      onSelectRoom(room.id);
    }
  };

  return (
    <div className="space-y-3">
      {/* Legend: Room types + Status */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="text-xs font-semibold text-foreground mr-1">Types:</span>
          {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
            <span key={key} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${style.badge}`}>{style.label}</span>
          ))}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-xs font-semibold text-foreground mr-1">Status:</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-foreground/20 border-2 border-foreground/40 inline-block" /> Occupied</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-muted border border-border inline-block" /> Available</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive/80 inline-block" /> Maintenance</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500/80 inline-block" /> Reserved</span>
          </div>
          {blockNames.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveBlock(null)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${!activeBlock ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                All
              </button>
              {blockNames.map(b => (
                <button
                  key={b.id}
                  onClick={() => setActiveBlock(b.id)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${activeBlock === b.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Room grid by block */}
      <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
        {displayBlocks.length === 0 && (!selectedCamp || rooms.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            <DoorOpen size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm mb-4">Select a camp to view rooms</p>
            {camps.length > 0 && !selectedCamp && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
                {camps.map(camp => (
                  <button
                    key={camp.id}
                    onClick={() => onSelectCamp?.(camp.id)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all hover:scale-105 hover:shadow-md"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Building2 size={24} className="text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground text-center leading-tight">{camp.name}</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin size={10} /> {camp.location}
                    </span>
                    {camp.totalCapacity != null && (
                      <span className="text-[10px] text-muted-foreground">
                        {camp.totalOccupants ?? 0}/{camp.totalCapacity} beds
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          displayBlocks.map(([blockId, { name, rooms: blockRooms }]) => (
            <div key={blockId}>
              <div className="inline-block bg-foreground/90 text-background text-xs font-semibold px-2.5 py-1 rounded mb-2">
                {name}
              </div>
              <div className="grid grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2">
                {blockRooms.map(room => {
                  const clickable = isClickable(room);
                  const selected = selectedRoom === room.id;
                  return (
                    <button
                      key={room.id}
                      onClick={() => clickable && handleRoomClick(room)}
                      disabled={!clickable}
                      title={`${room.room_number} · ${getRoomCategoryLabel(room.category)} · ${room.current_occupancy}/${room.max_capacity}${room.current_occupancy > 0 ? " · Click to view occupants" : ""}`}
                      className={`relative rounded-lg p-2 pt-7 pb-1.5 text-center transition-all ${getRoomColor(room, selected)} ${clickable ? "cursor-pointer hover:scale-105" : "cursor-default opacity-80"}`}
                    >
                      <span className={`absolute top-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase px-1 rounded ${(CATEGORY_STYLES[room.category] || DEFAULT_CAT_STYLE).badge}`}>
                        {(CATEGORY_STYLES[room.category] || DEFAULT_CAT_STYLE).label}
                      </span>
                      <span className="text-xs font-bold block">{room.room_number}</span>
                      <span className="text-[9px] opacity-70">{room.current_occupancy}/{room.max_capacity}</span>
                      {room.current_occupancy > 0 && mode === "check-in" && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-[8px] font-bold border border-background">
                          {room.current_occupancy}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
