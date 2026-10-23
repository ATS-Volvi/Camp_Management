import { useState, useEffect } from "react";
import { Palette, Sun, Moon, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ThemeColor = "campman" | "kaisan";
type ThemeMode = "light" | "dark" | "system";

const THEME_COLOR_KEY = "campman-theme-color";
const THEME_MODE_KEY = "campman-theme-mode";

function getSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(color: ThemeColor, mode: ThemeMode) {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove("theme-campman", "theme-kaisan", "dark");

  // Apply color theme
  root.classList.add(`theme-${color}`);

  // Apply dark mode
  const isDark = mode === "dark" || (mode === "system" && getSystemDark());
  if (isDark) root.classList.add("dark");
}

export default function ThemeSwitcher() {
  const [color, setColor] = useState<ThemeColor>(() =>
    (localStorage.getItem(THEME_COLOR_KEY) as ThemeColor) || "campman"
  );
  const [mode, setMode] = useState<ThemeMode>(() =>
    (localStorage.getItem(THEME_MODE_KEY) as ThemeMode) || "light"
  );

  useEffect(() => {
    applyTheme(color, mode);
    localStorage.setItem(THEME_COLOR_KEY, color);
    localStorage.setItem(THEME_MODE_KEY, mode);
  }, [color, mode]);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (mode === "system") applyTheme(color, "system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [color, mode]);

  const ModeIcon = mode === "dark" ? Moon : mode === "light" ? Sun : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 p-2 hover:bg-muted rounded-lg transition-colors text-foreground">
          <Palette size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={color} onValueChange={(v) => setColor(v as ThemeColor)}>
          <DropdownMenuRadioItem value="campman">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[hsl(217,91%,60%)]" />
              CampMan Blue
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="kaisan">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[hsl(215,50%,12%)]" />
              Kaisan Navy
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <ModeIcon size={14} /> Appearance
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
          <DropdownMenuRadioItem value="light">
            <span className="flex items-center gap-2"><Sun size={14} /> Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <span className="flex items-center gap-2"><Moon size={14} /> Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <span className="flex items-center gap-2"><Monitor size={14} /> System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
