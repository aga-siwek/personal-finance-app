/**
 * Shared API/domain types, mirroring the backend serialisers 1:1 (see the
 * backend `to_dict` methods / overview service). Monetary fields are integer
 * cents; `theme` is an opaque colour string (a hex value like "#277c78" the
 * frontend chooses on create and the backend returns verbatim).
 */

export interface CategoryDTO {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionDTO {
  id: number;
  category_id: number;
  recipient_name: string;
  amount: number;
  transaction_date: string | null;
  source: string;
  created_at: string;
  /** ISO timestamp of the last edit, or null if never edited. */
  updated_at?: string | null;
}

export interface PotDTO {
  id: number;
  name: string;
  target_amount: number;
  total_saved: number;
  theme: string;
  created_at: string;
  updated_at: string;
}

/** A budget as returned inside the overview payload — the stored columns plus
 * the service-derived `spent`/`remaining` (integer cents). */
export interface BudgetSummaryDTO {
  id: number;
  category_id: number;
  max_spend: number;
  theme: string;
  spent: number;
  remaining: number;
  created_at: string;
  updated_at: string;
}

export type RecurringBillStatus = "paid" | "due_soon" | "upcoming";

export interface RecurringBillDTO {
  id: number;
  title: string;
  category_id: number;
  amount: number;
  /** Day of the month the bill is due (1–31). */
  due_day: number;
  status: RecurringBillStatus;
  created_at: string;
  updated_at: string;
}

/** `GET /overview` — the single aggregated dashboard payload. `recurring_bills`
 * are per-status *counts* of bills, not amounts (see the overview service). */
export interface OverviewResponse {
  balance: number;
  income: number;
  expenses: number;
  pots: {
    total_count: number;
    total_saved: number;
    top: PotDTO[];
  };
  budgets: {
    total_count: number;
    top: BudgetSummaryDTO[];
    /** Categories that have spending but no budget (integer cents). Optional
     * so the UI stays safe against an older backend that omits it. */
    unbudgeted?: { category_id: number; spent: number }[];
  };
  latest_transactions: TransactionDTO[];
  recurring_bills: {
    paid: number;
    due_soon: number;
    upcoming: number;
  };
}
