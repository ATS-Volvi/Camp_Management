import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Building2, Truck, Users, Wrench, Package, Settings as SettingsIcon,
  BarChart3, Activity, Bell, HelpCircle, ChevronDown, Search, Box, LogIn, ClipboardList, Sparkles, UtensilsCrossed, UserCheck,
  Shield, UserCog, FileText, AlertTriangle, ChefHat, ShieldCheck, LineChart, Cog, Gauge, BedDouble, Link2, Ban,
  LayoutDashboard, PieChart, CalendarDays
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import campLogo from "@/assets/camp-365-logo.png";

const isPathActive = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(path + "/");

const navGroups: {
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
      { label: "Attendance", icon: ClipboardList, path: "/attendance" },
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
    label: "Catering Division",
    icon: UtensilsCrossed,
    items: [
      { label: "Mess & Catering", icon: UtensilsCrossed, path: "/mess-catering" },
      { label: "Smart Meal Management", icon: UtensilsCrossed, path: "/meal-management" },
      { label: "Grocery Inventory", icon: Package, path: "/grocery-inventory" },
      { label: "Cook Requests & PO", icon: ChefHat, path: "/cook-requests" },
      { label: "Food Cancellation", icon: Ban, path: "/food-cancellation" },
    ],
  },
  {
    label: "Reports & Insights",
    icon: BarChart3,
    items: [
      { label: "AI Reports", icon: Sparkles, path: "/ai-reports" },
      { label: "Anomaly Report", icon: AlertTriangle, path: "/anomaly-report" },
      { label: "Food Safety Audit", icon: ShieldCheck, path: "/food-safety" },
      { label: "Bottomline Report", icon: LineChart, path: "/bottomline" },
    ],
  },
];

const bottomNav = [
  { label: "Reports", icon: BarChart3, path: "/reports", expandable: true },
  { label: "Activities", icon: Activity, path: "/activities", expandable: true },
  { label: "Alerts & Notifications", icon: Bell, path: "/alerts", expandable: true },
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
  { label: "User Management", icon: UserCog, path: "/admin/users" },
  { label: "Permission Matrix", icon: Shield, path: "/admin/permissions" },
  { label: "Audit Logs", icon: FileText, path: "/admin/audit-logs" },
  { label: "Room Category Master", icon: BedDouble, path: "/admin/room-categories" },
  { label: "Supplier Master", icon: Truck, path: "/admin/suppliers" },
  { label: "Camp Food Rates", icon: UtensilsCrossed, path: "/admin/camp-food-rates" },
  { label: "Designation Mapping", icon: Link2, path: "/admin/designation-mapping" },
];

const footerNav = [
  { label: "Support", icon: HelpCircle, path: "/support" },
  { label: "Settings", icon: SettingsIcon, path: "/settings" },
];

const GROUP_LABELS = [...navGroups.map(g => g.label), "Administration"];

export default function AppSidebar() {
  const location = useLocation();
  const { isSuperAdmin } = usePermissions();
  const dashboardActive = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboards/");
  const [dashboardsOpen, setDashboardsOpen] = useState(dashboardActive);
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    GROUP_LABELS.filter(label => {
      const items = label === "Administration" ? adminNav : navGroups.find(g => g.label === label)?.items ?? [];
      return items.some(item => isPathActive(location.pathname, item.path));
    })
  );

  // Keep the owning section open when navigation lands inside it (e.g. deep links).
  useEffect(() => {
    const owner = GROUP_LABELS.find(label => {
      const items = label === "Administration" ? adminNav : navGroups.find(g => g.label === label)?.items ?? [];
      return items.some(item => isPathActive(location.pathname, item.path));
    });
    if (owner) setOpenGroups(prev => (prev.includes(owner) ? prev : [...prev, owner]));
  }, [location.pathname]);

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => (prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]));

  const isActive = (path: string) => isPathActive(location.pathname, path);

  const renderGroup = (
    label: string,
    Icon: typeof Home,
    items: { label: string; icon?: typeof Home; path: string }[],
    index: number
  ) => {
    const open = openGroups.includes(label);
    const groupActive = items.some(item => isActive(item.path));
    const panelId = `nav-group-${index}`;
    return (
      <div key={label} className={index === 0 ? "pt-3" : "pt-4 mt-1 border-t"}>
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
    <aside className="w-[240px] h-screen bg-card border-r flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2 border-b">
        <img src={campLogo} alt="Camp-365 Logo" className="w-8 h-8 rounded" />
        <span className="font-bold text-lg text-foreground">Camp-365</span>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-muted-foreground text-sm">
          <Search size={16} />
          <span>Search</span>
          <span className="ml-auto text-xs bg-card px-1.5 py-0.5 rounded border">⌘K</span>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <Button variant="ghost" aria-expanded={dashboardsOpen} aria-controls="dashboard-menu" onClick={() => setDashboardsOpen(!dashboardsOpen)} className={`sidebar-link w-full justify-start ${dashboardActive ? "sidebar-link-active" : ""}`}>
          <Gauge size={18} /><span className="flex-1 text-left">Dashboard</span><ChevronDown size={16} className={`transition-transform ${dashboardsOpen ? "rotate-180" : ""}`} />
        </Button>
        {dashboardsOpen && <div id="dashboard-menu" className="ml-3 pl-2 border-l space-y-0.5">{dashboardNav.map(item => <NavLink key={item.path} to={item.path} className={({ isActive }) => `sidebar-link text-xs ${isActive ? "sidebar-link-active" : ""}`}><item.icon size={16} className="shrink-0" /><span className="truncate">{item.label}</span></NavLink>)}</div>}
        <NavLink
          to="/home"
          className={({ isActive: active }) =>
            `sidebar-link ${active ? "sidebar-link-active" : ""}`
          }
        >
          <Home size={18} />
          Home
        </NavLink>

        {navGroups.map((group, i) => renderGroup(group.label, group.icon, group.items, i + 1))}

        {isSuperAdmin && renderGroup("Administration", Shield, adminNav, navGroups.length + 1)}

        <div className="pt-4 space-y-0.5">
          {bottomNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive: active }) =>
                `sidebar-link justify-between ${active ? "sidebar-link-active" : ""}`
              }
            >
              <span className="flex items-center gap-3">
                <item.icon size={18} />
                {item.label}
              </span>
              {item.expandable && <ChevronDown size={16} />}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t space-y-0.5">
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

      <div className="px-4 py-2 text-xs text-muted-foreground">
        © folkslogic. 2024. All Rights Reserved.
      </div>
    </aside>
  );
}
