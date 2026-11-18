import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type StitchPalette =
  | "original"      // Original CampMan Blue (Default)
  | "volvitech"     // Google Stitch Volvitech Slate & Steel
  | "powerbi"       // Google Stitch Executive PowerBI Deep Navy & Amber
  | "aramco"        // Google Stitch Industrial Desert Gold & Petroleum Cyan
  | "emerald"       // Google Stitch Emerald Oasis & Clean Mint
  | "indigo"        // Google Stitch Nexus Modern Electric Violet
  | "luxury"        // Google Stitch Monochrome Obsidian & Champagne Gold
  | "cyber";        // Google Stitch Flow Obsidian & Neon Violet

export type UiStyle =
  | "original"      // Original Clean Standard (Default 8px radius, standard layout)
  | "modern"        // Stitch Modern BI (Balanced curves, subtle elevation)
  | "compact"       // Enterprise High-Density Grid (Sharp 4px, compact table rows, mono data)
  | "flat"          // Minimalist Clean Flat (Zero elevation, crisp 1px borders)
  | "soft";         // Neo-Modern Rounded (Pill curves, soft ambient glow)

export type ThemeMode = "light" | "dark" | "system";

export interface PaletteInfo {
  id: StitchPalette;
  name: string;
  tagline: string;
  stitchOrigin: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  surfaceHex: string;
  darkSurfaceHex: string;
}

export interface UiStyleInfo {
  id: UiStyle;
  name: string;
  description: string;
  radius: string;
  density: string;
  shadow: string;
}

export const STITCH_PALETTES: PaletteInfo[] = [
  {
    id: "original",
    name: "CampMan Blue (Original Default)",
    tagline: "The original clean enterprise blue interface and default styling",
    stitchOrigin: "CampMan Core System",
    primaryHex: "#2563eb",
    secondaryHex: "#3b82f6",
    accentHex: "#f59e0b",
    surfaceHex: "#ffffff",
    darkSurfaceHex: "#0f172a",
  },
  {
    id: "volvitech",
    name: "Volvitech Slate & Steel",
    tagline: "Corporate operations & high-reliability facility management",
    stitchOrigin: "Volvitech Hospitality OS",
    primaryHex: "#1a365d",
    secondaryHex: "#2b6cb0",
    accentHex: "#d97706",
    surfaceHex: "#f8fafc",
    darkSurfaceHex: "#0f172a",
  },
  {
    id: "powerbi",
    name: "PowerBI Executive",
    tagline: "Deep navy intelligence with high-visibility amber KPIs",
    stitchOrigin: "Camp 365 Dynamic Reports Studio",
    primaryHex: "#0c2340",
    secondaryHex: "#d97706",
    accentHex: "#2563eb",
    surfaceHex: "#f8f9ff",
    darkSurfaceHex: "#0a1120",
  },
  {
    id: "aramco",
    name: "Industrial Desert Gold",
    tagline: "Aramco energy & heavy fabrication construction aesthetics",
    stitchOrigin: "Needs Group Fabrication & Construction",
    primaryHex: "#c28723",
    secondaryHex: "#0ea5e9",
    accentHex: "#d97706",
    surfaceHex: "#faf8f5",
    darkSurfaceHex: "#14120e",
  },
  {
    id: "emerald",
    name: "Emerald Oasis & Mint",
    tagline: "Fresh botanical green for catering, health & ESG safety",
    stitchOrigin: "MIM QuoteFlow AI",
    primaryHex: "#006a61",
    secondaryHex: "#0d9488",
    accentHex: "#0284c7",
    surfaceHex: "#f4fbf9",
    darkSurfaceHex: "#071b18",
  },
  {
    id: "indigo",
    name: "Electric Violet & Azure",
    tagline: "Hyper-modern SaaS aesthetic with vibrant electric gradients",
    stitchOrigin: "Nexus CRM Redesign",
    primaryHex: "#2563eb",
    secondaryHex: "#6366f1",
    accentHex: "#06b6d4",
    surfaceHex: "#faf9ff",
    darkSurfaceHex: "#0f0f23",
  },
  {
    id: "luxury",
    name: "Monochrome & Champagne",
    tagline: "Minimalist ultra-clean luxury styling for VIP accommodations",
    stitchOrigin: "Luxury Hotel IT Dashboard",
    primaryHex: "#18181b",
    secondaryHex: "#c5a059",
    accentHex: "#a1a1aa",
    surfaceHex: "#fafafa",
    darkSurfaceHex: "#121214",
  },
  {
    id: "cyber",
    name: "Obsidian Cyber & Violet",
    tagline: "Dark tech aesthetic with glowing high-contrast neon accents",
    stitchOrigin: "Flow Sales OS",
    primaryHex: "#8b5cf6",
    secondaryHex: "#a78bfa",
    accentHex: "#ec4899",
    surfaceHex: "#fbfaff",
    darkSurfaceHex: "#0d0d12",
  },
];

