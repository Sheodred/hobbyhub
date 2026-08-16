import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WotcNewsPanel } from "./WotcNewsPanel";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WotcNewsPanel />
    </QueryClientProvider>,
  );
}

describe("WotcNewsPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the cached headlines as links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          { headline: "New set announced", teaser: null, url: "https://magic.wizards.com/en/news/x", publishedAt: null },
        ]),
      ),
    );

    renderPanel();

    expect(await screen.findByRole("link", { name: "New set announced" })).toHaveAttribute(
      "href",
      "https://magic.wizards.com/en/news/x",
    );
  });

  // Counterpart to the Tagesschau test: this source is English, so it must not
  // inherit a German lang from the shared list component.
  it("leaves the headline list in the document language", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          { headline: "New set announced", teaser: null, url: "https://magic.wizards.com/en/news/x", publishedAt: null },
        ]),
      ),
    );

    renderPanel();

    const link = await screen.findByRole("link", { name: "New set announced" });
    expect(link.closest("[lang]")).toBeNull();
  });

  it("shows a graceful message when the cache is empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));

    renderPanel();

    expect(await screen.findByText(/no headlines available/i)).toBeInTheDocument();
  });
});
