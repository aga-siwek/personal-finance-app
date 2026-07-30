/**
 * The selectable colour themes for budgets and pots. `value` is the hex the
 * API stores verbatim (see the models' opaque `theme` string); `name` is the
 * label shown in the theme picker. Matches the FM design palette.
 */
export interface Theme {
  name: string;
  value: string;
}

export const THEMES: Theme[] = [
  { name: "Green", value: "#277c78" },
  { name: "Yellow", value: "#f2cdac" },
  { name: "Cyan", value: "#82c9d7" },
  { name: "Navy", value: "#626070" },
  { name: "Red", value: "#c94736" },
  { name: "Purple", value: "#826cb0" },
];

export function themeName(value: string): string {
  return THEMES.find((t) => t.value === value)?.name ?? value;
}
