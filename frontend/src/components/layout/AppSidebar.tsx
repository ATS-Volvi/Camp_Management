import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Upload, Building2, Truck, Users, Wrench, Package, Settings as SettingsIcon,
  BarChart3, Activity, Bell, HelpCircle, ChevronDown, Search, Box, LogIn, ClipboardList, Sparkles, UtensilsCrossed, UserCheck,
  Shield, UserCog, FileText, AlertTriangle, ChefHat, ShieldCheck, LineChart, Cog, Gauge, BedDouble, Link2, Ban,
  LayoutDashboard, PieChart, CalendarDays, Briefcase, SlidersHorizontal, Compass, ArrowLeft, ArrowUpRight
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import campLogo from "@/assets/camp-365-logo.png";

const isPathActive = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(path + "/");

export const isCateringRoute = (pathname: string) => {
  return (
    pathname.startsWith("/catering") ||
    pathname.startsWith("/mess-catering") ||
    pathname.startsWith("/grocery-inventory") ||
    pathname.startsWith("/meal-management") ||
    pathname.startsWith("/food-cancellation") ||
    pathname.startsWith("/department-lunch") ||
    pathname.startsWith("/cook-requests") ||
    pathname.startsWith("/pantry-command-center")
  );
};

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
    icon: BarChart3,
    items: [
      { label: "Dynamic Reports", icon: SlidersHorizontal, path: "/dynamic-reports" },
      { label: "Catering BI Reports", icon: BarChart3, path: "/catering/reports" },
      { label: "AI Reports", icon: Sparkles, path: "/ai-reports" },
      { label: "Anomaly Report", icon: AlertTriangle, path: "/anomaly-report" },
      { label: "Food Safety Audit", icon: ShieldCheck, path: "/food-safety" },
      { label: "Bottomline Report", icon: LineChart, path: "/bottomline" },
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
      <div key={label} className={index === 0 ? "pt-2" : "pt-3 mt-1 border-t"}>
        <Button
          variant="ghost"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => toggleGroup(label)}
          className={`sidebar-link w-full justify-start ${groupActive ? "sidebar-link-active" : ""}`}
        >
          <Icon size={18} />
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
        {open && (
          <div id={panelId} className="ml-3 pl-2 border-l space-y-0.5">
            {items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive: active }) =>
                  `sidebar-link text-xs ${active ? "sidebar-link-active" : ""}`
                }
              >
                {item.icon && <item.icon size={16} className="shrink-0" />}
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-[240px] h-screen bg-sidebar text-sidebar-foreground border-r flex flex-col shrink-0">
      {/* Dynamic Header */}
      {isCatering ? (
        <div className="p-3 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#fe932c] to-amber-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <ChefHat size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black tracking-tight text-foreground flex items-center gap-1.5">
                <span>Catering-365</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold">HUB</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium truncate">Culinary Operations Suite</div>
            </div>
          </div>
          <NavLink
            to="/camp-hub"
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg bg-card/90 hover:bg-muted text-[11px] font-semibold text-foreground border border-border/80 transition-all shadow-2xs group"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-primary">
              <ArrowLeft size={13} />
              <span>Exit to Camp-365</span>
            </span>
            <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1 rounded">Launchpad</span>
          </NavLink>
        </div>
      ) : (
        <div className="px-4 py-4 flex items-center gap-2 border-b shrink-0">
          <img src={campLogo} alt="Camp-365 Logo" className="w-8 h-8 rounded" />
          <span className="font-bold text-lg text-foreground">Camp-365</span>
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-muted-foreground text-xs">
          <Search size={14} />
          <span>{isCatering ? "Search recipes & dishes..." : "Search..."}</span>
          <span className="ml-auto text-[10px] bg-card px-1.5 py-0.5 rounded border">⌘K</span>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {!isCatering && (
          <>
            <Button
              variant="ghost"
              aria-expanded={dashboardsOpen}
              aria-controls="dashboard-menu"
              onClick={() => setDashboardsOpen(!dashboardsOpen)}
              className={`sidebar-link w-full justify-start ${dashboardActive ? "sidebar-link-active" : ""}`}
            >
              <Gauge size={18} />
              <span className="flex-1 text-left">Dashboard</span>
              <ChevronDown size={16} className={`transition-transform ${dashboardsOpen ? "rotate-180" : ""}`} />
            </Button>
            {dashboardsOpen && (
              <div id="dashboard-menu" className="ml-3 pl-2 border-l space-y-0.5">
                {dashboardNav.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive: active }) =>
                      `sidebar-link text-xs ${active ? "sidebar-link-active" : ""}`
                    }
                  >
                    <item.icon size={16} className="shrink-0" />
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
              <Home size={18} />
              Home
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
          <div className="pt-4 space-y-0.5">
            {bottomNav.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: active }) =>
                  `sidebar-link ${active || isPathActive(location.pathname, item.path) ? "sidebar-link-active" : ""}`
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}

        {/* Quick Launchpad Return Tile inside catering nav */}
        {isCatering && (
          <div className="pt-3 border-t mt-3">
            <NavLink
              to="/"
              className="sidebar-link text-xs text-muted-foreground hover:text-foreground"
            >
              <Building2 size={16} />
              <span>Enterprise Launchpad</span>
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

      {/* Footer */}
      <div className="px-3 py-2.5 border-t space-y-0.5 shrink-0">
        {footerNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive: active }) =>
              `sidebar-link ${active ? "sidebar-link-active" : ""}`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="px-4 py-2 text-[10px] text-muted-foreground shrink-0">
        © folkslogic. 2024. All Rights Reserved.
      </div>
    </aside>
  );
}
