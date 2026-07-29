import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats integer cents as dollars with two decimals by default", () => {
    expect(formatCurrency(483600)).toBe("$4,836.00");
    expect(formatCurrency(170050)).toBe("$1,700.50");
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("drops decimals when decimals: 0 (pot/donut figures)", () => {
    expect(formatCurrency(85000, { decimals: 0 })).toBe("$850");
    expect(formatCurrency(15900, { decimals: 0 })).toBe("$159");
  });

  it("prefixes an explicit +/- only when signed", () => {
    expect(formatCurrency(7550, { signed: true })).toBe("+$75.50");
    expect(formatCurrency(-5550, { signed: true })).toBe("-$55.50");
  });

  it("shows a leading - for negatives even when not signed", () => {
    expect(formatCurrency(-6500)).toBe("-$65.00");
  });
});

describe("formatDate", () => {
  it("formats an ISO date as '19 Aug 2024'", () => {
    expect(formatDate("2024-08-19")).toBe("19 Aug 2024");
  });
});
