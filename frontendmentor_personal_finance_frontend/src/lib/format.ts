/**
 * Display formatters. The backend is the source of truth for every monetary
 * value and sends integer cents; the frontend only ever *formats* those for
 * display (dividing by 100, choosing decimals, adding a sign) — it never does
 * balance/spent/remaining arithmetic itself (see CLAUDE.md).
 */

interface CurrencyOptions {
  /** 2 (default) → "$4,836.00"; 0 → "$850" (matches the design's pot/donut
   * figures, which the reference renders without decimals). */
  decimals?: 0 | 2;
  /** When true, always prefix an explicit "+"/"-" (for signed transaction
   * amounts). When false, only negatives get a "-". */
  signed?: boolean;
}

/** Format integer cents as US dollars, e.g. `formatCurrency(483600)` →
 * `"$4,836.00"`, `formatCurrency(85000, { decimals: 0 })` → `"$850"`. */
export function formatCurrency(
  cents: number,
  { decimals = 2, signed = false }: CurrencyOptions = {},
): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(cents) / 100);

  if (signed) return `${cents < 0 ? "-" : "+"}${formatted}`;
  return cents < 0 ? `-${formatted}` : formatted;
}

/** Ordinal for a day-of-month, e.g. `ordinal(2)` → `"2nd"`, `ordinal(21)` →
 * `"21st"`. Used by the recurring-bills "Monthly - Nth" due date. */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Format an ISO date string as `"19 Aug 2024"`. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
