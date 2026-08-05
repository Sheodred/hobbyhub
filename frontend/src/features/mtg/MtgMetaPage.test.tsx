import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { MtgMetaPage } from "./MtgMetaPage";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MtgMetaPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MtgMetaPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders all four widgets with their cached entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          mostPlayedCards: [{ name: "Sol Ring", url: "https://edhrec.com/cards/sol-ring", numDecks: 200000 }],
          popularCommanderDecks: [],
          standardDecks: [{ name: "4c Control", url: "https://www.mtggoldfish.com/archetype/x", numDecks: null }],
          commanderDecks: [],
        }),
      ),
    );

    renderPage();

    expect(await screen.findByRole("link", { name: "Sol Ring" })).toHaveAttribute(
      "href",
      "https://edhrec.com/cards/sol-ring",
    );
    expect(screen.getByRole("link", { name: "4c Control" })).toBeInTheDocument();
    expect(screen.getAllByText(/no data available/i)).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Moxfield" })).toHaveAttribute("href", "https://www.moxfield.com/decks");
  });
});
