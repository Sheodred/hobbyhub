import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import sitemapXml from "../../public/sitemap.xml?raw";
import { SiteMapPage } from "../features/misc/SiteMapPage";
import { legalNavLinks, primaryNavLinks, secondaryNavLinks } from "../layout/navigation";
import { routes } from "./routes";

// Every page you can land on has to be listed somewhere, and three lists now
// describe the same set: routes.tsx (the truth), the site map page, and
// public/sitemap.xml. Rather than generating two of them from the first -
// which needs flags on route objects nothing else wants - the invariant is
// asserted here. Add a route without listing it and this fails.
const staticPaths = (routes[0].children ?? [])
  .map((route) => route.path)
  .filter((path): path is string => Boolean(path) && path !== "*" && !path!.includes(":"));

describe("routes", () => {
  it("has more than a handful of static routes", () => {
    expect(staticPaths.length).toBeGreaterThan(5);
  });

  it("points every nav link at a route that exists", () => {
    for (const link of [...primaryNavLinks, ...secondaryNavLinks, ...legalNavLinks]) {
      expect(staticPaths).toContain(link.to);
    }
  });

  it("lists every static route on the site map page", () => {
    render(
      <MemoryRouter>
        <SiteMapPage />
      </MemoryRouter>,
    );

    const listed = screen.getAllByRole("link").map((link) => link.getAttribute("href"));

    // The site map page doesn't link to itself; everything else must be there.
    for (const path of staticPaths.filter((path) => path !== "/sitemap")) {
      expect(listed).toContain(path);
    }
  });

  it("lists every static route in the crawler sitemap", () => {
    for (const path of staticPaths) {
      expect(sitemapXml).toContain(`<loc>https://sheoforge.de${path}</loc>`);
    }
  });
});
