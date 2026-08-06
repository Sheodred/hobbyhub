import { NavLink } from "react-router-dom";

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="Open navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <NavLink to="/" className="text-lg font-semibold text-white">
          Sheodred's Forge
        </NavLink>
      </div>

      {/* No primary-nav links here by design - the resizable Sidebar (desktop)
          and MobileDrawer (mobile) already cover that at every breakpoint. No
          account menu either - this site has no accounts (see docs/adr/0009). */}
    </header>
  );
}
