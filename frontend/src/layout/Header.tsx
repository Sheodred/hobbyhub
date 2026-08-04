import { NavLink } from "react-router-dom";

import { useAuth } from "../features/auth/AuthContext";

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const { user, isLoading } = useAuth();

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
          HobbyHub
        </NavLink>
      </div>

      {/* No primary-nav links here by design - the resizable Sidebar (desktop)
          and MobileDrawer (mobile) already cover that at every breakpoint;
          repeating it in the header was pure duplication (both showed the
          exact same links at the exact same md breakpoint). */}
      <div className="flex items-center gap-2">
        {isLoading ? null : user ? (
          <NavLink
            to="/profile"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
            {user.displayName}
          </NavLink>
        ) : (
          <>
            <NavLink
              to="/login"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white"
            >
              Log in
            </NavLink>
            <NavLink
              to="/signup"
              className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Sign up
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
}
