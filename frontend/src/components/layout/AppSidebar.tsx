import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Upload, Building2, Truck, Users, Wrench, Package, Settings as SettingsIcon,
  BarChart3, Activity, Bell, HelpCircle, ChevronDown, Search, Box, LogIn, ClipboardList, Sparkles, UtensilsCrossed, UserCheck,
  Shield, UserCog, FileText, AlertTriangle, ChefHat, ShieldCheck, LineChart, Cog, Gauge, BedDouble, Link2, Ban,
  LayoutDashboard, PieChart, CalendarDays, Briefcase, SlidersHorizontal, Compass, ArrowLeft, ArrowUpRight, Layers
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import campLogo from "@/assets/camp-365-logo.png";

import { isCateringRoute } from "@/lib/cateringRoute";

const isPathActive = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(path + "/");

// ============================================================================
// ACCOMMODATION NAVIGATION GROUPS (Catering is strictly isolated into Catering-365)
// ============================================================================
const accommodationNavGroups: {
  label: string;
  icon: typeof Home;
  items: { label: string; icon: typeof Home; path: string }[];
}[] = [
  {
    label: "Camp & Accommodation",
    icon: Building2,
    items: [
      { label: "Employee Master", icon: Users, path: "/employees" },
      { label: "Camp Management", icon: Building2, path: "/camps" },
      { label: "Check-In / Out", icon: LogIn, path: "/check-in-out" },
      { label: "Bulk Check-In", icon: Upload, path: "/check-in/bulk" },
      { label: "Bulk Check-Out", icon: Upload, path: "/check-out/bulk" },
      { label: "Locker Management", icon: Box, path: "/lockers" },
      { label: "Attendance", icon: ClipboardList, path: "/attendance" },
      { label: "Inmates Report", icon: FileText, path: "/inmates-report" },
      { label: "Employee Stays", icon: CalendarDays, path: "/employee-stays" },
      { label: "Visitor Management", icon: UserCheck, path: "/visitors" },
    ],
  },
  {
    label: "Facilities",
    icon: Wrench,
    items: [
      { label: "Repair & Maintenance", icon: Wrench, path: "/maintenance" },
      { label: "Preventive Maintenance", icon: Cog, path: "/preventive-maintenance" },
      { label: "Staff KPI Monitoring", icon: Gauge, path: "/staff-kpi" },
      { label: "Inventory", icon: Package, path: "/inventory" },
      { label: "Asset Management", icon: Box, path: "/assets" },
      { label: "Item Assignments", icon: Package, path: "/item-assignments" },
    ],
  },
  {
    label: "Reports & Insights",
    icon: BarChart3,
    items: [
      { label: "Dynamic Reports", icon: SlidersHorizontal, path: "/dynamic-reports" },
      { label: "AI Reports", icon: Sparkles, path: "/ai-reports" },
      { label: "Anomaly Report", icon: AlertTriangle, path: "/anomaly-report" },
      { label: "Bottomline Report", icon: LineChart, path: "/bottomline" },
    ],
  },
];

// ============================================================================
// DEDICATED CATERING-365 NAVIGATION (Standalone Culinary Suite)
// ============================================================================
const cateringNavGroups: {
  label: string;
  icon: typeof Home;
  items: { label: string; icon: typeof Home; path: string }[];
}[] = [
  {
    label: "Production & Recipes",
    icon: UtensilsCrossed,
    items: [
      { label: "Dishes & Menu Recipes", icon: UtensilsCrossed, path: "/mess-catering" },
      { label: "Enterprise Operations Hub", icon: Sparkles, path: "/catering/enterprise-hub" },
      { label: "Pantry Command Center", icon: Compass, path: "/catering/pantry-command-center" },
      { label: "Catering BI Reports", icon: BarChart3, path: "/catering/reports" },
    ],
  },
  {
    label: "Pantry & Procurement",
    icon: Package,
    items: [
      { label: "Grocery Inventory & GRN", icon: Package, path: "/grocery-inventory" },
      { label: "Cook Requests & POs", icon: ChefHat, path: "/cook-requests" },
    ],
  },
  {
    label: "Dining & Headcount",
    icon: Users,
    items: [
      { label: "Smart Meal Entitlements", icon: UtensilsCrossed, path: "/meal-management" },
      { label: "Department Lunch Orders", icon: UtensilsCrossed, path: "/department-lunch" },
      { label: "Meal Cancellations", icon: Ban, path: "/food-cancellation" },
      { label: "Food Safety & HACCP", icon: ShieldCheck, path: "/food-safety" },
    ],
  },
];

const bottomNav = [
  { label: "Reports", icon: BarChart3, path: "/reports" },
  { label: "Activities", icon: Activity, path: "/activities" },
  { label: "Alerts & Notifications", icon: Bell, path: "/alerts" },
];

