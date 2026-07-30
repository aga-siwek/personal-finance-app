import { SearchIcon } from "@/components/icons/ui-icons";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransactionSort } from "@/features/transactions/transactionsSlice";
import type { CategoryDTO } from "@/types/api";

const SORT_OPTIONS: { value: TransactionSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "A to Z" },
  { value: "name_desc", label: "Z to A" },
  { value: "amount_desc", label: "Highest" },
  { value: "amount_asc", label: "Lowest" },
];

/** Search field + Sort/Category selects. Category value is a stringified id
 * ("all" for no filter) since Select values are strings. */
function TransactionsFilters({
  search,
  onSearchChange,
  sort,
  onSortChange,
  category,
  onCategoryChange,
  categories,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  sort: TransactionSort;
  onSortChange: (value: TransactionSort) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: CategoryDTO[];
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-xs">
        <label htmlFor="tx-search" className="sr-only">
          Search transaction
        </label>
        <Input
          id="tx-search"
          type="search"
          placeholder="Search transaction"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10"
        />
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 h-4 w-auto -translate-y-1/2 text-grey-900"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="hidden shrink-0 text-sm text-grey-500 md:inline">
            Sort by
          </span>
          <Select value={sort} onValueChange={(v) => onSortChange(v as TransactionSort)}>
            <SelectTrigger aria-label="Sort by" className="min-w-[7rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden shrink-0 text-sm text-grey-500 md:inline">
            Category
          </span>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger aria-label="Category" className="min-w-[9rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export default TransactionsFilters;
