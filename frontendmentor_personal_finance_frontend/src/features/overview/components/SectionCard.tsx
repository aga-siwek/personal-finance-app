import type { ReactNode } from "react";
import { Link } from "react-router";
import { CaretRightIcon } from "@/components/icons/ui-icons";
import { cn } from "@/lib/utils";

/**
 * White rounded card used by each Overview section (Pots, Transactions,
 * Budgets, Recurring Bills), with a heading and an optional "See Details" /
 * "View All" link to the full screen.
 */
function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: { label: string; to: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl bg-card p-6 md:p-8", className)}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-grey-900">{title}</h2>
        {action && (
          <Link
            to={action.to}
            className="flex items-center gap-3 text-sm text-grey-500 transition-colors hover:text-grey-900"
          >
            {action.label}
            <CaretRightIcon aria-hidden="true" className="h-3 w-auto" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default SectionCard;