const dashboardNav = [
  { label: "Board Overview", icon: LayoutDashboard, path: "/dashboards/board" },
  { label: "Camp Utilization", icon: PieChart, path: "/dashboards/utilization" },
  { label: "Monthly Snapshot", icon: CalendarDays, path: "/dashboards/monthly" },
  { label: "Contract Overview", icon: FileText, path: "/dashboards/contracts" },
  { label: "Expertise Board", icon: Gauge, path: "/dashboards/expertise" },
  { label: "Operations Dashboard", icon: Activity, path: "/dashboard" },
];

const adminNav = [
  { label: "Employee Master Data", icon: Users, path: "/admin/employees" },
  { label: "Camp Master Data", icon: Building2, path: "/admin/camps" },
  { label: "Project Master Data", icon: Briefcase, path: "/admin/projects" },
  { label: "Room Category Master", icon: BedDouble, path: "/admin/room-categories" },
  { label: "Supplier Master", icon: Truck, path: "/admin/suppliers" },
  { label: "Designation Mapping", icon: Link2, path: "/admin/designation-mapping" },
  { label: "Camp Food Rates", icon: UtensilsCrossed, path: "/admin/camp-food-rates" },
  { label: "Department Lunch Rates", icon: UtensilsCrossed, path: "/admin/department-lunch-rates" },
  { label: "User Management", icon: UserCog, path: "/admin/users" },
  { label: "Permission Matrix", icon: Shield, path: "/admin/permissions" },
  { label: "Audit Logs", icon: FileText, path: "/admin/audit-logs" },
];

