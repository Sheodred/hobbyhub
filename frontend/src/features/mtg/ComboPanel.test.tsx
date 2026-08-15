import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ComboPanel } from "./ComboPanel";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ComboPanel cardName="Lightning Bolt" />
    </QueryClientProvider>,
  );
}

describe("ComboPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders each combo's other cards, deck count, and produced effect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          {
            otherCards: [
              { name: "Firemind's Foresight", imageUrl: "https://cards.scryfall.io/small/front/5/5/abc.jpg" },
            ],
            cardCount: 2,
            numDecks: 206,
            produces: ["Infinite damage"],
            url: "https://commanderspellbook.com/combo/x/",
          },
        ]),
      ),
    );

    renderPanel();

    expect(await screen.findByText("Firemind's Foresight")).toBeInTheDocument();
    expect(screen.getByText(/2 card combo with/)).toBeInTheDocument();
    expect(screen.getByText(/Produces: Infinite damage/)).toBeInTheDocument();
    expect(screen.getByText(/Found in 206 decks/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view full combo/i })).toHaveAttribute(
      "href",
      "https://commanderspellbook.com/combo/x/",
    );
  });

  it("shows a thumbnail per combo card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          {
            otherCards: [
              { name: "Demonic Consultation", imageUrl: "https://cards.scryfall.io/small/front/8/d/x.jpg" },
              { name: "Tainted Pact", imageUrl: null },
            ],
            cardCount: 3,
            numDecks: 206,
            produces: ["Win the game"],
            url: "https://edhrec.com/combos/dimir/742-1295",
          },
        ]),
      ),
    );

    const { container } = renderPanel();

    await screen.findByText("Demonic Consultation");
    // One image, not two: a card without a usable id is named but not shown.
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("src", "https://cards.scryfall.io/small/front/8/d/x.jpg");
  });

  it("renders nothing when there are no combos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));

    const { container } = renderPanel();

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("says the lookup failed instead of silently vanishing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(502, { error: "combo lookup failed" })));

    renderPanel();

    expect(await screen.findByText(/combo lookup is unavailable/i)).toBeInTheDocument();
  });
});
