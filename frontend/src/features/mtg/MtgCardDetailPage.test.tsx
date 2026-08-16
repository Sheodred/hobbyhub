import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      vi.fn((path: string) => {
        if (path.startsWith("/api/mtg/combos")) {
          return Promise.resolve(jsonResponse(200, []));
        }
        return Promise.resolve(
          jsonResponse(200, {
            id: "card-1",
            name: "Lightning Bolt",
            manaCost: "{R}",
            typeLine: "Instant",
            oracleText: "Lightning Bolt deals 3 damage to any target.",
            setName: "Alpha",
            rarity: "common",
            imageUrl: "https://img/bolt.jpg",
            artCropUrl: null,
          }),
        );
      }),
    );

    renderAt("/mtg/card-1");

    expect(await screen.findByRole("heading", { name: "Lightning Bolt" })).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("shows other printings once loaded, linking each to its own detail page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) => {
        if (path.startsWith("/api/mtg/printings")) {
          return Promise.resolve(
            jsonResponse(200, [
              {
                id: "card-1",
                name: "Lightning Bolt",
                manaCost: "{R}",
                typeLine: "Instant",
                oracleText: null,
                setName: "Alpha",
                rarity: "common",
                imageUrl: "https://img/alpha.jpg",
                artCropUrl: null,
              },
              {
                id: "card-2",
                name: "Lightning Bolt",
                manaCost: "{R}",
                typeLine: "Instant",
                oracleText: null,
                setName: "Masters 25",
                rarity: "uncommon",
                imageUrl: "https://img/masters25.jpg",
                artCropUrl: null,
              },
            ]),
          );
        }
        if (path.startsWith("/api/mtg/combos")) {
          return Promise.resolve(jsonResponse(200, []));
        }
        return Promise.resolve(
          jsonResponse(200, {
            id: "card-1",
            name: "Lightning Bolt",
            manaCost: "{R}",
            typeLine: "Instant",
            oracleText: "Lightning Bolt deals 3 damage to any target.",
            setName: "Alpha",
            rarity: "common",
            imageUrl: "https://img/alpha.jpg",
            artCropUrl: null,
          }),
        );
      }),
    );

    renderAt("/mtg/card-1");
    await screen.findByRole("heading", { name: "Lightning Bolt" });

    expect(await screen.findByText("All printings (2)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /masters 25/i })).toHaveAttribute("href", "/mtg/card-2");
  });

  // The printing you are currently viewing was marked only by an indigo
  // border - colour alone, which a screen reader cannot convey (WCAG 1.4.1).
  it("marks the printing being viewed in a way that is not colour-only", async () => {
    const printing = (id: string, setName: string) => ({
      id,
      name: "Lightning Bolt",
      manaCost: "{R}",
      typeLine: "Instant",
      oracleText: "Lightning Bolt deals 3 damage to any target.",
      setName,
      rarity: "common",
      imageUrl: null,
      artCropUrl: null,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) => {
        if (path.startsWith("/api/mtg/combos")) {
          return Promise.resolve(jsonResponse(200, []));
        }
        if (path.startsWith("/api/mtg/printings")) {
          return Promise.resolve(jsonResponse(200, [printing("card-1", "Alpha"), printing("card-2", "Masters 25")]));
        }
        return Promise.resolve(jsonResponse(200, printing("card-1", "Alpha")));
      }),
    );

    renderAt("/mtg/card-1");
    await screen.findByText("All printings (2)");

    expect(screen.getByRole("link", { name: /alpha/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /masters 25/i })).not.toHaveAttribute("aria-current");
  });

  it("flips a transform card between its faces", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) => {
        if (path.startsWith("/api/mtg/combos")) {
          return Promise.resolve(jsonResponse(200, []));
        }
        return Promise.resolve(
          jsonResponse(200, {
            id: "card-1",
            name: "Delver of Secrets // Insectile Aberration",
            manaCost: "{U}",
            typeLine: "Creature — Human Wizard",
            oracleText: "At the beginning of your upkeep, look at the top card of your library.",
            setName: "Innistrad",
            rarity: "common",
            imageUrl: "https://img/delver-front.jpg",
            artCropUrl: null,
            layout: "transform",
            faces: [
              {
                name: "Delver of Secrets",
                manaCost: "{U}",
                typeLine: "Creature — Human Wizard",
                oracleText: "At the beginning of your upkeep, look at the top card of your library.",
                imageUrl: "https://img/delver-front.jpg",
              },
              {
                name: "Insectile Aberration",
                manaCost: null,
                typeLine: "Creature — Human Insect",
                oracleText: "Flying.",
                imageUrl: "https://img/delver-back.jpg",
              },
            ],
          }),
        );
      }),
    );

    renderAt("/mtg/card-1");

    expect(await screen.findByText(/look at the top card/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /insectile aberration/i }));

    expect(screen.getByText("Flying.")).toBeInTheDocument();
    expect(screen.queryByText(/look at the top card/i)).not.toBeInTheDocument();
    expect(screen.getByText("Creature — Human Insect")).toBeInTheDocument();
  });

  it("stacks both halves of a split card and offers no flip control", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) => {
        if (path.startsWith("/api/mtg/combos")) {
          return Promise.resolve(jsonResponse(200, []));
        }
        return Promise.resolve(
          jsonResponse(200, {
            id: "card-1",
            name: "Fire // Ice",
            manaCost: "{1}{R}",
            typeLine: "Instant // Instant",
            oracleText: "Fire deals 2 damage divided as you choose.",
            setName: "Apocalypse",
            rarity: "uncommon",
            imageUrl: "https://img/fire-ice.jpg",
            artCropUrl: null,
            layout: "split",
            faces: [
              {
                name: "Fire",
                manaCost: "{1}{R}",
                typeLine: "Instant",
                oracleText: "Fire deals 2 damage divided as you choose.",
                imageUrl: null,
              },
              {
                name: "Ice",
                manaCost: "{1}{U}",
                typeLine: "Instant",
                oracleText: "Tap target permanent. Draw a card.",
                imageUrl: null,
              },
            ],
          }),
        );
      }),
    );

    renderAt("/mtg/card-1");

    expect(await screen.findByRole("heading", { name: "Fire" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ice" })).toBeInTheDocument();
    expect(screen.getByText(/fire deals 2 damage/i)).toBeInTheDocument();
    expect(screen.getByText(/tap target permanent/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers no flip control for a normal card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) => {
        if (path.startsWith("/api/mtg/combos")) {
          return Promise.resolve(jsonResponse(200, []));
        }
        return Promise.resolve(
          jsonResponse(200, {
            id: "card-1",
            name: "Lightning Bolt",
            manaCost: "{R}",
            typeLine: "Instant",
            oracleText: "Lightning Bolt deals 3 damage to any target.",
            setName: "Alpha",
            rarity: "common",
            imageUrl: "https://img/bolt.jpg",
            artCropUrl: null,
            layout: "normal",
            faces: null,
          }),
        );
      }),
    );

    renderAt("/mtg/card-1");

    await screen.findByRole("heading", { name: "Lightning Bolt" });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
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