export const UI_STYLES: UiStyleInfo[] = [
  {
    id: "original",
    name: "Original Standard (Default)",
    description: "The original clean 8px layout, standard table padding, and default card styles",
    radius: "0.5rem",
    density: "Standard",
    shadow: "Default",
  },
  {
    id: "modern",
    name: "Stitch Modern BI",
    description: "Balanced curves (12px), smooth elevations, comfortable padding",
    radius: "0.75rem",
    density: "Comfortable",
    shadow: "Subtle Soft",
  },
  {
    id: "compact",
    name: "Enterprise High-Density",
    description: "Sharp 4px corners, compact rows for viewing large datasets",
    radius: "0.25rem",
    density: "High Density",
    shadow: "Crisp 1px Borders",
  },
  {
    id: "flat",
    name: "Minimalist Clean Flat",
    description: "Zero drop-shadows, pure flat surfaces, sharp clean lines",
    radius: "0.5rem",
    density: "Balanced",
    shadow: "None",
  },
  {
    id: "soft",
    name: "Neo-Modern Rounded",
    description: "Pill curves (18px), soft diffused ambient glows and card depths",
    radius: "1.125rem",
    density: "Spacious",
    shadow: "Soft Diffused",
  },
];

const STORAGE_PALETTE_KEY = "campman_stitch_palette";
const STORAGE_UISTYLE_KEY = "campman_stitch_uistyle";
const STORAGE_MODE_KEY = "campman_stitch_mode";

function getSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

interface ThemeContextType {
  palette: StitchPalette;
  uiStyle: UiStyle;
  mode: ThemeMode;
  isDark: boolean;
  setPalette: (palette: StitchPalette) => void;
  setUiStyle: (style: UiStyle) => void;
  setMode: (mode: ThemeMode) => void;
  currentPaletteInfo: PaletteInfo;
  currentUiStyleInfo: UiStyleInfo;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to original CampMan palette
  const [palette, setPaletteState] = useState<StitchPalette>(() => {
    const saved = localStorage.getItem(STORAGE_PALETTE_KEY) as StitchPalette;
    return saved && STITCH_PALETTES.some((p) => p.id === saved) ? saved : "original";
  });

  // Default to original UI style
  const [uiStyle, setUiStyleState] = useState<UiStyle>(() => {
    const saved = localStorage.getItem(STORAGE_UISTYLE_KEY) as UiStyle;
    return saved && UI_STYLES.some((s) => s.id === saved) ? saved : "original";
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_MODE_KEY) as ThemeMode;
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "light";
  });

  const isDark = useMemo(() => {
    if (mode === "dark") return true;
    if (mode === "light") return false;
    return getSystemDark();
  }, [mode]);

  // Apply classes to document.documentElement
  useEffect(() => {
    const root = document.documentElement;

    // Remove any previous theme & style classes
    STITCH_PALETTES.forEach((p) => {
      root.classList.remove(`theme-stitch-${p.id}`);
      root.classList.remove(`theme-${p.id}`);
    });
    root.classList.remove("theme-campman", "theme-kaisan", "theme-expertise");

    UI_STYLES.forEach((s) => {
      root.classList.remove(`ui-style-${s.id}`);
    });

    // Add active palette and UI style classes
    root.classList.add(`theme-stitch-${palette}`);
    root.classList.add(`ui-style-${uiStyle}`);

    // Manage dark mode
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Persist
    localStorage.setItem(STORAGE_PALETTE_KEY, palette);
    localStorage.setItem(STORAGE_UISTYLE_KEY, uiStyle);
    localStorage.setItem(STORAGE_MODE_KEY, mode);
  }, [palette, uiStyle, mode, isDark]);

  // Listen for OS system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (mode === "system") {
        const root = document.documentElement;
        if (mediaQuery.matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mode]);

  const setPalette = (newPalette: StitchPalette) => {
    setPaletteState(newPalette);
  };

  const setUiStyle = (newStyle: UiStyle) => {
    setUiStyleState(newStyle);
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const currentPaletteInfo = useMemo(
    () => STITCH_PALETTES.find((p) => p.id === palette) || STITCH_PALETTES[0],
    [palette]
  );

  const currentUiStyleInfo = useMemo(
    () => UI_STYLES.find((s) => s.id === uiStyle) || UI_STYLES[0],
    [uiStyle]
  );

  return (
    <ThemeContext.Provider
      value={{
        palette,
        uiStyle,
        mode,
        isDark,
        setPalette,
        setUiStyle,
        setMode,
        currentPaletteInfo,
        currentUiStyleInfo,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
