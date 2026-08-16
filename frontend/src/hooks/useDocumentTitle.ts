import { useEffect } from "react";

export const SITE_NAME = "Sheodred's Forge";

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
