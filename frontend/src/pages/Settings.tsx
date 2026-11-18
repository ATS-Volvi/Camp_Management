import { useState } from "react";
import {
  Palette,
  Layout,
  Sun,
  Moon,
  Monitor,
  Check,
  Sparkles,
  Sliders,
  Building2,
  Calendar,
  Database,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Users,
  BedDouble,
  ArrowRight,
  Layers,
  Wand2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  useTheme,
  STITCH_PALETTES,
  UI_STYLES,
  StitchPalette,
  UiStyle,
  ThemeMode,
} from "@/contexts/ThemeContext";

export default function Settings() {
  const {
    palette,
    uiStyle,
    mode,
    isDark,
    setPalette,
    setUiStyle,
    setMode,
    currentPaletteInfo,
    currentUiStyleInfo,
  } = useTheme();

  // Operational preferences (persisted locally)
  const [defaultCamp, setDefaultCamp] = useState(() => localStorage.getItem("campman_default_camp") || "all");
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem("campman_date_format") || "YYYY-MM-DD");
  const [currency, setCurrency] = useState(() => localStorage.getItem("campman_currency") || "SAR");
  const [tableRows, setTableRows] = useState(() => localStorage.getItem("campman_table_rows") || "25");

  const handleSaveOperational = () => {
    localStorage.setItem("campman_default_camp", defaultCamp);
    localStorage.setItem("campman_date_format", dateFormat);
    localStorage.setItem("campman_currency", currency);
    localStorage.setItem("campman_table_rows", tableRows);
    toast.success("Operational preferences saved successfully!");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Settings & Appearance</h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1 font-semibold">
              <Sparkles size={11} /> Google Stitch Design Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Customize visual themes, Google Stitch design archetypes, color palettes, and operational defaults.
          </p>
        </div>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="appearance" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Palette size={15} /> Themes & Appearance
          </TabsTrigger>
          <TabsTrigger value="operational" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Sliders size={15} /> General Operations
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Database size={15} /> Cloud & System Health
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: APPEARANCE & THEMES                                         */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="appearance" className="space-y-8">
          {/* Active Theme Live Preview Box */}
          <Card className="overflow-hidden border border-border shadow-xs bg-card">
            <div className="h-2 w-full bg-linear-to-r from-primary via-accent to-secondary" />
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-0.5">
                    <Layers size={13} className="text-primary" /> Active Live Preview
                  </div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{currentPaletteInfo.name}</span>
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      {currentUiStyleInfo.name}
                    </Badge>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/50">
                    <Wand2 size={12} className="text-primary" />
                    <span>Origin: <strong>{currentPaletteInfo.stitchOrigin}</strong></span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mini component showroom rendering in active theme styles */}
              <div className="p-4 rounded-xl bg-background border border-border/60 space-y-4">
                <div className="text-xs font-medium text-muted-foreground">Component Rendering Sandbox:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Sample KPI 1 */}
                  <div className="stat-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Occupancy Rate</span>
                      <Users size={14} className="text-primary" />
                    </div>
                    <div className="text-2xl font-bold tracking-tight">94.2%</div>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                      <TrendingUp size={11} /> +4.8% this week
                    </div>
                  </div>

                  {/* Sample KPI 2 */}
                  <div className="stat-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Active Inmates</span>
                      <BedDouble size={14} className="text-accent" />
                    </div>
                    <div className="text-2xl font-bold tracking-tight">9,420</div>
                    <span className="text-[11px] text-muted-foreground">Across 4 Major Camps</span>
                  </div>

                  {/* Sample Button Controls */}
                  <div className="bg-card border border-border p-4 rounded-lg flex flex-col justify-between gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Buttons & Actions</span>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="h-8 text-xs font-semibold">
                        Primary Action
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs">
                        Secondary
                      </Button>
                    </div>
                  </div>

                  {/* Sample Badges & States */}
                  <div className="bg-card border border-border p-4 rounded-lg flex flex-col justify-between gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Badges & Indicators</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className="bg-primary text-primary-foreground text-[11px]">Primary</Badge>
                      <Badge variant="secondary" className="text-[11px]">Secondary</Badge>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px]">
                        Active
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">Outline</Badge>
                    </div>
                  </div>
                </div>

                {/* Swatch ribbon */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <span>Tokens: Primary <span className="font-mono text-foreground">{currentPaletteInfo.primaryHex}</span> | Accent <span className="font-mono text-foreground">{currentPaletteInfo.accentHex}</span> | Radius: <span className="font-mono text-foreground">{currentUiStyleInfo.radius}</span></span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: currentPaletteInfo.primaryHex }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: currentPaletteInfo.secondaryHex }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: currentPaletteInfo.accentHex }} />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 1: Color Palettes (Google Stitch) */}
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Palette size={16} className="text-primary" />
                Google Stitch Color Schemes
              </h2>
              <p className="text-xs text-muted-foreground">
                Select a color system crafted with Google Stitch. All dashboards, tables, navigation, and charts adapt immediately.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {STITCH_PALETTES.map((p) => {
                const isActive = palette === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPalette(p.id);
                      toast.success(`Theme updated to ${p.name}`);
                    }}
                    className={`relative p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 group hover:border-primary/60 hover:shadow-sm ${
                      isActive
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    {/* Header with dots and check */}
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: p.primaryHex }}
                          title="Primary"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: p.secondaryHex }}
                          title="Secondary"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: p.accentHex }}
                          title="Accent"
                        />
                      </div>
                      {isActive && (
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* Title and descriptions */}
                    <div>
                      <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {p.tagline}
                      </div>
                    </div>

                    {/* Stitch source pill */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="truncate max-w-[170px]">Stitch: {p.stitchOrigin}</span>
                      <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: UI Styles & Layout Archetypes */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Layout size={16} className="text-primary" />
                UI Style & Layout Density
              </h2>
              <p className="text-xs text-muted-foreground">
                Alter the physical layout rules: border radius curvature, table row density, and card elevation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {UI_STYLES.map((style) => {
                const isActive = uiStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => {
                      setUiStyle(style.id);
                      toast.success(`UI style set to ${style.name}`);
                    }}
                    className={`relative p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 group hover:border-primary/60 hover:shadow-sm ${
                      isActive
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-md bg-muted text-foreground">
                          <Layout size={14} />
                        </span>
                        <div className="text-sm font-semibold text-foreground">{style.name}</div>
                      </div>
                      {isActive && (
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      {style.description}
                    </div>

                    {/* Spec pills */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Radius: {style.radius}</span>
                      <span>Density: {style.density}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Appearance Mode (Light / Dark / System) */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                {isDark ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />}
                Display Mode
              </h2>
              <p className="text-xs text-muted-foreground">
                Choose between bright daytime surfaces, high-contrast dark mode, or match your device system settings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
              {[
                { id: "light" as ThemeMode, label: "Light Mode", icon: Sun, desc: "Clean bright surfaces" },
                { id: "dark" as ThemeMode, label: "Dark Mode", icon: Moon, desc: "High contrast dark panels" },
                { id: "system" as ThemeMode, label: "System Sync", icon: Monitor, desc: "Follow OS schedule" },
              ].map((item) => {
                const isActive = mode === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMode(item.id);
                      toast.success(`Appearance set to ${item.label}`);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      isActive
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary font-bold shadow-xs"
                        : "border-border bg-card text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: GENERAL OPERATIONS                                          */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="operational" className="space-y-6">
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders size={16} className="text-primary" />
                Operational Defaults
              </CardTitle>
              <CardDescription className="text-xs">
                Configure default values for camp views, date formatting, and grid tables across your sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
                {/* Default Camp */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 size={13} className="text-muted-foreground" /> Default Camp Selection
                  </label>
                  <Select value={defaultCamp} onValueChange={setDefaultCamp}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select camp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Camps (Consolidated)</SelectItem>
                      <SelectItem value="CAMP-01">CAMP-01 (Al Jubail)</SelectItem>
                      <SelectItem value="CAMP-02">CAMP-02 (Al Khobar)</SelectItem>
                      <SelectItem value="CAMP-03">CAMP-03 (Ras Tanura)</SelectItem>
                      <SelectItem value="CAMP-04">CAMP-04 (Riyadh Industrial)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">The initial camp pre-filtered when opening dashboards and reports.</p>
                </div>

                {/* Date Format */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar size={13} className="text-muted-foreground" /> Date Format Display
                  </label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard)</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (UK / Gulf)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Used for check-in receipts, statements, and tables.</p>
                </div>

                {/* Currency */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Currency Display</label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">SAR - Saudi Riyal (ر.س)</SelectItem>
                      <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Applied to billing statements, invoicing, and meal costs.</p>
                </div>

                {/* Table Page Size */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Default Rows per Table Page</label>
                  <Select value={tableRows} onValueChange={setTableRows}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select rows" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 rows per page</SelectItem>
                      <SelectItem value="25">25 rows per page</SelectItem>
                      <SelectItem value="50">50 rows per page</SelectItem>
                      <SelectItem value="100">100 rows per page</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Default pagination threshold for large tables.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button onClick={handleSaveOperational} size="sm" className="gap-1.5 text-xs">
                  <Check size={14} /> Save Operational Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: CLOUD & SYSTEM HEALTH                                       */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="system" className="space-y-6">
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database size={16} className="text-primary" />
                Infrastructure & Sync Health
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time operational status of backend services, PostgreSQL database, and design engines.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Database size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Neon PostgreSQL Cloud DB</div>
                      <div className="text-[11px] text-muted-foreground">AWS us-east-2 · Serverless Pool</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 gap-1 text-[11px]">
                    <CheckCircle2 size={11} /> Connected
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Google Stitch Design Engine</div>
                      <div className="text-[11px] text-muted-foreground">7 Design System Tokens Active</div>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 gap-1 text-[11px]">
                    <CheckCircle2 size={11} /> Synchronized
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Render Web Host & CDN</div>
                      <div className="text-[11px] text-muted-foreground">Static Edge Distribution</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 gap-1 text-[11px]">
                    <CheckCircle2 size={11} /> Healthy
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
