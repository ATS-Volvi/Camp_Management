import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { LogIn, LogOut, Wrench, Building2, Clock, User, DoorOpen } from "lucide-react";

export type ActivityItem = {
  id: string;
  type: "check_in" | "check_out" | "maintenance";
  date: string;
  description: string;
  camp: string;
  detail: string;
  badge: string;
  employeeName?: string;
  roomNumber?: string;
};

const gradients: Record<string, string> = {
  check_in: "from-emerald-500/90 via-emerald-600/80 to-teal-700/90",
  check_out: "from-orange-500/90 via-amber-600/80 to-yellow-700/90",
  maintenance: "from-blue-500/90 via-indigo-600/80 to-violet-700/90",
};

const icons: Record<string, React.ReactNode> = {
  check_in: <LogIn size={28} className="text-white" />,
  check_out: <LogOut size={28} className="text-white" />,
  maintenance: <Wrench size={28} className="text-white" />,
};

const typeLabels: Record<string, string> = {
  check_in: "CHECK IN",
  check_out: "CHECK OUT",
  maintenance: "MAINTENANCE",
};

export default function ActivityReelCard({ item }: { item: ActivityItem }) {
  return (
    <div className="h-full w-full snap-start snap-always flex items-center justify-center p-3">
      <div
        className={`relative w-full max-w-sm h-[calc(100%-1rem)] rounded-3xl bg-gradient-to-br ${gradients[item.type]} shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-sm" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-white/5 blur-sm" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2">
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-[10px] uppercase tracking-widest font-bold">
            {typeLabels[item.type]}
          </Badge>
          <span className="text-white/70 text-xs font-medium">
            {format(new Date(item.date), "HH:mm")}
          </span>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 gap-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center ring-2 ring-white/20">
              {icons[item.type]}
            </div>
          </div>

          {/* Description */}
          <div className="text-center space-y-2">
            <h2 className="text-white text-xl font-bold leading-tight drop-shadow-md">
              {item.description}
            </h2>
            <p className="text-white/80 text-sm font-medium">{item.detail}</p>
          </div>

          {/* Info pills */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5">
              <Building2 size={16} className="text-white/80 shrink-0" />
              <span className="text-white text-sm font-medium truncate">{item.camp}</span>
            </div>
            {item.roomNumber && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5">
                <DoorOpen size={16} className="text-white/80 shrink-0" />
                <span className="text-white text-sm font-medium">Room {item.roomNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 px-5 pb-5 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white/60">
            <Clock size={13} />
            <span className="text-xs font-medium">
              {format(new Date(item.date), "dd MMM yyyy")}
            </span>
          </div>
          <Badge
            className={`text-[10px] font-bold uppercase tracking-wide border-0 ${
              item.badge === "Check In"
                ? "bg-emerald-400/30 text-emerald-100"
                : item.badge === "Check Out"
                ? "bg-amber-400/30 text-amber-100"
                : item.badge === "Resolved"
                ? "bg-green-400/30 text-green-100"
                : item.badge === "In Progress"
                ? "bg-yellow-400/30 text-yellow-100"
                : "bg-red-400/30 text-red-100"
            }`}
          >
            {item.badge}
          </Badge>
        </div>
      </div>
    </div>
  );
}
