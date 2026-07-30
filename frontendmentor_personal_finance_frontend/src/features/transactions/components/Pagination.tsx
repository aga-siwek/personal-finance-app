import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Numbered pagination with Prev/Next, matching the design's control. Page
 * numbers are 1-indexed; the active page is filled dark.
 */
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const stepClass =
    "flex h-10 items-center gap-2 rounded-lg border border-beige-500 px-4 text-sm text-grey-900 transition-colors hover:bg-beige-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-grey-900";

  return (
    <nav
      aria-label="Transactions pages"
      className="mt-6 flex items-center justify-between gap-2"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={stepClass}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      <ul className="flex items-center gap-2">
        {pages.map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "flex size-10 items-center justify-center rounded-lg border text-sm transition-colors",
                p === page
                  ? "border-grey-900 bg-grey-900 text-white"
                  : "border-beige-500 text-grey-900 hover:bg-beige-500 hover:text-white",
              )}
            >
              {p}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={stepClass}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export default Pagination;
