import { useEffect } from "react";

export const SITE_NAME = "Sheodred's Forge";

// Kept short deliberately - it suffixes every route's title
// (`<page> · SITE_NAME`), so lengthening it would push every page over a
// reasonable title length. The home page needs a real description (#80),
// so it composes this tagline with SITE_NAME instead of passing null.
// index.html's static <title> and og:title carry the same two strings
// (as "SITE_NAME — HOME_TAGLINE") for crawlers, which see no other markup
// on this SPA - keep them in sync by hand if either changes.
export const HOME_TAGLINE = "MTG cards, chess and board game lookup";

/**
 * Sets the document title for as long as the page is mounted (WCAG 2.4.2).
 * Pass null while a data-driven title is still loading - the bare site name
 * is a better announcement than a stale previous page's title.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
