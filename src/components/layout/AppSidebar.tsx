import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Building2, Truck, Users, Wrench, Package, Settings as SettingsIcon,
  BarChart3, Activity, Bell, HelpCircle, ChevronDown, Search, Box, LogIn, ClipboardList, Sparkles, UtensilsCrossed, UserCheck,
  Shield, UserCog, FileText, AlertTriangle, ChefHat, ShieldCheck, LineChart, Cog, Gauge, BedDouble, Link2, Ban
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useState } from "react";
import campLogo from "@/assets/camp-365-logo.png";

const mainNav = [
  { label: "Home", icon: Home, path: "/home" },
  { label: "Operations Dashboard", icon: Gauge, path: "/dashboard" },
  { label: "Employee Master", icon: Users, path: "/employees" },
  { label: "Camp Management", icon: Building2, path: "/camps" },
  { label: "Check-In / Out", icon: LogIn, path: "/check-in-out" },
  { label: "Repair & Maintenance", icon: Wrench, path: "/maintenance" },
  { label: "Preventive Maintenance", icon: Cog, path: "/preventive-maintenance" },
  { label: "Staff KPI Monitoring", icon: Gauge, path: "/staff-kpi" },
  { label: "Inventory", icon: Package, path: "/inventory" },
  { label: "Asset Management", icon: Box, path: "/assets" },
  { label: "Item Assignments", icon: Package, path: "/item-assignments" },
  { label: "Attendance", icon: ClipboardList, path: "/attendance" },
  { label: "Mess & Catering", icon: UtensilsCrossed, path: "/mess-catering" },
  { label: "Smart Meal Management", icon: UtensilsCrossed, path: "/meal-management" },
  { label: "Grocery Inventory", icon: Package, path: "/grocery-inventory" },
  { label: "Cook Requests & PO", icon: ChefHat, path: "/cook-requests" },
  { label: "Food Cancellation", icon: Ban, path: "/food-cancellation" },
  { label: "Visitor Management", icon: UserCheck, path: "/visitors" },
  { label: "AI Reports", icon: Sparkles, path: "/ai-reports" },
  { label: "Anomaly Report", icon: AlertTriangle, path: "/anomaly-report" },
  { label: "Food Safety Audit", icon: ShieldCheck, path: "/food-safety" },
  { label: "Bottomline Report", icon: LineChart, path: "/bottomline" },
];

const bottomNav = [
  { label: "Reports", icon: BarChart3, path: "/reports", expandable: true },
  { label: "Activities", icon: Activity, path: "/activities", expandable: true },
  { label: "Alerts & Notifications", icon: Bell, path: "/alerts", expandable: true },
];

const adminNav = [
  { label: "User Management", icon: UserCog, path: "/admin/users" },
  { label: "Permission Matrix", icon: Shield, path: "/admin/permissions" },
  { label: "Audit Logs", icon: FileText, path: "/admin/audit-logs" },
  { label: "Room Category Master", icon: BedDouble, path: "/admin/room-categories" },
  { label: "Supplier Master", icon: Truck, path: "/admin/suppliers" },
  { label: "Designation Mapping", icon: Link2, path: "/admin/designation-mapping" },
];

const footerNav = [
  { label: "Support", icon: HelpCircle, path: "/support" },
  { label: "Settings", icon: SettingsIcon, path: "/settings" },
];

export default function AppSidebar() {
  const location = useLocation();
  const { isSuperAdmin } = usePermissions();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

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
        {mainNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive: active }) =>
              `sidebar-link ${active ? "sidebar-link-active" : ""}`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}

        {isSuperAdmin && (
          <div className="pt-4 border-t mt-4 space-y-0.5">
            <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Administration</p>
            {adminNav.map(item => (
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
        )}

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