const footerNav = [
  { label: "Support", icon: HelpCircle, path: "/support" },
  { label: "Settings", icon: SettingsIcon, path: "/settings" },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = usePermissions();

  const isCatering = isCateringRoute(location.pathname);
  const currentNavGroups = isCatering ? cateringNavGroups : accommodationNavGroups;
  const groupLabels = useMemo(
    () => [...currentNavGroups.map(g => g.label), ...(isCatering ? [] : ["Administration"])],
    [isCatering, currentNavGroups]
  );

  const dashboardActive = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboards/");
  const [dashboardsOpen, setDashboardsOpen] = useState(dashboardActive);
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    groupLabels.filter(label => {
      const items = label === "Administration" ? adminNav : currentNavGroups.find(g => g.label === label)?.items ?? [];
      return items.some(item => isPathActive(location.pathname, item.path));
    })
  );

  // Keep the owning section open when navigation lands inside it (e.g. deep links).
  useEffect(() => {
    const owner = groupLabels.find(label => {
      const items = label === "Administration" ? adminNav : currentNavGroups.find(g => g.label === label)?.items ?? [];
      return items.some(item => isPathActive(location.pathname, item.path));
    });
    if (owner) setOpenGroups(prev => (prev.includes(owner) ? prev : [...prev, owner]));
  }, [location.pathname, groupLabels, currentNavGroups]);

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => (prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]));

  const isActive = (path: string) => isPathActive(location.pathname, path);

  const renderGroup = (
    label: string,
    Icon: typeof Home,
    items: { label: string; icon?: typeof Home; path: string }[],
    index: number
  ) => {
    const open = openGroups.includes(label) || isCatering; // Keep catering groups open by default for rapid access
    const groupActive = items.some(item => isActive(item.path));
    const panelId = `nav-group-${index}`;
    return (
      <div key={label} className={index === 0 ? "pt-2" : "pt-2.5 mt-1 border-t border-border/50"}>
        <Button
          variant="ghost"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => toggleGroup(label)}
          className={`sidebar-link w-full justify-start py-2 text-xs font-semibold ${
            groupActive ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon size={17} className={groupActive ? (isCatering ? "text-[#fe932c]" : "text-emerald-500") : "text-muted-foreground"} />
          <span className="flex-1 text-left tracking-tight truncate">{label}</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 text-muted-foreground ${open ? "rotate-180" : ""}`}
          />
        </Button>
        {open && (
          <div id={panelId} className="ml-3 pl-2.5 border-l border-border/60 space-y-0.5 mt-0.5 animate-in slide-in-from-top-1 fade-in duration-200">
            {items.map(item => {
              const active = isActive(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={
                    `sidebar-link text-xs ${active ? "sidebar-link-active" : ""}`
                  }
                >
                  {item.icon && (
                    <item.icon
                      size={15}
                      className={`shrink-0 transition-colors ${
                        active
                          ? isCatering
                            ? "text-[#fe932c]"
                            : "text-emerald-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-[260px] h-screen bg-card/95 dark:bg-[#0c1524]/95 backdrop-blur-xl border-r border-border/70 flex flex-col shrink-0 shadow-xl transition-all duration-300 z-30 select-none">
      {/* Dynamic Division Header */}
      {isCatering ? (
        <div className="relative p-3.5 bg-gradient-to-b from-orange-500/15 via-amber-500/10 to-transparent border-b border-border/70 shrink-0">
          <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-amber-400 via-orange-400 to-transparent" />
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 via-[#fe932c] to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/25 shrink-0">
              <ChefHat size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black tracking-tight text-foreground truncate">
                  Catering-365
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">
                Industrial Culinary Operations
              </div>
            </div>
          </div>
          <NavLink
            to="/camp-hub"
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg bg-card/90 hover:bg-muted text-[11px] font-semibold text-foreground border border-border/80 transition-all shadow-2xs group"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Exit to Camp-365</span>
            </span>
            <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Launchpad</span>
          </NavLink>
        </div>
      ) : (
        <div className="relative p-3.5 bg-gradient-to-b from-emerald-500/15 via-teal-500/10 to-transparent border-b border-border/70 shrink-0">
          <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-400 to-transparent" />
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/25 shrink-0">
              <Building2 size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black tracking-tight text-foreground truncate">
                  Camp-365
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  MGMT
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">
                Workforce Accommodation & Assets
              </div>
            </div>
          </div>
          <NavLink
            to="/camp-hub"
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg bg-card/90 hover:bg-muted text-[11px] font-semibold text-foreground border border-border/80 transition-all shadow-2xs group"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
              <Layers size={13} className="transition-transform group-hover:rotate-12" />
              <span>Camp-365 Launchpad</span>
            </span>
            <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Switch</span>
          </NavLink>
        </div>
      )}

      {/* Quick Search */}
      <div className="px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-xl text-muted-foreground text-xs border border-border/60 hover:border-border focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder={isCatering ? "Filter recipes & BOM..." : "Quick filter..."}
            className="bg-transparent border-0 outline-hidden text-xs w-full text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value) {
                // Quick search navigation
              }
            }}
          />
          <kbd className="text-[9px] font-mono bg-card px-1.5 py-0.5 rounded border border-border/80 text-muted-foreground shrink-0 shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Main Nav Tree */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        {!isCatering && (
          <>
            <Button
              variant="ghost"
              aria-expanded={dashboardsOpen}
              aria-controls="dashboard-menu"
              onClick={() => setDashboardsOpen(!dashboardsOpen)}
              className={`sidebar-link w-full justify-start ${dashboardActive ? "sidebar-link-active" : ""}`}
            >
              <Gauge size={17} />
              <span className="flex-1 text-left tracking-tight truncate">Dashboard</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${dashboardsOpen ? "rotate-180" : ""}`} />
            </Button>
            {dashboardsOpen && (
              <div id="dashboard-menu" className="ml-3 pl-2.5 border-l border-border/60 space-y-0.5 mt-0.5 animate-in slide-in-from-top-1 fade-in duration-200">
                {dashboardNav.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive: active }) =>
                      `sidebar-link text-xs ${active ? "sidebar-link-active" : ""}`
                    }
                  >
                    <item.icon size={15} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
            <NavLink
              to="/home"
              className={({ isActive: active }) =>
                `sidebar-link ${active ? "sidebar-link-active" : ""}`
              }
            >
              <Home size={17} />
              <span className="truncate">Home</span>
            </NavLink>
          </>
        )}

        {/* Render respective groups */}
        {currentNavGroups.map((group, i) =>
          renderGroup(group.label, group.icon, group.items, i + 1)
        )}

        {/* Admin Nav (Only in Accommodation mode) */}
        {!isCatering && renderGroup("Administration", Shield, adminNav, currentNavGroups.length + 1)}

        {/* Bottom Reports Navigation for Accommodation */}
        {!isCatering && (
          <div className="pt-3 border-t border-border/50 mt-2 space-y-0.5">
            {bottomNav.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: active }) =>
                  `sidebar-link ${active || isPathActive(location.pathname, item.path) ? "sidebar-link-active" : ""}`
                }
              >
                <item.icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}

        {/* Quick Launchpad Return Tile inside catering nav */}
        {isCatering && (
          <div className="pt-3 border-t border-border/50 mt-3 space-y-0.5">
            <NavLink
              to="/"
              className="sidebar-link text-xs text-muted-foreground hover:text-foreground"
            >
              <Building2 size={16} />
              <span>Main Launchpad</span>
            </NavLink>
            <NavLink
              to="/ai-reports"
              className="sidebar-link text-xs text-muted-foreground hover:text-foreground"
            >
              <Sparkles size={16} />
              <span>Culinary AI Reports</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* System Health & Status Pill */}
      <div className="px-3 py-2 border-t border-border/60 shrink-0">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/50 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isCatering ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isCatering ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
            </span>
            <span className="font-mono font-medium">
              {isCatering ? "Catering Sync Live" : "CampOps Sync Live"}
            </span>
          </div>
          <span className="font-mono text-[9px] opacity-70">24ms</span>
        </div>
      </div>

      {/* Footer Settings & Support */}
      <div className="px-3 py-2 border-t border-border/60 space-y-0.5 shrink-0">
        {footerNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive: active }) =>
              `sidebar-link py-1.5 ${active ? "sidebar-link-active" : ""}`
            }
          >
            <item.icon size={15} />
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="px-4 py-2 text-[10px] text-muted-foreground/80 shrink-0">
        © Camp-365 Operations Suite. All Rights Reserved.
      </div>
    </aside>
  );
}
