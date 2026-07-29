import { useEffect } from "react";
import type { OverviewResponse } from "@/types/api";
import SectionCard from "./SectionCard";

/**
 * Recurring Bills summary. The design shows dollar *totals* per status, but
 * `GET /overview` currently returns per-status *counts* of bills, so that is
 * what we render (one honest count each). See the console warning below for
 * the backend change needed to match the design 1:1.
 */

let warnedAboutAmounts = false;

const ROWS: {
  key: keyof OverviewResponse["recurring_bills"];
  label: string;
  color: string;
}[] = [
  { key: "paid", label: "Paid Bills", color: "#277c78" },
  { key: "upcoming", label: "Total Upcoming", color: "#f2cdac" },
  { key: "due_soon", label: "Due Soon", color: "#82c9d7" },
];

function RecurringBillsSummaryCard({
  recurringBills,
}: {
  recurringBills: OverviewResponse["recurring_bills"];
}) {
  useEffect(() => {
    if (!warnedAboutAmounts) {
      warnedAboutAmounts = true;
      console.warn(
        "[Overview] Recurring Bills renders per-status bill COUNTS because " +
          "GET /overview only returns counts (recurring_bills.paid/upcoming/" +
          "due_soon). To match the design's dollar totals, the backend's " +
          "overview service must also return summed amounts per status.",
      );
    }
  }, []);

  return (
    <SectionCard
      title="Recurring Bills"
      action={{ label: "See Details", to: "/recurring-bills" }}
    >
      <ul className="mt-5 flex flex-col gap-3">
        {ROWS.map((row) => {
          const count = recurringBills[row.key];
          return (
            <li
              key={row.key}
              className="flex items-center justify-between gap-4 rounded-lg border-l-4 bg-beige-100 px-4 py-5"
              style={{ borderColor: row.color }}
            >
              <span className="text-sm text-grey-500">{row.label}</span>
              <span className="text-sm font-bold text-grey-900">
                {count} {count === 1 ? "bill" : "bills"}
              </span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

export default RecurringBillsSummaryCard;
