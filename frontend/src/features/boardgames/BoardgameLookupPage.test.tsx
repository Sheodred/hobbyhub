import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { BoardgameLookupPage } from "./BoardgameLookupPage";
import * as api from "./api";
import type { Boardgame } from "./api";

// The search now lives in the URL (#99), so every render needs a router and
// most assertions want to see what the address bar ended up holding.
function LocationProbe() {
  return <span data-testid="location-search">{useLocation().search}</span>;
}

function renderPage(initialEntry = "/boardgames") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <BoardgameLookupPage />
      <LocationProbe />
    </MemoryRouter>
  );
}

function locationSearch() {
  return screen.getByTestId("location-search").textContent;
}

const CATAN: Boardgame = {
  bggId: 13,
  name: "Catan",
  description: "Trade, build, settle.",
  rating: 7.2,
  numRatings: 1000,
  good: null,
  bad: null,
  partial: false,
  ratings: [],
  bgq: null,
  players: null,
  duration: null,
  age: null,
  complexity: null,
  prices: [], isExpansion: false,
  rank: null,
  source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
};

function mockEmptyExternalSources() {
  vi.spyOn(api, "fetchAmazon").mockResolvedValue({ rating: null, price: null });
  vi.spyOn(api, "fetchBoardGameQuest").mockResolvedValue({ rating: null, review: null });
  vi.spyOn(api, "fetchHall9000").mockResolvedValue({ rating: null, players: null, duration: null, age: null });
  vi.spyOn(api, "fetchBrettspieleReport").mockResolvedValue({ rating: null, complexity: null });
  vi.spyOn(api, "fetchBrettspielpreise").mockResolvedValue(null);
}

// #180/#186: runSearch/runLookupById await the instant local-dump answer
// before firing the six parallel sources - a test that doesn't care about
// that instant path still has to give it a resolved value, or the real
// (unmocked) fetch call hangs past the default waitFor timeout.
function mockNoInstantLocal() {
  vi.spyOn(api, "lookupBoardgameLocal").mockResolvedValue({ status: "unavailable" });
  vi.spyOn(api, "lookupBoardgameLocalById").mockResolvedValue({ status: "unavailable" });
}

// The BggCoreResult shape bgg.php now returns - every Boardgame field
// except ratings/bgq/prices (those come from the other five endpoints).
// Boardgame's age is a labeled string ("ab 12 Jahren"); BggCoreResult's is
// the raw, unit-free number - every fixture that goes through this helper
// only ever needs age: null, so the narrowing here is safe. A fixture that
// needs a real age builds its BggCoreResult directly instead.
function bggCoreFrom(game: Boardgame): api.BggCoreResult {
  const { ratings, bgq, prices, age, ...core } = game;
  void ratings;
  void bgq;
  void prices;
  return { ...core, age: age === null ? null : Number(age) };
}

const AWARDS_2026: api.BoardgameAwards = {
  year: 2026,
  categories: [
    {
      category: "Spiel des Jahres",
      winner: { bggId: 400495, name: "DITO!" },
      // Cozy Stickerville carries an id (resolves directly); the rest are
      // id-less (a click runs a name search).
      nominees: [
        { bggId: 456440, name: "Cozy Stickerville" },
        { bggId: null, name: "Morty Sorty Magic Shop" },
      ],
      recommended: [{ bggId: null, name: "Wilmot's Warehouse" }],
    },
    {
      category: "Kennerspiel des Jahres",
      winner: { bggId: 417197, name: "Rebirth" },
      nominees: [{ bggId: null, name: "Boss Fighters: QR" }],
      recommended: [{ bggId: null, name: "Artengarten" }],
    },
    {
      category: "Kinderspiel des Jahres",
      winner: { bggId: 435346, name: "Die Insel der Mookies" },
      nominees: [{ bggId: null, name: "Buh Party" }],
      recommended: [{ bggId: null, name: "Paleolino" }],
    },
  ],
};

