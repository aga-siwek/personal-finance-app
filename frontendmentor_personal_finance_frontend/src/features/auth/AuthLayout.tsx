import type { ReactNode } from "react";
import Logo from "@/components/common/Logo";

/**
 * Shared shell for the Login and Sign Up screens.
 *
 * Mobile-first: a dark "finance" top bar with rounded bottom corners over a
 * cream page, with the form in a white card below.
 *
 * From `lg` up, the design shows a dark illustration panel on the left and
 * the form on the right. The panel is built here minus the illustration
 * image (FM's `illustration-authentication.svg` isn't in the repo yet) — it
 * renders the wordmark and tagline so the desktop layout is usable now; drop
 * the image into the marked slot when the asset is available.
 */
function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row lg:gap-0 lg:bg-background lg:p-5">
      {/* Mobile top bar */}
      <header className="flex h-[70px] shrink-0 items-center justify-center rounded-b-lg bg-grey-900 lg:hidden">
        <Logo className="text-white" />
      </header>

      {/* Desktop illustration panel (image slot deferred) */}
      <aside className="hidden shrink-0 flex-col justify-between rounded-xl bg-grey-900 p-10 text-white lg:flex lg:w-[560px] xl:w-[600px]">
        <Logo className="text-white" />
        {/* Illustration image goes here once the FM asset is added. */}
        <div className="max-w-[280px]">
          <h2 className="text-[2rem] leading-tight font-bold">
            Keep track of your money and save for your future
          </h2>
          <p className="mt-6 text-sm leading-normal text-grey-300">
            Personal finance app puts you in control of your spending. Track
            transactions, set budgets, and add to savings pots easily.
          </p>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex flex-1 items-center justify-center px-4 py-8 lg:px-8">
        <div className="w-full max-w-[480px] rounded-xl bg-card p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;
