import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../auth/AuthContext";
import { MarketplacePage } from "./MarketplacePage";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const sampleListing = {
  id: "listing-1",
  title: "Wingspan",
  description: "Great condition",
  category: "BOARD_GAME",
  price: 28,
  condition: "Good",
  status: "ACTIVE",
  imageUrls: [],
  sellerId: "seller-1",
  sellerDisplayName: "Adrian",
  createdAt: new Date().toISOString(),
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <MarketplacePage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MarketplacePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders listings returned from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) => {
        if (path === "/api/auth/refresh") return Promise.resolve(jsonResponse(401, { message: "no session" }));
        return Promise.resolve(
          jsonResponse(200, { content: [sampleListing], totalElements: 1, totalPages: 1, number: 0 }),
        );
      }),
    );

    renderPage();

    // Two elements contain "Wingspan" for this fixture (no image, so the
    // placeholder tile falls back to the title text too) - assert on the
    // link's accessible name instead of a bare text match, which would be
    // ambiguous between the two.
    const link = await screen.findByRole("link", { name: /wingspan/i });
    expect(link).toHaveAttribute("href", "/marketplace/listing-1");
    expect(screen.getByText("28.00 €")).toBeInTheDocument();
  });

  it("does not show a New listing link when logged out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) => {
        if (path === "/api/auth/refresh") return Promise.resolve(jsonResponse(401, { message: "no session" }));
        return Promise.resolve(jsonResponse(200, { content: [], totalElements: 0, totalPages: 0, number: 0 }));
      }),
    );

    renderPage();

    expect(await screen.findByText(/no listings match/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new listing/i })).not.toBeInTheDocument();
  });
});