describe("BoardgameLookupPage", () => {
  // #130: the DE/EN toggle persists to localStorage, which (unlike React
  // state) survives across tests in the same file run - clear it so one
  // test's choice can't leak into the next.
  beforeEach(() => localStorage.clear());

  // The example is the site's one worked example, so it is pinned: it has to
  // resolve to a single game, not a disambiguation list (#100).
  it("uses a modern hobby game as the search example", () => {
    renderPage();
    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "Search for a board game, e.g. Frosthaven");
  });

  // BGG's XML API terms require this of any public-facing app using the API,
  // and it has to be visible before a search too - the top-10 list is BGG data
  // as well (#40). A missing logo is a licence problem, not a styling one, so
  // it gets a test rather than trusting nobody deletes it.
  it("shows the Powered by BGG logo linking back to BoardGameGeek", () => {
    renderPage();
    const logo = screen.getByAltText("Powered by BGG");
    expect(logo.closest("a")).toHaveAttribute("href", "https://boardgamegeek.com");
  });

  describe("the DE/EN language toggle (#130)", () => {
    it("defaults to English when nothing is persisted (#171)", () => {
      renderPage();
      expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "DE" })).toHaveAttribute("aria-pressed", "false");
    });

    it("reads a persisted choice back instead of the browser default", () => {
      localStorage.setItem("boardgames_lang", "de");

      renderPage();

      expect(screen.getByRole("button", { name: "DE" })).toHaveAttribute("aria-pressed", "true");
    });

    it("clicking a language switches the pressed state and persists the choice", () => {
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: "DE" }));

      expect(screen.getByRole("button", { name: "DE" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "false");
      expect(localStorage.getItem("boardgames_lang")).toBe("de");
    });

    it("sends the chosen language on every lookup, suggestion, and instant-path call", async () => {
      mockEmptyExternalSources();
      vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });
      vi.spyOn(api, "lookupBoardgameLocal").mockResolvedValue({ status: "unavailable" });

      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "DE" }));
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
      fireEvent.submit(screen.getByRole("search"));

      await waitFor(() => expect(api.fetchBggByQuery).toHaveBeenCalledWith("catan", "de"));
      expect(api.lookupBoardgameLocal).toHaveBeenCalledWith("catan", "de");
    });

    it("re-fetches the current result under its new title when the language is switched mid-result", async () => {
      // First call (EN, on load) resolves under the primary name; the second
      // (after clicking DE) resolves under the German alias - proving the
      // toggle re-runs the lookup rather than only affecting future searches.
      mockEmptyExternalSources();
      vi.spyOn(api, "fetchBggByQuery")
        .mockResolvedValueOnce({ status: "ok", game: bggCoreFrom(CATAN) })
        .mockResolvedValueOnce({ status: "ok", game: bggCoreFrom({ ...CATAN, name: "Die Siedler von Catan" }) });
      vi.spyOn(api, "lookupBoardgameLocal").mockResolvedValue({ status: "unavailable" });

      renderPage("/boardgames?q=catan");
      await screen.findByText("Catan");

      fireEvent.click(screen.getByRole("button", { name: "DE" }));

      expect(await screen.findByText("Die Siedler von Catan")).toBeInTheDocument();
    });
  });

  it("shows the game's rating, good/bad snippet, and BGG source credit after a search", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        bggId: 13,
        name: "Catan",
        description: "Trade, build, settle.",
        rating: 7.2,
        numRatings: 1000,
        good: ["Great trading game."],
        bad: ["Too much luck."],
        partial: false,
        ratings: [],
        bgq: null,
        players: null,
        duration: null,
        age: null,
        complexity: null,
        prices: [], isExpansion: false,
        rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByText("Catan")).toBeInTheDocument());
    expect(screen.getByText("7.2")).toBeInTheDocument();
    expect(screen.getByText("Great trading game.")).toBeInTheDocument();
    expect(screen.getByText("Too much luck.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /BoardGameGeek/i })).toHaveAttribute(
      "href",
      "https://boardgamegeek.com/boardgame/13"
    );
  });

  // #135: the cover is hotlinked from BGG's CDN, so the <img> src has to be
  // exactly the URL the API returned - a rewritten or proxied one would 404.
  it("renders the BGG cover thumbnail on the result card", async () => {
    const thumbnail = "https://cf.geekdo-images.com/x__small/img/y=/fit-in/200x150/pic6293412.jpg";
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, thumbnail }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    const cover = await screen.findByAltText("Cover von Catan");
    expect(cover).toHaveAttribute("src", thumbnail);
    // Without both, the text beside the image reflows when it finally loads.
    expect(cover).toHaveAttribute("loading", "lazy");
    expect(cover).toHaveAttribute("width", "160");
  });

  // The dump-backed partial answer carries no cover, and neither does a game
  // BGG has no picture for. Rendering <img src=""> there would show a broken
  // image and collapse the box the description is laid out against.
  it("keeps a fixed-size placeholder when the game has no cover", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, thumbnail: null }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByText("Catan")).toBeInTheDocument());
    expect(screen.getByRole("img", { name: "Kein Bild zu Catan verfügbar" })).toBeInTheDocument();
    expect(screen.queryByAltText("Cover von Catan")).not.toBeInTheDocument();
  });

  // #116: long descriptions clamp behind a real button; short ones don't get
  // a toggle at all (a "Show more" that reveals two words is worse than none).
  it("clamps a long description behind a Show more/less toggle", async () => {
    const long = `${"Lorem ipsum dolor sit amet ".repeat(40)}FINAL_SENTENCE_MARKER`;
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, description: long }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    const toggle = await screen.findByRole("button", { name: "Show more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/FINAL_SENTENCE_MARKER/)).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/FINAL_SENTENCE_MARKER/)).toBeInTheDocument();
  });

  it("shows a short description with no toggle", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, description: "Trade, build, settle." }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await screen.findByText("Trade, build, settle.");
    expect(screen.queryByRole("button", { name: /Show more|Show less/ })).not.toBeInTheDocument();
  });

  // #129: a machine-translated description must never read as BGG's own
  // words - same honesty rule as the `partial` notice.
  it("labels a machine-translated description and marks it lang=de", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, description: "Handeln, bauen, siedeln.", descriptionTranslated: true }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    const description = await screen.findByText("Handeln, bauen, siedeln.");
    expect(description).toHaveAttribute("lang", "de");
    expect(screen.getByText("Automatisch übersetzt / AI-translated")).toBeInTheDocument();
  });

  it("shows no translation label for BGG's own English description", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, description: "Trade, build, settle.", descriptionTranslated: false }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    const description = await screen.findByText("Trade, build, settle.");
    expect(description).not.toHaveAttribute("lang");
    expect(screen.queryByText(/AI-translated/)).not.toBeInTheDocument();
  });

  it("shows up to 3 good and 3 bad snippets, each independently", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        ...CATAN,
        good: ["Great trading game.", "A modern classic.", "Still holds up."],
        bad: ["Too much luck.", "Rolled badly, lost badly.", "Boring after round two."],
      }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText("Great trading game.")).toBeInTheDocument();
    expect(screen.getByText("A modern classic.")).toBeInTheDocument();
    expect(screen.getByText("Still holds up.")).toBeInTheDocument();
    expect(screen.getByText("Too much luck.")).toBeInTheDocument();
    expect(screen.getByText("Rolled badly, lost badly.")).toBeInTheDocument();
    expect(screen.getByText("Boring after round two.")).toBeInTheDocument();
  });

  // #90-batch: a review is prose someone else wrote, capped so three of them
  // side by side don't dominate the card - independently, so reading one in
  // full doesn't force the others open too.
  it("clamps a review snippet past 35 words behind its own Show more", async () => {
    const longReview = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, good: [longReview, "Short one."], bad: null }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    const toggles = await screen.findAllByRole("button", { name: "Show more" });
    // Only the long snippet gets a toggle - "Short one." is nowhere near 35
    // words and must not grow one of its own.
    expect(toggles).toHaveLength(1);
    expect(screen.getByText("Short one.")).toBeInTheDocument();
    expect(screen.getByText(/word0 word1/)).toBeInTheDocument();
    expect(screen.queryByText(/word49/)).not.toBeInTheDocument();

    fireEvent.click(toggles[0]);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/word49/)).toBeInTheDocument();
  });

  it("shows a loading indicator while the first lookup is in flight (#128)", async () => {
    // Never-resolving lookups keep the page in the loading state.
    vi.spyOn(api, "lookupBoardgameLocal").mockReturnValue(new Promise(() => {}));
    vi.spyOn(api, "fetchBggByQuery").mockReturnValue(new Promise(() => {}));

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByTestId("loading-indicator")).toBeInTheDocument());
  });

  it("shows a per-section loading indicator while the slow sources load (#128/#186)", async () => {
    mockNoInstantLocal();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });
    let resolveAmazon!: (r: api.AmazonResult) => void;
    vi.spyOn(api, "fetchAmazon").mockReturnValue(new Promise((resolve) => { resolveAmazon = resolve; }));
    vi.spyOn(api, "fetchBoardGameQuest").mockResolvedValue({ rating: null, review: null });
    vi.spyOn(api, "fetchHall9000").mockResolvedValue({ rating: null, players: null, duration: null, age: null });
    vi.spyOn(api, "fetchBrettspieleReport").mockResolvedValue({ rating: null, complexity: null });
    vi.spyOn(api, "fetchBrettspielpreise").mockResolvedValue(null);

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByText(/Loading other ratings/)).toBeInTheDocument());

    resolveAmazon({ rating: null, price: null });

    await waitFor(() => expect(screen.queryByText(/Loading other ratings/)).not.toBeInTheDocument());
  });

  it("shows a Spiel-des-Jahres badge when the game is in this year's panel (#117)", async () => {
    mockNoInstantLocal();
    vi.spyOn(api, "boardgameAwards").mockResolvedValue(AWARDS_2026);
    // DITO! (400495) is the Spiel-des-Jahres winner in the fixture.
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, bggId: 400495, name: "DITO!" }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "dito" } });
    fireEvent.submit(screen.getByRole("search"));

    const badge = await screen.findByTestId("award-badge");
    expect(badge).toHaveTextContent("Spiel des Jahres 2026");
  });

  it("renders BGG mechanic and category tags on the result card (#131)", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        ...CATAN,
        categories: [{ id: 1021, name: "Negotiation" }],
        mechanics: [
          { id: 2072, name: "Dice Rolling" },
          { id: 2008, name: "Trading" },
        ],
      }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByText("Catan")).toBeInTheDocument());
    expect(screen.getByText("Negotiation")).toBeInTheDocument();
    expect(screen.getByText("Dice Rolling")).toBeInTheDocument();
    expect(screen.getByText("Trading")).toBeInTheDocument();
    // Category stays up near the facts row; mechanics moved below the
    // description, so the two must not land in the same DOM position.
    const description = screen.getByText("Trade, build, settle.");
    // compareDocumentPosition bit 4 = Node.DOCUMENT_POSITION_FOLLOWING.
    expect(
      description.compareDocumentPosition(screen.getByText("Negotiation")) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(0);
    expect(
      description.compareDocumentPosition(screen.getByText("Dice Rolling")) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("links each mechanic and category tag to BGG's own page for it", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        ...CATAN,
        categories: [{ id: 1021, name: "Negotiation" }],
        mechanics: [{ id: 2072, name: "Dice Rolling" }],
      }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText("Negotiation")).toHaveAttribute(
      "href",
      "https://boardgamegeek.com/boardgamecategory/1021"
    );
    expect(screen.getByText("Dice Rolling")).toHaveAttribute(
      "href",
      "https://boardgamegeek.com/boardgamemechanic/2072"
    );
  });

  it("shows the strategy, family, and thematic game ranks alongside the overall BGG rank", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, rank: 627, strategyRank: 592, familyRank: 206, thematicRank: 1 }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText("BGG rank #627")).toBeInTheDocument();
    expect(screen.getByText("Strategy rank #592")).toBeInTheDocument();
    expect(screen.getByText("Family rank #206")).toBeInTheDocument();
    expect(screen.getByText("Thematic rank #1")).toBeInTheDocument();
  });

  it("says nothing about a strategy/family/thematic rank the game does not have", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, rank: 627, strategyRank: null, familyRank: null, thematicRank: null }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await screen.findByText("BGG rank #627");
    expect(screen.queryByText(/Strategy rank/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Family rank/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Thematic rank/)).not.toBeInTheDocument();
  });

  it.each([
    ["cooperative", "Cooperative"],
    ["one-vs-all", "One vs. All"],
    ["competitive", "Competitive"],
  ] as const)("shows the interaction type %s as %s (#131)", async (interaction, label) => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, interaction }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText(label)).toBeInTheDocument();
  });

  it("shows nothing for interaction type rather than guessing when it's null", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, interaction: null }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await screen.findByText("Catan");
    expect(screen.queryByText(/Competitive|Cooperative|One vs\. All/)).not.toBeInTheDocument();
  });

  it("shows no award badge for a game that isn't in the panel (#117)", async () => {
    mockNoInstantLocal();
    vi.spyOn(api, "boardgameAwards").mockResolvedValue(AWARDS_2026);
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) }); // bggId 13

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByText("Catan")).toBeInTheDocument());
    expect(screen.queryByTestId("award-badge")).not.toBeInTheDocument();
  });

  it("shows a disambiguation list and resolves the picked candidate", async () => {
    mockNoInstantLocal();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "disambiguation",
      candidates: [
        { bggId: 13, name: "Catan", yearPublished: 1995 },
        { bggId: 1234, name: "Catan: Cities and Knights", yearPublished: 1998 },
      ],
    });
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggById").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        bggId: 13,
        name: "Catan",
        description: "Trade, build, settle.",
        rating: 7.2,
        numRatings: 1000,
        good: null,
        bad: null,
        partial: false,
        ratings: [],
        bgq: null,
        players: null,
        duration: null,
        age: null,
        complexity: null,
        prices: [], isExpansion: false,
        rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    const option = await screen.findByRole("button", { name: /Catan \(1995\)/ });
    fireEvent.click(option);

    await waitFor(() => expect(api.fetchBggById).toHaveBeenCalledWith(13, "en"));
    expect(await screen.findByText("Trade, build, settle.")).toBeInTheDocument();
  });

  it("says so plainly when only the ranks-dump data is available", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        bggId: 13,
        name: "Catan",
        description: "",
        rating: 7.1,
        numRatings: 143738,
        good: null,
        bad: null,
        partial: true,
        ratings: [
          { source: "Amazon.de", value: 4.7, max: 5, count: 257, title: "KOSMOS Catan - Das Spiel", url: "https://www.amazon.de/dp/B00CATAN01" },
          { source: "H@LL9000", value: 4.8, max: 6, count: 17, title: null, url: "https://www.hall9000.de/html/spiel/catan" },
        ],
        bgq: null,
        players: "2 - 4",
        duration: "30 - 45 Minuten",
        age: null,
        complexity: null,
        prices: [], isExpansion: false,
        rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText(/Only the community rating is available/)).toBeInTheDocument();
    expect(screen.getByText("7.1")).toBeInTheDocument();
  });

  it("shows every external rating with its own scale", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchAmazon").mockResolvedValue({
      rating: { source: "Amazon.de", value: 4.7, max: 5, count: 257, title: "KOSMOS Catan - Das Spiel", url: "https://www.amazon.de/dp/B00CATAN01" },
      price: null,
    });
    vi.spyOn(api, "fetchHall9000").mockResolvedValue({
      rating: { source: "H@LL9000", value: 4.8, max: 6, count: 17, title: null, url: "https://www.hall9000.de/html/spiel/catan" },
      players: null,
      duration: null,
      age: null,
    });
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        bggId: 13, name: "Catan", description: "Trade, build, settle.",
        rating: 7.2, numRatings: 1000, good: null, bad: null, partial: false,
        ratings: [], bgq: null,
        players: "2 - 4",
        duration: "30 - 45",
        age: null,
        complexity: null,
        prices: [], isExpansion: false,
        rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText("4.7")).toBeInTheDocument();
    expect(screen.getByText("4.8")).toBeInTheDocument();
    expect(screen.getByText("/ 6")).toBeInTheDocument();
    expect(screen.getByText(/257 ratings/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "KOSMOS Catan - Das Spiel" })).toHaveAttribute(
      "href", "https://www.amazon.de/dp/B00CATAN01"
    );
  });

  it("shows the facts that decide whether a game suits the table", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    // Built directly as a BggCoreResult (not via bggCoreFrom) - `age` is a
    // raw unit-free number here, which Boardgame's own (labeled-string) age
    // field can't express.
    const game: api.BggCoreResult = {
      bggId: 926, name: "Catan: Cities & Knights", description: "More Catan.",
      rating: 7.4, numRatings: 40000, good: null, bad: null, partial: false,
      players: "3 - 4",
      duration: "90",
      age: 12,
      complexity: { value: 12, max: 20, source: "brettspiele-report" },
      isExpansion: true,
      rank: 401,
      source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/926" },
    };
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cities and knights" } });
    fireEvent.submit(screen.getByRole("search"));

    // One chip per fact, not one dot-separated line. Default lang is "en".
    expect(await screen.findByText("3 - 4 players")).toBeInTheDocument();
    expect(screen.getByText("90 minutes")).toBeInTheDocument();
    expect(screen.getByText("ages 12+")).toBeInTheDocument();
    expect(screen.getByText("BGG rank #401")).toBeInTheDocument();
    expect(screen.getByText("Expansion")).toBeInTheDocument();
    // Not a BGG 1-5 weight vote (max !== 5), so no Light/Medium/Heavy label -
    // just the source's own scale.
    expect(screen.getByText("Komplexität: 12 / 20")).toBeInTheDocument();
  });

  it("labels a BGG-scale complexity by its nearest weight vote", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({ ...CATAN, complexity: { value: 2.83, max: 5, source: "BoardGameGeek" } }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    // 2.83 rounds to 3 - "Medium".
    expect(await screen.findByText("Komplexität: Medium (2.83 / 5)")).toBeInTheDocument();
  });

  it("leaves out facts no source published, rather than showing empty labels", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        bggId: 13, name: "Catan", description: "Trade, build, settle.",
        rating: 7.2, numRatings: 1000, good: null, bad: null, partial: false,
        ratings: [], bgq: null,
        players: "3 - 4", duration: null, age: null, complexity: null, prices: [], isExpansion: false, rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText("3 - 4 players")).toBeInTheDocument();
    expect(screen.queryByText("Expansion")).not.toBeInTheDocument();
    expect(screen.queryByText(/Komplexität/)).not.toBeInTheDocument();
    // An unranked game says nothing, rather than "BGG rank #0".
    expect(screen.queryByText(/BGG rank/)).not.toBeInTheDocument();
  });

  it("shows Board Game Quest's score and how the game plays", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBoardGameQuest").mockResolvedValue({
      rating: { source: "Board Game Quest", value: 3.5, max: 5, count: null, title: "Intarsia Review", url: "https://www.boardgamequest.com/intarsia-review/" },
      review: {
        rules: "Players start with a random hand of ten cards in four colors plus wilds.",
        hits: ["Beautiful production"], misses: ["Lacking replay value"],
        title: "Intarsia Review", url: "https://www.boardgamequest.com/intarsia-review/",
      },
    });
    vi.spyOn(api, "fetchBrettspieleReport").mockResolvedValue({
      rating: { source: "brettspiele-report", value: 15, max: 20, count: null, title: "Intarsia", url: "https://www.brettspiele-report.de/intarsia/" },
      complexity: null,
    });
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        bggId: 331106, name: "Intarsia", description: "", rating: 7.2, numRatings: 900,
        good: ["Beautiful production"], bad: ["Lacking replay value"], partial: true, players: "2 - 4", duration: "30 - 45",
        age: null, complexity: null, prices: [], isExpansion: false, rank: null,
        ratings: [], bgq: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/331106" },
      }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "intarsia" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText("3.5")).toBeInTheDocument();
    expect(screen.getByText(/random hand of ten cards/)).toBeInTheDocument();
    // A 15/20 must never be shown next to a 3.5/5 without its scale.
    expect(screen.getByText("15.0")).toBeInTheDocument();
    expect(screen.getByText("/ 20")).toBeInTheDocument();
    expect(screen.getByText(/2 - 4 players/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /full review at Board Game Quest/ })).toHaveAttribute(
      "href", "https://www.boardgamequest.com/intarsia-review/"
    );
  });

  // WCAG 4.1.3. The region has to be in the DOM before the text arrives -
  // one that mounts with its text already inside it is routinely not
  // announced at all, which is the failure mode this asserts against.
  it("announces the outcome through a live region that is already mounted", async () => {
    mockNoInstantLocal();
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        bggId: 13, name: "Catan", description: "Trade, build, settle.",
        rating: 7.2, numRatings: 1000, good: null, bad: null, partial: false,
        ratings: [], bgq: null, players: null, duration: null, age: null,
        complexity: null, prices: [], isExpansion: false, rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      }),
    });

    renderPage();

    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Catan found"));
    // Same node throughout, not a remount.
    expect(screen.getByRole("status")).toBe(status);
  });

  it("shows up to 3 suggestions while typing and runs the lookup for the one clicked", async () => {
    vi.spyOn(api, "suggestBoardgames").mockResolvedValue([
      { bggId: 13, name: "Catan", yearPublished: 1995 },
      { bggId: 926, name: "Catan: Cities & Knights", yearPublished: 1998 },
    ]);
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggById").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        bggId: 13, name: "Catan", description: "Trade, build, settle.",
        rating: 7.2, numRatings: 1000, good: null, bad: null, partial: false,
        ratings: [], bgq: null, players: null, duration: null, age: null,
        complexity: null, prices: [], isExpansion: false, rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      }),
    });

    renderPage();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "cat" } });

    await waitFor(() => expect(api.suggestBoardgames).toHaveBeenCalledWith("cat", "en"));
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);
    expect(input).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(options[0]);

    await waitFor(() => expect(api.fetchBggById).toHaveBeenCalledWith(13, "en"));
    expect(await screen.findByText("Trade, build, settle.")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("does not fetch suggestions below the minimum query length", async () => {
    vi.spyOn(api, "suggestBoardgames").mockResolvedValue([]);

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "c" } });

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(api.suggestBoardgames).not.toHaveBeenCalled();
  });

  it("supports arrow-key navigation and Enter to pick a suggestion", async () => {
    vi.spyOn(api, "suggestBoardgames").mockResolvedValue([
      { bggId: 13, name: "Catan", yearPublished: 1995 },
      { bggId: 926, name: "Catan: Cities & Knights", yearPublished: 1998 },
    ]);
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggById").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        bggId: 926, name: "Catan: Cities & Knights", description: "More Catan.",
        rating: 7.4, numRatings: 40000, good: null, bad: null, partial: false,
        ratings: [], bgq: null, players: null, duration: null, age: null,
        complexity: null, prices: [], isExpansion: true, rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/926" },
      }),
    });

    renderPage();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "cat" } });
    await screen.findAllByRole("option");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "boardgame-suggestion-926");

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(api.fetchBggById).toHaveBeenCalledWith(926, "en"));
    expect(await screen.findByText("More Catan.")).toBeInTheDocument();
  });

  it("closes the suggestion list on Escape without clearing the typed text", async () => {
    vi.spyOn(api, "suggestBoardgames").mockResolvedValue([{ bggId: 13, name: "Catan", yearPublished: 1995 }]);

    renderPage();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "cat" } });
    await screen.findAllByRole("option");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(input).toHaveValue("cat");
  });

  it("degrades silently when the suggest endpoint errors", async () => {
    vi.spyOn(api, "suggestBoardgames").mockRejectedValue(new Error("network error"));

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cat" } });

    await waitFor(() => expect(api.suggestBoardgames).toHaveBeenCalled());
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("offers close names instead of an error when nothing matches (#92)", async () => {
    mockNoInstantLocal();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "not_found",
      query: "teasd",
      suggestions: [
        { bggId: 13, name: "Catan", yearPublished: 1995 },
        { bggId: 266192, name: "Wingspan", yearPublished: 2019 },
      ],
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "teasd" } });
    fireEvent.submit(screen.getByRole("search"));

    // The old behaviour surfaced a 502 as "Something went wrong looking up
    // that board game" - a server fault for what is really "no such game".
    await waitFor(() => expect(screen.getByText(/did you mean/i)).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Catan/ })).toBeInTheDocument();
  });

  it("says 'no exact match' once, in the status region only (#107)", async () => {
    mockNoInstantLocal();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "not_found",
      query: "teasd",
      suggestions: [{ bggId: 13, name: "Catan", yearPublished: 1995 }],
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "teasd" } });
    fireEvent.submit(screen.getByRole("search"));

    // The status region is visible, so a second paragraph repeating it renders
    // the same sentence twice, stacked.
    await waitFor(() => expect(screen.getByText(/did you mean/i)).toBeInTheDocument());
    expect(screen.getAllByText(/no exact match/i)).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(/no exact match for “teasd”\. 1 similar name suggested\./i);
  });

  it("says so plainly when nothing matches and there is nothing to suggest", async () => {
    mockNoInstantLocal();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "not_found",
      query: "zzzzqqqq",
      suggestions: [],
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzzzqqqq" } });
    fireEvent.submit(screen.getByRole("search"));

    // The status region is visible and carries this sentence on its own; the
    // paragraph below it only adds the advice (#107).
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/no board game found/i));
    expect(screen.getAllByText(/no board game found/i)).toHaveLength(1);
    expect(screen.getByText(/check the spelling/i)).toBeInTheDocument();
    expect(screen.queryByText(/did you mean/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("puts the chosen name in the search box when a did-you-mean suggestion is taken", async () => {
    mockNoInstantLocal();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "not_found",
      query: "ctaan",
      suggestions: [{ bggId: 13, name: "Catan", yearPublished: 1995 }],
    });
    const byId = vi.spyOn(api, "fetchBggById").mockResolvedValue({
      status: "disambiguation",
      candidates: [],
    });

    renderPage();
    const box = screen.getByRole("combobox");
    fireEvent.change(box, { target: { value: "ctaan" } });
    fireEvent.submit(screen.getByRole("search"));

    fireEvent.click(await screen.findByRole("button", { name: /Catan/ }));

    await waitFor(() => expect(byId).toHaveBeenCalledWith(13, "en"));
    // Leaving the typo in the box desyncs what the user sees from what they
    // got back - the same bug pick() had for disambiguation candidates.
    expect(box).toHaveValue("Catan");
  });

  it("does not reopen the typeahead over the result after taking a suggestion", async () => {
    mockNoInstantLocal();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "not_found",
      query: "ctaan",
      suggestions: [{ bggId: 13, name: "Catan", yearPublished: 1995 }],
    });
    vi.spyOn(api, "fetchBggById").mockResolvedValue({ status: "disambiguation", candidates: [] });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ctaan" } });
    fireEvent.submit(screen.getByRole("search"));
    fireEvent.click(await screen.findByRole("button", { name: /Catan/ }));

    await waitFor(() => expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
  it("shows what the local dump already knows before the slow sources arrive (#91)", async () => {
    vi.spyOn(api, "lookupBoardgameLocal").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13,
        name: "Catan",
        description: "",
        rating: 7.1,
        numRatings: 143738,
        good: null,
        bad: null,
        partial: true,
        ratings: [],
        bgq: null,
        players: null,
        duration: null,
        age: null,
        complexity: null,
        prices: [], isExpansion: false,
        rank: 566,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    // The slow half never settles during this test, so anything asserted
    // below is necessarily coming from the instant path.
    vi.spyOn(api, "fetchBggByQuery").mockReturnValue(new Promise(() => {}));

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByText("Catan")).toBeInTheDocument());
    expect(screen.getByText("7.1")).toBeInTheDocument();
    // And it must say more is still coming, or a partial answer reads as
    // the whole answer.
    expect(screen.getByRole("status")).toHaveTextContent(/still/i);
  });

  it("replaces the instant answer with the full one when the slow sources land", async () => {
    vi.spyOn(api, "lookupBoardgameLocal").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13, name: "Catan", description: "", rating: 7.1, numRatings: 143738,
        good: null, bad: null, partial: true, ratings: [], bgq: null, players: null,
        duration: null, age: null, complexity: null, prices: [], isExpansion: false, rank: 566,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        bggId: 13, name: "Catan", description: "Trade, build, settle.", rating: 7.2,
        numRatings: 1000, good: ["Great trading game."], bad: ["Too much luck."],
        partial: false, ratings: [], bgq: null, players: "3-4", duration: null,
        age: null, complexity: null, prices: [], isExpansion: false, rank: 566,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      }),
    });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByText("Great trading game.")).toBeInTheDocument());
    expect(screen.getByText("Trade, build, settle.")).toBeInTheDocument();
    expect(screen.getByRole("status")).not.toHaveTextContent(/still/i);
  });

  it("keeps the instant answer when the slow half fails outright", async () => {
    vi.spyOn(api, "lookupBoardgameLocal").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13, name: "Catan", description: "", rating: 7.1, numRatings: 143738,
        good: null, bad: null, partial: true, ratings: [], bgq: null, players: null,
        duration: null, age: null, complexity: null, prices: [], isExpansion: false, rank: 566,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });
    vi.spyOn(api, "fetchBggByQuery").mockRejectedValue(new Error("upstream down"));

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    // Throwing away a good partial answer because the enrichment failed
    // would be a regression on today's behaviour, which at least shows the
    // dump's data when BGG is unreachable.
    await waitFor(() => expect(screen.getByRole("status")).not.toHaveTextContent(/still/i));
    expect(screen.getByText("Catan")).toBeInTheDocument();
    expect(screen.getByText("7.1")).toBeInTheDocument();
  });
  it("survives an instant answer that omits the fields no source has filled yet", async () => {
    // Deliberately NOT a full Boardgame fixture. This is the exact shape
    // /api/boardgames/local returned when #91 shipped - the type says
    // ratings is an array, the network said otherwise, and the renderer
    // threw undefined.length. With no error boundary in the app that blanked
    // the entire page on every successful search.
    vi.spyOn(api, "lookupBoardgameLocal").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13,
        name: "Catan",
        description: "",
        rating: 7.1,
        numRatings: 143738,
        good: null,
        bad: null,
        partial: true,
        isExpansion: false,
        rank: 627,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      } as unknown as Boardgame,
    });
    vi.spyOn(api, "fetchBggByQuery").mockReturnValue(new Promise(() => {}));

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByText("Catan")).toBeInTheDocument());
    expect(screen.getByText("7.1")).toBeInTheDocument();
  });

  // #102: a way in for someone who has nothing to type yet.
  const topGames = [
    { bggId: 224517, name: "Brass: Birmingham", yearPublished: 2018, rank: 1, rating: 8.6, numRatings: 45832 },
    { bggId: 161936, name: "Pandemic Legacy: Season 1", yearPublished: 2015, rank: 2, rating: 8.5, numRatings: 57708 },
  ];

  it("offers the top-ranked games before a search and resolves the clicked one by id", async () => {
    vi.spyOn(api, "topBoardgames").mockResolvedValue(topGames);
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggById").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom({
        bggId: 224517,
        name: "Brass: Birmingham",
        description: "Canals and coal.",
        rating: 8.6,
        numRatings: 45000,
        good: null,
        bad: null,
        partial: false,
        ratings: [],
        bgq: null,
        players: null,
        duration: null,
        age: null,
        complexity: null,
        prices: [], isExpansion: false,
        rank: 1,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/224517" },
      }),
    });

    renderPage();

    expect(await screen.findByRole("heading", { name: /top .*BoardGameGeek/i })).toBeInTheDocument();
    const card = await screen.findByRole("button", { name: /Brass: Birmingham/ });
    expect(card).toHaveAccessibleName(expect.stringContaining("2018"));
    expect(card).toHaveAccessibleName(expect.stringContaining("8.6"));
    // #179: the ranks dump has no player count/duration/age to show, so the
    // taller tile shows the ratings count instead - already free on this row.
    expect(card).toHaveAccessibleName(expect.stringContaining("45,832 ratings"));

    fireEvent.click(card);

    // By id, never by name: a name round-trip can land on the
    // disambiguation flow, which is absurd for a curated list.
    await waitFor(() => expect(api.fetchBggById).toHaveBeenCalledWith(224517, "en"));
    expect(await screen.findByText("Canals and coal.")).toBeInTheDocument();
  });

  it("gets out of the way once a result is on screen", async () => {
    vi.spyOn(api, "topBoardgames").mockResolvedValue(topGames);
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "not_found",
      query: "zzz",
      suggestions: [],
    });

    renderPage();
    await screen.findByRole("button", { name: /Brass: Birmingham/ });

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzz" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.queryByRole("button", { name: /Brass: Birmingham/ })).toBeNull());
  });

  it("renders nothing at all when the ranks dump is empty", async () => {
    vi.spyOn(api, "topBoardgames").mockResolvedValue([]);
    // The award panel has its own source; with both empty the idle grid is gone.
    vi.spyOn(api, "boardgameAwards").mockResolvedValue({ year: null, categories: [] });

    renderPage();

    await waitFor(() => expect(api.topBoardgames).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: /top .*BoardGameGeek/i })).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });

  // #90
  it("shows the amazon.de retail price and links to used-market searches", async () => {
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom(CATAN),
    });
    vi.spyOn(api, "fetchAmazon").mockResolvedValue({
      rating: null,
      price: { value: 22.9, currency: "EUR", source: "Amazon.de", url: "https://www.amazon.de/dp/B0DSWFN2XZ" },
    });
    vi.spyOn(api, "fetchBoardGameQuest").mockResolvedValue({ rating: null, review: null });
    vi.spyOn(api, "fetchHall9000").mockResolvedValue({ rating: null, players: null, duration: null, age: null });
    vi.spyOn(api, "fetchBrettspieleReport").mockResolvedValue({ rating: null, complexity: null });
    vi.spyOn(api, "fetchBrettspielpreise").mockResolvedValue(null);

    renderPage("/boardgames?q=catan");

    const priceLink = await screen.findByRole("link", { name: /22,90|22\.90/ });
    expect(priceLink).toHaveAttribute("href", "https://www.amazon.de/dp/B0DSWFN2XZ");

    const ebay = screen.getByRole("link", { name: /eBay\.de/ });
    expect(ebay).toHaveAttribute("href", expect.stringContaining("ebay.de/sch/i.html?_nkw=Catan"));
    const kleinanzeigen = screen.getByRole("link", { name: /Kleinanzeigen\.de/ });
    expect(kleinanzeigen).toHaveAttribute("href", expect.stringContaining("kleinanzeigen.de/s-suchanfrage.html?keywords=Catan"));
  });

  // #176: brettspielpreise.de and amazon.de each contribute their own price
  // when they both have one for this game - neither displaces the other.
  it("shows every source's price when more than one has one", async () => {
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "ok",
      game: bggCoreFrom(CATAN),
    });
    vi.spyOn(api, "fetchAmazon").mockResolvedValue({
      rating: null,
      price: { value: 22.9, currency: "EUR", source: "Amazon.de", url: "https://www.amazon.de/dp/B0DSWFN2XZ" },
    });
    vi.spyOn(api, "fetchBoardGameQuest").mockResolvedValue({ rating: null, review: null });
    vi.spyOn(api, "fetchHall9000").mockResolvedValue({ rating: null, players: null, duration: null, age: null });
    vi.spyOn(api, "fetchBrettspieleReport").mockResolvedValue({ rating: null, complexity: null });
    vi.spyOn(api, "fetchBrettspielpreise").mockResolvedValue(
      { value: 19.99, currency: "EUR", source: "Brettspielpreise.de", url: "https://brettspielpreise.de/item/go?x" }
    );

    renderPage("/boardgames?q=catan");

    const bspLink = await screen.findByRole("link", { name: /19,99|19\.99/ });
    expect(bspLink).toHaveAttribute("href", "https://brettspielpreise.de/item/go?x");
    const amazonLink = screen.getByRole("link", { name: /22,90|22\.90/ });
    expect(amazonLink).toHaveAttribute("href", "https://www.amazon.de/dp/B0DSWFN2XZ");
  });

  // #177: eBay/Kleinanzeigen are permanent search link-outs, never a
  // fetched listing (see usedMarketSearchUrls) - showing them for a game
  // with no retail price anywhere reads as free advertising with nothing
  // behind it, so they hide alongside the rest of "Where to buy" instead.
  it("hides the used-market search links when no source has a price", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage("/boardgames?q=catan");

    await screen.findByText("Trade, build, settle.");
    expect(screen.queryByRole("link", { name: /eBay\.de/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Kleinanzeigen\.de/ })).toBeNull();
  });

  it("the Clear button empties the search and returns to the overview", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage("/boardgames?q=catan");
    await screen.findByText("Trade, build, settle.");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(locationSearch()).toBe("");
    // The heading is a plain heading again, not a reset control, once there
    // is nothing left to reset.
    expect(screen.queryByRole("button", { name: "Boardgame Lookup" })).toBeNull();
  });

  it("clicking the page heading also resets to the overview", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage("/boardgames?q=catan");

    fireEvent.click(await screen.findByRole("button", { name: "Boardgame Lookup" }));

    expect(locationSearch()).toBe("");
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("offers a way to scroll back to the top of a long answer", async () => {
    // BoardgameLookupPage renders standalone in these tests (no AppShell),
    // so the real scroll container the button targets does not exist here -
    // stand one up the same way AppShell does (id="main-content").
    const main = document.createElement("main");
    main.id = "main-content";
    document.body.appendChild(main);
    const scrollTo = vi.fn();
    main.scrollTo = scrollTo;

    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage("/boardgames?q=catan");
    await screen.findByText("Trade, build, settle.");

    fireEvent.click(screen.getByRole("button", { name: /back to top/i }));

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    main.remove();
  });
});

