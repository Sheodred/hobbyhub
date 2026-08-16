import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SITE_NAME, useDocumentTitle } from "./useDocumentTitle";

function Page({ title }: { title: string | null }) {
  useDocumentTitle(title);
  return null;
}

describe("useDocumentTitle", () => {
  // WCAG 2.4.2: before this, every route kept index.html's title, so tab
  // strips, history and screen readers announced the same name everywhere.
  it("prefixes the page name to the site name", () => {
    render(<Page title="Impressum" />);

    expect(document.title).toBe(`Impressum · ${SITE_NAME}`);
  });

  it("falls back to the bare site name while a data-driven title is unknown", () => {
    render(<Page title="Lightning Bolt" />);
    render(<Page title={null} />);

    expect(document.title).toBe(SITE_NAME);
  });
});
