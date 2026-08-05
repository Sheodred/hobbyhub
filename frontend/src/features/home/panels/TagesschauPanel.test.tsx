import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TagesschauPanel } from "./TagesschauPanel";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TagesschauPanel />
    </QueryClientProvider>,
  );
}

describe("TagesschauPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the cached headlines as links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          { headline: "Headline one", teaser: "Teaser one.", url: "https://example.com/1", publishedAt: null },
        ]),
      ),
    );

    renderPanel();

    expect(await screen.findByRole("link", { name: "Headline one" })).toHaveAttribute(
      "href",
      "https://example.com/1",
    );
    expect(screen.getByText("Teaser one.")).toBeInTheDocument();
  });

  it("shows a graceful message when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, { message: "boom" })));

    renderPanel();

    expect(await screen.findByText(/couldn't load the latest headlines/i)).toBeInTheDocument();
  });

  it("shows a graceful message when the cache is empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));

    renderPanel();

    expect(await screen.findByText(/no headlines available/i)).toBeInTheDocument();
  });
});
