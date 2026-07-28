import { NavLink } from "react-router";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { toggleSidebar } from "@/features/ui/uiSlice";
import { navItems } from "@/components/layout/navItems";
import { MinimizeMenuIcon } from "@/components/icons/nav-icons";
import Logo from "@/components/common/Logo";
import { cn } from "@/lib/utils";

/**
 * Desktop navigation (lg+). Dark, full-height, rounded on the right; renders
 * the wordmark, the primary nav with an active "pill" (green left-border +
 * green icon), and a "Minimize Menu" toggle that collapses it to an icon rail
 * via the `ui` slice's `sidebarCollapsed` state.
 */
function Sidebar() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col rounded-r-2xl bg-grey-900 pb-6 text-grey-300 transition-[width] duration-300 lg:flex",
        collapsed ? "w-[88px]" : "w-[300px]",
      )}
    >
      <div
        className={cn(
          "flex h-[100px] items-center",
          collapsed ? "justify-center px-6" : "px-8",
        )}
      >
        <Logo variant={collapsed ? "small" : "large"} />
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 pr-6">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-4 rounded-r-xl border-l-4 py-4 pl-8 text-base font-bold transition-colors",
                collapsed && "justify-center gap-0 pr-0 pl-6",
                isActive
                  ? "border-green bg-beige-100 text-grey-900"
                  : "border-transparent text-grey-300 hover:text-white",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "h-5 w-auto shrink-0 transition-colors",
                    isActive
                      ? "text-green"
                      : "text-grey-300 group-hover:text-white",
                  )}
                  aria-hidden="true"
                />
                {!collapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => dispatch(toggleSidebar())}
        aria-pressed={collapsed}
        aria-label={collapsed ? "Expand menu" : undefined}
        className={cn(
          "group flex items-center gap-4 py-4 pl-8 text-base font-bold text-grey-300 transition-colors hover:text-white",
          collapsed && "justify-center gap-0 pl-0",
        )}
      >
        <MinimizeMenuIcon
          className={cn(
            "h-5 w-auto shrink-0 transition-transform",
            collapsed && "rotate-180",
          )}
          aria-hidden="true"
        />
        {!collapsed && <span>Minimize Menu</span>}
      </button>
    </aside>
  );
}

export default Sidebar;
