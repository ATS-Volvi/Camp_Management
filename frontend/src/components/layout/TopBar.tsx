import { Bell, MapPin, Search } from "lucide-react";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import OperationsPulseTicker from "./OperationsPulseTicker";

export default function TopBar() {
  const triggerCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  };

  return (
    <header className="h-14 bg-card border-b flex items-center justify-between px-6 shrink-0 gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
          EC
        </div>
        <span className="font-medium text-foreground hidden sm:inline-block">Expertise Contracting Co.</span>
      </div>

      {/* Center Live Operations Pulse Ticker */}
      <div className="flex items-center justify-center flex-1">
        <OperationsPulseTicker />
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Quick Search / Command Palette Button */}
        <button
          onClick={triggerCommandPalette}
          title="Open Command Palette (Ctrl + K)"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/70 bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Search size={13} className="text-muted-foreground" />
          <span className="hidden xl:inline-block text-[11px] font-medium">Search...</span>
          <kbd className="text-[10px] bg-background border border-border/80 px-1.5 py-0.2 rounded font-mono font-bold text-muted-foreground">Ctrl K</kbd>
        </button>
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
