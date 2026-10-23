import { Building2, ShieldCheck, Users, Truck, Calculator, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const apps = [
  {
    name: "Camp-365",
    description: "Complete camp management — rooms, employees, catering, maintenance & more",
    icon: Building2,
    gradient: "from-emerald-500 to-teal-600",
    bgGlow: "bg-emerald-500/10",
    borderAccent: "border-emerald-500/30",
    internal: true,
    path: "/dashboard",
  },
  {
    name: "SafetyFirst LMS",
    description: "Safety training, compliance tracking & learning management system",
    icon: ShieldCheck,
    gradient: "from-orange-500 to-red-500",
    bgGlow: "bg-orange-500/10",
    borderAccent: "border-orange-500/30",
    internal: false,
    url: "https://id-preview--fc22334a-dc50-472d-936a-606324de7df1.lovable.app",
  },
  {
    name: "TalentStream ATS",
    description: "Applicant tracking, recruitment pipeline & talent acquisition platform",
    icon: Users,
    gradient: "from-violet-500 to-purple-600",
    bgGlow: "bg-violet-500/10",
    borderAccent: "border-violet-500/30",
    internal: false,
    url: "https://id-preview--eef2f7a3-c219-401a-8ad7-b89e78dc9eef.lovable.app",
  },
  {
    name: "Fleet Guard",
    description: "Vehicle fleet management, tracking, driver assignments & maintenance logs",
    icon: Truck,
    gradient: "from-sky-500 to-blue-600",
    bgGlow: "bg-sky-500/10",
    borderAccent: "border-sky-500/30",
    internal: false,
    url: "https://id-preview--1c2de910-1f72-4d7c-9c0b-d7338cbce127.lovable.app",
  },
  {
    name: "CosTrack 365",
    description: "Cost tracking, budget management & financial reporting across projects",
    icon: Calculator,
    gradient: "from-amber-500 to-yellow-600",
    bgGlow: "bg-amber-500/10",
    borderAccent: "border-amber-500/30",
    internal: false,
    url: "https://id-preview--4afd02bd-c0ba-40dd-9925-3426381c7f6e.lovable.app",
  },
  {
    name: "PMS 360",
    description: "Enterprise performance management — KRAs, KPIs, reviews, calibration & analytics",
    icon: Target,
    gradient: "from-rose-500 to-pink-600",
    bgGlow: "bg-rose-500/10",
    borderAccent: "border-rose-500/30",
    internal: false,
    url: "#",
  },
];

export default function Launchpad() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-lg">E</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground leading-tight">Expertise Contracting</h1>
            <p className="text-xs text-muted-foreground">Application Suite</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-5xl space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Welcome back 👋</h2>
            <p className="text-muted-foreground">Choose an application to get started</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <button
                key={app.name}
                onClick={() => {
                  if (app.internal) {
                    navigate(app.path!);
                  } else {
                    window.open(app.url!, "_blank");
                  }
                }}
                className={`group relative overflow-hidden rounded-2xl border ${app.borderAccent} bg-card p-8 text-left transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1`}
              >
                {/* Glow */}
                <div className={`absolute -top-20 -right-20 w-48 h-48 rounded-full ${app.bgGlow} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative space-y-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg`}>
                    <app.icon className="text-white" size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">{app.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{app.description}</p>
                  </div>
                  <div className={`inline-flex items-center gap-1 text-sm font-medium bg-gradient-to-r ${app.gradient} bg-clip-text text-transparent`}>
                    {app.internal ? "Open App →" : "Launch in new tab ↗"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border/30">
        © folkslogic. 2024. All Rights Reserved.
      </footer>
    </div>
  );
}
