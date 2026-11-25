import { useNavigate } from "react-router-dom";
import {
  BedDouble,
  BarChart3,
  Users,
  UtensilsCrossed,
  Building,
  FileBarChart,
  ArrowLeft,
} from "lucide-react";
import campImage from "@/assets/camp-3d.jpg";

const tiles = [
  {
    label: "Camp Management",
    icon: BedDouble,
    path: "/camps",
    highlight: "emerald",
  },
  {
    label: "Catering Division",
    icon: UtensilsCrossed,
    path: "/catering/pantry-command-center",
    highlight: "amber",
  },
  {
    label: "Occupancy Tracking",
    icon: BarChart3,
    path: "/check-in-out",
  },
  {
    label: "Employee Management",
    icon: Users,
    path: "/inmates-report",
  },
  {
    label: "Facility Management",
    icon: Building,
    path: "/assets",
  },
  {
    label: "Reports",
    icon: FileBarChart,
    path: "/dashboards/board",
  },
];

export default function CampHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted overflow-hidden font-sans">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Launchpad
        </button>
        <h1 className="mt-4 text-3xl font-bold text-foreground tracking-tight">Camp-365</h1>
        <p className="text-muted-foreground text-sm">Choose a division to continue</p>
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-6 pb-12 lg:grid-cols-[minmax(0,440px)_1fr]">
        <div className="relative z-10 rounded-3xl border border-border/60 bg-card/60 p-6 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-4">
            {tiles.map((t) => {
              const isEmerald = t.highlight === "emerald";
              const isAmber = t.highlight === "amber";

              return (
                <button
                  key={t.label}
                  onClick={() => navigate(t.path)}
                  className={`group flex items-center gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    isEmerald
                      ? "border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500/70"
                      : isAmber
                      ? "border-amber-500/40 bg-amber-500/10 hover:border-amber-500/70"
                      : "border-border/50 bg-background/70 hover:border-primary/40"
                  }`}
                >
                  <t.icon
                    className={`h-6 w-6 shrink-0 ${
                      isEmerald
                        ? "text-emerald-500"
                        : isAmber
                        ? "text-amber-500"
                        : "text-primary"
                    }`}
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-semibold leading-tight text-foreground block">
                      {t.label}
                    </span>
                    {isEmerald && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                        Management
                      </span>
                    )}
                    {isAmber && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-medium">
                        Catering-365
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <img
          src={campImage}
          alt="3D view of the camp"
          width={1536}
          height={1024}
          className="w-full rounded-3xl mix-blend-multiply shadow-2xl"
        />
      </div>
    </div>
  );
}
