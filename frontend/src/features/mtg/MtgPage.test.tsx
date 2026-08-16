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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, { mostPlayedCards: [], popularCommanderDecks: [], standardDecks: [], commanderDecks: [] }),
      ),
    );
    renderPage();
    expect(screen.getByText(/not sure what to search for/i)).toBeInTheDocument();
  });

  it("shows EDHREC suggestions before any search, and clicking one searches for it", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/mtg/meta")) {
          return Promise.resolve(
            jsonResponse(200, {
              mostPlayedCards: [{ name: "Sol Ring", url: "https://edhrec.com/sol-ring", numDecks: 100 }],
              popularCommanderDecks: [],
              standardDecks: [],
              commanderDecks: [],
            }),
          );
        }
        return Promise.resolve(
          jsonResponse(200, {
            cards: [
              {
                id: "sol-ring-1",
                name: "Sol Ring",
                manaCost: "{1}",
                typeLine: "Artifact",
                oracleText: "Add {C}{C}.",
                setName: "Alpha",
                rarity: "uncommon",
                imageUrl: null,
                artCropUrl: null,
              },
            ],
            hasMore: false,
            totalCards: 1,
          }),
        );
      }),
    );

    renderPage();
    const suggestion = await screen.findByRole("button", { name: "Sol Ring" });
    await user.click(suggestion);

    expect(await screen.findByText("Sol Ring", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByLabelText(/search cards/i)).toHaveValue("Sol Ring");
  });

  // #37: fixed alongside EDHREC's rotating list, so they are reachable even
  // when the meta call returns nothing.
  it("offers the two reference cards even with no EDHREC data, and searches on click", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/mtg/meta")) {
          return Promise.resolve(
            jsonResponse(200, { mostPlayedCards: [], popularCommanderDecks: [], standardDecks: [], commanderDecks: [] }),
          );
        }
        return Promise.resolve(jsonResponse(200, { cards: [], hasMore: false, totalCards: 0 }));
      }),
    );

    renderPage();

    expect(await screen.findByRole("button", { name: "Thassa's Oracle" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ashnod's Altar" }));

    expect(screen.getByLabelText(/search cards/i)).toHaveValue("Ashnod's Altar");
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
