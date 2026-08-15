import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeckPage } from "./DeckPage";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderDeck() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/mtg/decks/7182993"]}>
        <Routes>
          <Route path="/mtg/decks/:deckId" element={<DeckPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DeckPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists each section with its cards and total count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          deckId: "7182993",
          name: "Boros Energy",
          pilot: "A. Pilot",
          event: "RC Dortmund",
          url: "/deck/7182993",
          format: "modern",
          archetypeName: "Boros Energy",
          sections: [
            { section: "Mainboard", cards: [{ name: "Ocelot Pride", count: 4 }] },
            { section: "Sideboard", cards: [{ name: "Wrath of the Skies", count: 2 }] },
          ],
        }),
      ),
    );

    renderDeck();

    expect(await screen.findByRole("heading", { name: "Boros Energy", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Mainboard (4)")).toBeInTheDocument();
    expect(screen.getByText("Sideboard (2)")).toBeInTheDocument();
    expect(screen.getByText("Ocelot Pride")).toBeInTheDocument();
  });

  it("says so when the deck is not in the snapshot", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404, { message: "deck not found" })));

    renderDeck();

    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't in the imported snapshot/i);
  });
});
