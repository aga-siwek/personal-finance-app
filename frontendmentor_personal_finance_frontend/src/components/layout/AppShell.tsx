import { Outlet } from "react-router";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";

/**
 * Layout for the authenticated area: the desktop Sidebar (lg+) or the
 * mobile/tablet BottomNav (below lg) plus the routed page content. This is
 * the single place page padding lives; the extra bottom padding below lg
 * clears the fixed bottom bar.
 */
function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 px-4 pt-6 pb-28 md:px-10 md:pt-8 md:pb-32 lg:px-10 lg:py-8">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default AppShell;
