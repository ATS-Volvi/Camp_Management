import { useNavigate } from "react-router-dom";
import { BedDouble, BarChart3, Users, UtensilsCrossed, Building, FileBarChart, ArrowLeft } from "lucide-react";
import campImage from "@/assets/camp-3d.jpg";

const tiles = [
  { label: "Camp Management", icon: BedDouble, path: "/camps" },
  { label: "Occupancy Tracking", icon: BarChart3, path: "/check-in-out" },
  { label: "Employee Management", icon: Users, path: "/inmates-report" },
  { label: "Catering Division", icon: UtensilsCrossed, path: "/mess-catering" },
  { label: "Facility Management", icon: Building, path: "/assets" },
  { label: "Reports", icon: FileBarChart, path: "/dashboards/board" },
];

export default function CampHub() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Launchpad
        </button>
        <h1 className="mt-4 text-3xl font-bold text-foreground">Camp-365</h1>
        <p className="text-muted-foreground">Choose a division to continue</p>
      </div>
      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-6 pb-12 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="relative z-10 rounded-3xl border border-border/60 bg-card/60 p-6 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-4">
            {tiles.map((t) => (
              <button
                key={t.label}
                onClick={() => navigate(t.path)}
                className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-background/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <t.icon className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.5} />
                <span className="text-sm font-medium leading-tight text-foreground">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        <img src={campImage} alt="3D view of the camp" width={1536} height={1024} className="w-full rounded-3xl mix-blend-multiply" />
      </div>
    </div>
  );
}
