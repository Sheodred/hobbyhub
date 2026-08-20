import { NavLink, useLocation } from "react-router-dom";

import { primaryNavLinks } from "./navigation";

interface HeaderProps {
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
}

// Longest-prefix match against the current path, e.g. "/mtg/meta" resolves to
// the "Best of Meta & Stats" link rather than the "Magic: The Gathering" one.
function useCurrentSectionLabel(): string | null {
  const { pathname } = useLocation();
  const match = primaryNavLinks
    .filter((link) => link.to !== "/" && (pathname === link.to || pathname.startsWith(`${link.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label ?? null;
}

export function Header({ mobileNavOpen, onToggleMobileNav }: HeaderProps) {
  const sectionLabel = useCurrentSectionLabel();

  // z-50, above MobileDrawer's z-40: the hamburger/X button must stay
  // reachable while the drawer is open so the same button that opened it
  // also closes it, instead of disappearing under the drawer's backdrop.
  return (
    <header className="sticky top-4 z-50 flex justify-center px-4 py-2">
      {/* An opaque-enough base, not just a 4% white tint: the pill floats over
          the page (sticky top-4) and content scrolls underneath it, so a
          near-transparent surface let headings read straight through the
          header on mobile. backdrop-blur alone does not hide text, it only
          smears it. The white border and inset highlight keep the glass read.

          When open, this widens to MobileDrawer's own width (max-w-md, same
          px-4 outer gutter) and its bottom corners and border go flat/away
          (rounded-t-*, border-b-0) - the drawer panel picks up with a
          matching flat top, no top border and the same bg-[#0f0b24]/85
          directly beneath it (see its top-[5rem], which is this pill's
          exact rendered bottom edge), so the two read as one shape the pill
          simply grows into, not two stacked cards with a seam between them.

          A plain CSS transition, not framer-motion's `layout` (FLIP
          transform) - `layout` on a `position: sticky` element measures and
          animates unreliably (confirmed: at <500px viewport the drawer that
          anchors off this pill's rendered box ended up offset to the right
          instead of centered under it, because the transform-based
          measurement briefly disagreed with the true box). Width itself
          still snaps rather than animating - CSS cannot tween from an
          intrinsic (auto) width to an explicit one - but every other
          property here is a real transition, and snapping beats an
          unreliable one at any viewport. */}
      <div
        className={`flex h-14 items-center gap-3 border border-white/10 bg-[#0f0b24]/85 px-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl transition-[border-radius,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          mobileNavOpen ? "w-full max-w-md rounded-t-[2rem] border-b-0" : "rounded-full"
        }`}
      >
        <button
          type="button"
          onClick={onToggleMobileNav}
          className={`rounded-full p-2 text-slate-300 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white ${
            mobileNavOpen ? "" : "-ml-1"
          }`}
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
        {/* py-1.5 only to clear the 24px minimum target height (WCAG 2.5.8);
            the pill is centred so it changes nothing visually. */}
        <NavLink to="/" className="whitespace-nowrap py-1.5 text-sm font-semibold tracking-tight text-white">
          Sheodred's Forge
        </NavLink>
        {sectionLabel && (
          <span className="hidden whitespace-nowrap text-sm text-slate-400 sm:inline">&middot; {sectionLabel}</span>
        )}

        {/* No inline primary-nav links here by design - the hamburger opens a
            full-screen overlay (MobileDrawer) with the full nav at every
            breakpoint, so the header itself stays a compact floating pill. No
            account menu either - this site has no accounts (see docs/adr/0009). */}
      </div>
    </header>
  );
}
