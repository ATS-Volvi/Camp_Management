import { Palette, Sun, Moon, Monitor, Settings as SettingsIcon, Check } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, STITCH_PALETTES, StitchPalette, ThemeMode } from "@/contexts/ThemeContext";

export default function ThemeSwitcher() {
  const { palette, mode, setPalette, setMode, currentPaletteInfo, currentUiStyleInfo } = useTheme();

  const ModeIcon = mode === "dark" ? Moon : mode === "light" ? Sun : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 p-2 hover:bg-muted rounded-lg transition-colors text-foreground relative"
          title={`Theme: ${currentPaletteInfo.name} (${currentUiStyleInfo.name})`}
        >
          <Palette size={18} />
          {/* Subtle colored dot showing active palette */}
          <span
            className="w-2 h-2 rounded-full absolute bottom-1.5 right-1.5 border border-background shadow-2xs"
            style={{ backgroundColor: currentPaletteInfo.primaryHex }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuLabel className="flex items-center justify-between text-xs font-semibold py-1">
          <span>Stitch Theme Engine</span>
          <span className="text-[10px] text-muted-foreground font-normal">7 Presets</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Quick Palettes */}
        <div className="space-y-0.5 my-1">
          {STITCH_PALETTES.map((p) => {
            const isActive = palette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPalette(p.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center -space-x-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-background shadow-2xs inline-block"
                      style={{ backgroundColor: p.primaryHex }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-background shadow-2xs inline-block"
                      style={{ backgroundColor: p.secondaryHex }}
                    />
                  </div>
                  <span className="truncate max-w-[140px]">{p.name}</span>
                </div>
                {isActive && <Check size={13} className="text-primary shrink-0" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        {/* Appearance Mode */}
        <div className="px-2 py-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ModeIcon size={13} /> Appearance
          </span>
          <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-md">
            {[
              { id: "light" as ThemeMode, icon: Sun, title: "Light" },
              { id: "dark" as ThemeMode, icon: Moon, title: "Dark" },
              { id: "system" as ThemeMode, icon: Monitor, title: "System" },
            ].map((m) => {
              const Icon = m.icon;
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`p-1 rounded text-xs transition-colors ${
                    isActive ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={m.title}
                >
                  <Icon size={12} />
                </button>
              );
            })}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Link to full Settings */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/settings" className="flex items-center gap-2 text-xs font-medium text-primary py-1.5">
            <SettingsIcon size={13} />
            <span>Customize UI Styles & Settings</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
