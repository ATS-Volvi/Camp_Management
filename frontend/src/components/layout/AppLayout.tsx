import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";

import GlobalCommandPalette from "./GlobalCommandPalette";

export default function AppLayout() {
  const { pathname } = useLocation();
  const commandView = pathname.startsWith("/dashboards/");
  const [mobileNav, setMobileNav] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden">
      <div className={commandView ? `${mobileNav ? "fixed inset-y-0 left-0 z-50" : "hidden"} md:block md:static` : ""}>
        {commandView && mobileNav && <Button variant="ghost" size="icon" aria-label="Close navigation" className="absolute right-1 top-3 md:hidden" onClick={() => setMobileNav(false)}><X /></Button>}
        <AppSidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {commandView && <div className="md:hidden px-3 py-2 border-b flex items-center gap-2"><Button variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu /></Button><span className="text-sm font-semibold">Dashboard</span></div>}
        <TopBar />
        <main className={`flex-1 overflow-y-auto ${commandView ? "p-3 md:p-6" : "p-6"}`} onClick={() => mobileNav && setMobileNav(false)}>
          <Outlet />
        </main>
      </div>
      <GlobalCommandPalette />
    </div>
  );
}