// #99: a result you cannot link to might as well not have happened.
describe("BoardgameLookupPage — shareable searches", () => {
  it("puts the submitted search in the URL", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(locationSearch()).toBe("?q=catan"));
  });

  it("runs the lookup from ?q= on mount, so a shared link lands on the result", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage("/boardgames?q=catan");

    expect(await screen.findByText("Trade, build, settle.")).toBeInTheDocument();
    expect(api.fetchBggByQuery).toHaveBeenCalledWith("catan", "en");
    // The box shows what is being searched for, not an empty field.
    expect(screen.getByRole("combobox")).toHaveValue("catan");
  });

  it("resolves ?bgg_id= from the URL without guessing at a name", async () => {
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggById").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });
    const byName = vi.spyOn(api, "fetchBggByQuery");

    renderPage("/boardgames?bgg_id=13");

    await waitFor(() => expect(api.fetchBggById).toHaveBeenCalledWith(13, "en"));
    expect(byName).not.toHaveBeenCalled();
  });

  it("ignores a nonsense bgg_id instead of asking the API about it", () => {
    const byId = vi.spyOn(api, "lookupBoardgameById");

    renderPage("/boardgames?bgg_id=nope");

    expect(byId).not.toHaveBeenCalled();
  });

  it("shows the local dump answer instantly on a ?bgg_id= link before the slow lookup lands (#115)", async () => {
    vi.spyOn(api, "lookupBoardgameLocalById").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13, name: "Catan", description: "", rating: 7.1, numRatings: 143738,
        good: null, bad: null, partial: true, ratings: [], bgq: null, players: null,
        duration: null, age: null, complexity: null, prices: [], isExpansion: false, rank: 566,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });
    // The slow half never settles, so anything on screen came from the instant
    // path - the blank-page bug was that this path was skipped entirely (#115).
    vi.spyOn(api, "fetchBggById").mockReturnValue(new Promise(() => {}));

    renderPage("/boardgames?bgg_id=13");

    await waitFor(() => expect(api.lookupBoardgameLocalById).toHaveBeenCalledWith(13, "en"));
    expect(screen.getByText("Catan")).toBeInTheDocument();
    expect(screen.getByText("7.1")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/still/i);
  });

  it("navigates to a random game by bgg_id when Surprise me is clicked (#120)", async () => {
    // The dump is non-empty (top-10 loaded), so the button renders.
    vi.spyOn(api, "topBoardgames").mockResolvedValue([
      { bggId: 13, name: "Catan", yearPublished: 1995, rank: 566, rating: 7.1, numRatings: 143738 },
    ]);
    vi.spyOn(api, "randomBoardgame").mockResolvedValue(342942);
    vi.spyOn(api, "lookupBoardgameLocalById").mockResolvedValue({ status: "not_found" });
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggById").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /surprise me/i }));

    // Shareable and back-button-able, exactly like a top-10 click (#99, #120).
    await waitFor(() => expect(locationSearch()).toBe("?bgg_id=342942"));
  });

  it("offers this year's Spiel-des-Jahres results as entry points and resolves a winner click by bgg_id (#105)", async () => {
    vi.spyOn(api, "topBoardgames").mockResolvedValue([
      { bggId: 13, name: "Catan", yearPublished: 1995, rank: 566, rating: 7.1, numRatings: 143738 },
    ]);
    // The award panel reads its own source (sdj_awards), not the ranks dump.
    vi.spyOn(api, "boardgameAwards").mockResolvedValue(AWARDS_2026);
    vi.spyOn(api, "lookupBoardgameLocalById").mockResolvedValue({ status: "not_found" });
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggById").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage();

    // Winner is a real button labelled by the German award title a visitor
    // recognises, not the BGG primary name the dump stores. All three award
    // categories show for the year.
    const dito = await screen.findByRole("button", { name: /DITO!/ });
    expect(screen.getByText("Kennerspiel des Jahres 2026")).toBeInTheDocument();
    expect(screen.getByText("Kinderspiel des Jahres 2026")).toBeInTheDocument();

    // Nominees and the recommendation list show as clickable buttons.
    expect(screen.getByRole("button", { name: "Cozy Stickerville" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wilmot's Warehouse" })).toBeInTheDocument();

    fireEvent.click(dito);

    // Shareable/back-button-able, exactly like a top-10 click (#99, #105).
    await waitFor(() => expect(locationSearch()).toBe("?bgg_id=400495"));
  });

  it("resolves a nominee with a seeded id directly by bgg_id (#105)", async () => {
    vi.spyOn(api, "boardgameAwards").mockResolvedValue(AWARDS_2026);
    vi.spyOn(api, "lookupBoardgameLocalById").mockResolvedValue({ status: "not_found" });
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggById").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage();

    // Cozy Stickerville has a bgg_id in the fixture, so a click resolves it
    // directly instead of running a name search.
    fireEvent.click(await screen.findByRole("button", { name: "Cozy Stickerville" }));

    await waitFor(() => expect(locationSearch()).toBe("?bgg_id=456440"));
  });

  it("runs a name search for an id-less nominee or recommendation (#105)", async () => {
    vi.spyOn(api, "boardgameAwards").mockResolvedValue(AWARDS_2026);
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "not_found",
      query: "Wilmot's Warehouse",
      suggestions: [],
    });

    renderPage();

    // Wilmot's Warehouse has no seeded id, so a click drops into the ?q= search
    // path, the same as typing the title.
    fireEvent.click(await screen.findByRole("button", { name: "Wilmot's Warehouse" }));

    await waitFor(() => expect(new URLSearchParams(locationSearch() ?? "").get("q")).toBe("Wilmot's Warehouse"));
  });

  it("hides the award panel when no awards are seeded (#105)", async () => {
    vi.spyOn(api, "topBoardgames").mockResolvedValue([]);
    vi.spyOn(api, "boardgameAwards").mockResolvedValue({ year: null, categories: [] });

    renderPage();

    await waitFor(() => expect(screen.getByRole("button", { name: /^search$/i })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /DITO!/ })).not.toBeInTheDocument();
  });

  it("hides Surprise me when the ranks dump is empty (#120)", async () => {
    vi.spyOn(api, "topBoardgames").mockResolvedValue([]);
    const random = vi.spyOn(api, "randomBoardgame");

    renderPage();

    // Let the mount fetch settle, then the button must still be absent - a
    // button that goes nowhere is worse than no button.
    await waitFor(() => expect(screen.getByRole("button", { name: /^search$/i })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /surprise me/i })).not.toBeInTheDocument();
    expect(random).not.toHaveBeenCalled();
  });

  it("writes bgg_id to the URL when a candidate is picked", async () => {
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({
      status: "disambiguation",
      candidates: [{ bggId: 13, name: "Catan", yearPublished: 1995 }],
    });
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggById").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage("/boardgames?q=catan");

    fireEvent.click(await screen.findByRole("button", { name: /Catan \(1995\)/ }));

    await waitFor(() => expect(locationSearch()).toBe("?bgg_id=13"));
  });

  it("does not touch the URL while the typeahead runs", async () => {
    vi.spyOn(api, "suggestBoardgames").mockResolvedValue([
      { bggId: 13, name: "Catan", yearPublished: 1995 },
    ]);

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cat" } });

    expect(await screen.findByRole("option", { name: /Catan/ })).toBeInTheDocument();
    expect(locationSearch()).toBe("");
  });

  it("copies a bgg_id link for the resolved game and confirms it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage("/boardgames?q=catan");

    fireEvent.click(await screen.findByRole("button", { name: /copy a link to this game/i }));

    // The shared link names the game, not the ambiguous search term.
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("bgg_id=13")));
    expect(await screen.findByRole("button", { name: /link copied/i })).toBeInTheDocument();
    // Announced through the page's existing status region, not a new one.
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/link copied/i));
    vi.unstubAllGlobals();
  });

  it("shows the link to copy by hand when the clipboard refuses", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("nope")) },
    });
    // jsdom has no execCommand at all - the same as an old browser refusing.
    mockEmptyExternalSources();
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });

    renderPage("/boardgames?q=catan");

    fireEvent.click(await screen.findByRole("button", { name: /copy a link to this game/i }));

    expect(await screen.findByText(/bgg_id=13/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
