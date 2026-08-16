export interface NavLinkItem {
  to: string;
  label: string;
}

// Primary nav, shared between the header (desktop) and the mobile drawer,
// so the two never drift out of sync.
export const primaryNavLinks: NavLinkItem[] = [
  { to: "/", label: "Home" },
  { to: "/mtg", label: "Magic: The Gathering" },
  { to: "/mtg/meta", label: "Best of Meta & Stats" },
  { to: "/boardgames", label: "Boardgame Lookup" },
  { to: "/chess", label: "Chess vs. AI" },
  { to: "/about", label: "About Me" },
];

// Small print and utility links - the drawer's bottom section, the footer,
// and the site map all render this same list.
export const legalNavLinks: NavLinkItem[] = [
  { to: "/legal/impressum", label: "Impressum" },
  { to: "/legal/privacy", label: "Privacy Policy" },
  { to: "/legal/terms", label: "Terms of Service" },
  { to: "/legal/accessibility", label: "Accessibility" },
  { to: "/sitemap", label: "Site map" },
];

// Static routes that aren't in the primary nav because you reach them from
// inside a page. Listed so the site map really does cover every page you can
// land on (WCAG 2.4.5); routes.test.ts holds it to that.
export const secondaryNavLinks: NavLinkItem[] = [{ to: "/mtg/decks", label: "Tournament decks" }];
