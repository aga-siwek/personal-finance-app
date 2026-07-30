import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { THEMES } from "@/lib/themes";

/**
 * Colour-theme picker shared by the budget and pot forms. Themes already in
 * use are disabled (a colour can't be shared) — except `currentValue`, so the
 * item being edited stays selectable.
 */
function ThemeSelect({
  value,
  onChange,
  usedThemes = [],
  currentValue,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  usedThemes?: string[];
  currentValue?: string;
  id?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Select a theme" />
      </SelectTrigger>
      <SelectContent>
        {THEMES.map((theme) => {
          const used =
            usedThemes.includes(theme.value) && theme.value !== currentValue;
          return (
            <SelectItem key={theme.value} value={theme.value} disabled={used}>
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="size-4 shrink-0 rounded-full"
                  style={{ backgroundColor: theme.value }}
                />
                {theme.name}
                {used && (
                  <span className="ml-auto text-xs text-grey-500">Already used</span>
                )}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default ThemeSelect;
