import { PotIcon } from "@/components/icons/ui-icons";
import { formatCurrency } from "@/lib/format";
import type { OverviewResponse } from "@/types/api";
import SectionCard from "./SectionCard";

/**
 * Pots summary: total saved across all pots (beige box with the jar mark) plus
 * up to four individual pots, each with its theme colour bar + name + saved
 * amount. "See Details" → /pots.
 */
function PotsSummaryCard({ pots }: { pots: OverviewResponse["pots"] }) {
  const topPots = pots.top.slice(0, 4);

  return (
    <SectionCard title="Pots" action={{ label: "See Details", to: "/pots" }}>
      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex items-center gap-4 rounded-xl bg-beige-100 p-4 md:w-[247px]">
          <PotIcon aria-hidden="true" className="h-9 w-auto text-green" />
          <div>
            <p className="text-sm text-grey-500">Total Saved</p>
            <p className="text-[2rem] font-bold text-grey-900">
              {formatCurrency(pots.total_saved, { decimals: 0 })}
            </p>
          </div>
        </div>

        {topPots.length > 0 ? (
          <ul className="grid flex-1 grid-cols-2 gap-y-4">
            {topPots.map((pot) => (
              <li
                key={pot.id}
                className="flex flex-col gap-1 border-l-4 pl-4"
                style={{ borderColor: pot.theme }}
              >
                <span className="text-xs text-grey-500">{pot.name}</span>
                <span className="text-sm font-bold text-grey-900">
                  {formatCurrency(pot.total_saved, { decimals: 0 })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex-1 text-sm text-grey-500">
            No pots yet — create one to start saving.
          </p>
        )}
      </div>
    </SectionCard>
  );
}

export default PotsSummaryCard;
