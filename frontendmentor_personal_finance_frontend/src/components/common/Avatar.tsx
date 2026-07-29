import { cn } from "@/lib/utils";

/**
 * Initials avatar for a transaction's recipient/sender. The API returns no
 * avatar image, so we derive up-to-two initials from the name and pick a
 * deterministic background from the FM palette (dark swatches only, so white
 * initials always meet contrast — WCAG AA). Decorative: the visible name sits
 * next to it, so this is `aria-hidden`.
 */

// Dark palette swatches — all clear AA contrast against white text.
const BG_COLORS = ["#277c78", "#626070", "#c94736", "#826cb0", "#201f24"];

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: colorFor(name) }}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
        className,
      )}
    >
      {initialsFor(name)}
    </span>
  );
}

export default Avatar;
