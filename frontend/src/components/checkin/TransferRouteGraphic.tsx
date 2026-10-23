import { ArrowRight, MapPin, User, BedDouble } from "lucide-react";

interface Endpoint {
  campName?: string | null;
  blockName?: string | null;
  roomNumber?: string | null;
  category?: string | null;
}

interface Props {
  from: Endpoint;
  to: Endpoint;
  employeeName?: string | null;
  employeeId?: string | null;
  isInterCamp?: boolean;
  variant?: "source" | "destination";
}

/**
 * Visual representation of a room transfer — two stylized prefab buildings
 * (matching the camp-block visual style) with an animated route between them.
 */
function PrefabBuilding({ label, room, sub, tone }: { label?: string | null; room?: string | null; sub?: string | null; tone: "source" | "destination" }) {
  const accent = tone === "source" ? "from-slate-400 to-slate-600" : "from-primary to-primary/70";
  const lit = tone === "destination";

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {tone === "source" ? "From" : "To"}
      </div>
      <div className="relative w-full max-w-[180px] aspect-[5/4]">
        {/* Roof */}
        <div
          className={`absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b ${accent}`}
          style={{ clipPath: "polygon(8% 100%, 50% 0%, 92% 100%)" }}
        />
        {/* Body with corrugated siding */}
        <div
          className="absolute inset-x-[6%] top-[18%] bottom-[10%] rounded-sm border border-amber-900/20 shadow-md"
          style={{
            background:
              "repeating-linear-gradient(90deg, hsl(40 35% 88%), hsl(40 35% 88%) 6px, hsl(40 30% 80%) 6px, hsl(40 30% 80%) 8px)",
          }}
        >
          {/* Floor band */}
          <div className="absolute inset-x-0 top-1/2 h-[2px] bg-amber-900/20" />
          {/* Windows */}
          <div className="absolute inset-0 grid grid-cols-4 gap-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-[1px] ${
                  lit
                    ? "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.6)]"
                    : "bg-slate-500/30"
                }`}
              />
            ))}
          </div>
          {/* Door */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[18%] h-[28%] bg-amber-900/40 rounded-t-sm" />
        </div>
        {/* Plinth */}
        <div className="absolute inset-x-[4%] bottom-[6%] h-[6%] bg-slate-700 rounded-sm" />
        {/* Ground shadow */}
        <div className="absolute inset-x-[10%] bottom-0 h-[3%] bg-black/20 blur-sm rounded-full" />
        {/* Room badge */}
        {room && (
          <div className="absolute -top-1 -right-1 bg-background border-2 border-primary rounded-full px-2 py-0.5 text-[10px] font-bold text-primary shadow-sm">
            {room}
          </div>
        )}
      </div>
      <div className="text-center w-full">
        <div className="text-xs font-semibold truncate flex items-center justify-center gap-1">
          <MapPin size={10} className="text-muted-foreground" /> {label || "—"}
        </div>
        {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}

export default function TransferRouteGraphic({ from, to, employeeName, employeeId, isInterCamp }: Props) {
  return (
    <div className="border rounded-lg p-4 bg-gradient-to-br from-muted/30 via-background to-primary/5">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center justify-between">
        <span>Transfer Route</span>
        {isInterCamp && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
            Inter-camp
          </span>
        )}
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex-1">
          <PrefabBuilding
            label={from.campName}
            room={from.roomNumber}
            sub={[from.blockName, from.category].filter(Boolean).join(" · ") || null}
            tone="source"
          />
        </div>

        {/* Animated arrow with employee chip */}
        <div className="flex flex-col items-center justify-center px-1 gap-2 min-w-[90px]">
          {(employeeName || employeeId) && (
            <div className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/10 border border-primary/30 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <User size={14} />
              </div>
              <div className="text-[10px] font-semibold text-center leading-tight max-w-[80px] truncate">
                {employeeName || "—"}
              </div>
              {employeeId && (
                <div className="text-[9px] text-muted-foreground">{employeeId}</div>
              )}
            </div>
          )}
          <div className="relative w-full h-6 flex items-center">
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-slate-400 via-primary to-primary" />
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-pulse" />
            <ArrowRight
              size={20}
              className="relative ml-auto text-primary -mr-1 drop-shadow"
              strokeWidth={2.5}
            />
          </div>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <BedDouble size={10} /> Room move
          </div>
        </div>

        <div className="flex-1">
          <PrefabBuilding
            label={to.campName}
            room={to.roomNumber}
            sub={[to.blockName, to.category].filter(Boolean).join(" · ") || null}
            tone="destination"
          />
        </div>
      </div>
    </div>
  );
}
