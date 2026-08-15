import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchetypeDecksPage } from "./ArchetypeDecksPage";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/mtg/decks?archetype=%2Farchetype%2Fmodern-boros-energy"]}>
        <ArchetypeDecksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ArchetypeDecksPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("links each deck to its own page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          archetypeName: "Boros Energy",
          decks: [{ deckId: "7182993", name: "Boros Energy", pilot: "A. Pilot", event: "RC Dortmund", url: null }],
        }),
      ),
    );

    renderPage();

    expect(await screen.findByRole("link", { name: /Boros Energy/ })).toHaveAttribute("href", "/mtg/decks/7182993");
    expect(screen.getByText(/A\. Pilot · RC Dortmund/)).toBeInTheDocument();
  });

  it("distinguishes 'not imported yet' from an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { archetypeName: null, decks: [] })));

    renderPage();

    expect(await screen.findByText(/no decks have been imported/i)).toBeInTheDocument();
  });
});
