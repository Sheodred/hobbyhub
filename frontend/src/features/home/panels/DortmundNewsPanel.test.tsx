import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DortmundNewsPanel } from "./DortmundNewsPanel";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DortmundNewsPanel />
    </QueryClientProvider>,
  );
}

describe("DortmundNewsPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the cached headlines as links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          {
            headline: "Erste Verstöße nach neuem Bettelverbot",
            teaser: null,
            url: "https://www.radio912.de/artikel/erste-verstoesse-nach-neuem-bettelverbot-in-innenstadt-2723633",
            publishedAt: null,
          },
        ]),
      ),
    );

    renderPanel();

    expect(await screen.findByRole("link", { name: "Erste Verstöße nach neuem Bettelverbot" })).toHaveAttribute(
      "href",
      "https://www.radio912.de/artikel/erste-verstoesse-nach-neuem-bettelverbot-in-innenstadt-2723633",
    );
  });

  it("shows a graceful message when the cache is empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));

    renderPanel();

    expect(await screen.findByText(/no headlines available/i)).toBeInTheDocument();
  });
});
