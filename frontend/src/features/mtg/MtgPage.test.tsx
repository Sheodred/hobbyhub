import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MtgPage } from "./MtgPage";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MtgPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MtgPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a hint before any search is submitted", () => {
    vi.stubGlobal("fetch", vi.fn());
    renderPage();
    expect(screen.getByText(/enter a card name/i)).toBeInTheDocument();
  });

  it("searches and renders results", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          cards: [
            {
              id: "card-1",
              name: "Lightning Bolt",
              manaCost: "{R}",
              typeLine: "Instant",
              oracleText: "3 damage.",
              colors: ["R"],
              setName: "Alpha",
              rarity: "common",
              imageUrl: "https://img/bolt.jpg",
              artCropUrl: null,
            },
          ],
          hasMore: false,
          totalCards: 1,
        }),
      ),
    );

    renderPage();
    await user.type(screen.getByLabelText(/search cards/i), "bolt");
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(await screen.findByText("Lightning Bolt")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lightning Bolt/ })).toHaveAttribute("href", "/mtg/card-1");
  });

  it("shows a no-results message for an empty search", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { cards: [], hasMore: false, totalCards: 0 })),
    );

    renderPage();
    await user.type(screen.getByLabelText(/search cards/i), "zzzznomatch");
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(await screen.findByText(/no cards found/i)).toBeInTheDocument();
  });
});
