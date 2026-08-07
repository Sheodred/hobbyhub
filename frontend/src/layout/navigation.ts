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
  { to: "/chess", label: "Chess vs. AI" },
  { to: "/about", label: "About Me" },
];

export const legalNavLinks: NavLinkItem[] = [
  { to: "/legal/impressum", label: "Impressum" },
  { to: "/legal/privacy", label: "Privacy Policy" },
  { to: "/legal/terms", label: "Terms of Service" },
];
