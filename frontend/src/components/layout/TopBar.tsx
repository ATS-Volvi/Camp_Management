import { Bell, MapPin } from "lucide-react";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function TopBar() {
  return (
    <header className="h-14 bg-card border-b flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
          EC
        </div>
        <span className="font-medium text-foreground">Expertise Contracting Co.</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="px-4 py-1.5 rounded-full border-2 border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
          Camp Management
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm text-foreground hover:bg-muted transition-colors">
          <MapPin size={14} />
          Al Jubail
        </button>
        <ThemeSwitcher />
        <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
          <Bell size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          A
        </div>
      </div>
    </header>
  );
}
