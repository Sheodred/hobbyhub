import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MtgCardDetailPage } from "./MtgCardDetailPage";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/mtg/:id" element={<MtgCardDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MtgCardDetailPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the card once loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          id: "card-1",
          name: "Lightning Bolt",
          manaCost: "{R}",
          typeLine: "Instant",
          oracleText: "Lightning Bolt deals 3 damage to any target.",
          colors: ["R"],
          setName: "Alpha",
          rarity: "common",
          imageUrl: "https://img/bolt.jpg",
          artCropUrl: null,
        }),
      ),
    );

    renderAt("/mtg/card-1");

    expect(await screen.findByRole("heading", { name: "Lightning Bolt" })).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("shows a not-found message for a missing card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(404, { message: "Card not found" })),
    );

    renderAt("/mtg/missing");

    expect(await screen.findByRole("alert")).toHaveTextContent(/card not found/i);
  });
});
