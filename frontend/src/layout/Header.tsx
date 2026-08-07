import { NavLink } from "react-router-dom";

interface HeaderProps {
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
}

export function Header({ mobileNavOpen, onToggleMobileNav }: HeaderProps) {
  return (
    <header className="sticky top-4 z-20 flex justify-center px-4 py-2">
      <div className="flex h-14 items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="-ml-1 rounded-full p-2 text-slate-300 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white md:hidden"
          aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileNavOpen}
        >
          <span className="relative block h-[18px] w-[18px]">
            <span
              className={`absolute left-0 top-[3px] h-[1.5px] w-full rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                mobileNavOpen ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rounded-full bg-current transition-opacity duration-200 ${
                mobileNavOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute bottom-[3px] left-0 h-[1.5px] w-full rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                mobileNavOpen ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
        <NavLink to="/" className="whitespace-nowrap text-sm font-semibold tracking-tight text-white">
          Sheodred's Forge
        </NavLink>

        {/* No primary-nav links here by design - the resizable Sidebar (desktop)
            and MobileDrawer (mobile) already cover that at every breakpoint. No
            account menu either - this site has no accounts (see docs/adr/0009). */}
      </div>
    </header>
  );
}
