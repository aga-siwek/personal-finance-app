import { cn } from "@/lib/utils";
import logoLarge from "@/assets/images/logo-large.svg";
import logoSmall from "@/assets/images/logo-small.svg";

/**
 * The official Frontend Mentor "finance" logo. `large` is the full wordmark
 * (used expanded); `small` is the icon-only mark (used in the collapsed
 * sidebar rail). Both SVGs are white, so they sit on the dark nav/auth
 * surfaces the logo always appears on.
 */
function Logo({
  variant = "large",
  className,
}: {
  variant?: "large" | "small";
  className?: string;
}) {
  return (
    <img
      src={variant === "small" ? logoSmall : logoLarge}
      alt="finance"
      className={cn("h-auto", className)}
    />
  );
}

export default Logo;
