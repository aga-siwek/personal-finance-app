import { NavLink } from "react-router";
import { navItems } from "@/components/layout/navItems";
import { cn } from "@/lib/utils";

/**
 * Mobile/tablet navigation (below lg). Fixed dark bar at the bottom with
 * rounded top corners. Icons only on mobile; icon + label from md up. The
 * active item gets a cream tab with a green top-border accent and green icon.
 */
function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around gap-1 rounded-t-2xl bg-grey-900 px-2 pt-2 md:px-8 lg:hidden"
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1 rounded-t-lg border-t-4 px-2 pt-2 pb-3 md:pb-4",
              isActive ? "border-green bg-beige-100" : "border-transparent",
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={cn(
                  "h-5 w-auto shrink-0",
                  isActive ? "text-green" : "text-grey-300",
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "hidden text-xs font-bold md:block",
                  isActive ? "text-grey-900" : "text-grey-300",
                )}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
