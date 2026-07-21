import { cn } from "@/lib/utils";

/**
 * The "finance" wordmark. Text-based stand-in until the Frontend Mentor
 * logo SVGs are added; colour is inherited so it works on both the dark
 * nav/auth surfaces and light backgrounds.
 */
function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("text-2xl font-bold tracking-tight lowercase", className)}>
      finance
    </span>
  );
}

export default Logo;
