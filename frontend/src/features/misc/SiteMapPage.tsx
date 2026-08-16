import { Link } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { legalNavLinks, primaryNavLinks, secondaryNavLinks, type NavLinkItem } from "../../layout/navigation";

function LinkGroup({ heading, links }: { heading: string; links: NavLinkItem[] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{heading}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="text-slate-200 underline decoration-slate-600 hover:text-indigo-400">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// WCAG 2.4.5 wants two independent ways to reach a page. The hamburger drawer
// was the only one - the two on-site searches look up Scryfall and BGG
// records, not pages of this site, so they don't count as the second way.
export function SiteMapPage() {
  useDocumentTitle("Site map");

  return (
    <FadeIn>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold text-slate-100">Site map</h1>
        <p className="mt-2 text-slate-400">Every page on this site, in one list.</p>

        <div className="mt-8 flex flex-col gap-8">
          <LinkGroup heading="Sections" links={primaryNavLinks} />
          <LinkGroup heading="More" links={secondaryNavLinks} />
          <LinkGroup heading="Small print" links={legalNavLinks.filter((link) => link.to !== "/sitemap")} />
        </div>
      </div>
    </FadeIn>
  );
}
