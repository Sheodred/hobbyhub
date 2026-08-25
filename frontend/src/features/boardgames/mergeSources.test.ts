import { describe, expect, it } from "vitest";
import { initialSources, mergeSources, type Sources } from "./mergeSources";
import type { Boardgame } from "./api";

const LOCAL: Boardgame = {
  bggId: 13,
  name: "Catan",
  description: "",
  rating: 7.1,
  numRatings: 100,
  good: null,
  bad: null,
  partial: true,
  ratings: [],
  bgq: null,
  players: null,
  duration: null,
  age: null,
  complexity: null,
  prices: [],
  isExpansion: false,
  rank: 566,
  source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
};

function bggDone(overrides: Partial<import("./api").BggCoreResult> = {}) {
  return {
    status: "done" as const,
    value: {
      bggId: 13,
      name: "Catan",
      description: "Trade, build, settle.",
      rating: 7.1,
      numRatings: 100,
      good: null,
      bad: null,
      partial: false,
      players: "3 - 4",
      duration: "75",
      age: 10,
      complexity: null,
      isExpansion: false,
      rank: 566,
      source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      ...overrides,
    },
  };
}

describe("mergeSources", () => {
  it("returns the local answer unchanged while every source is still pending", () => {
    const result = mergeSources(LOCAL, initialSources(), "en");
    expect(result).toEqual(LOCAL);
  });

  it("labels BGG's facts in English or German depending on lang, once bgg resolves", () => {
    const sources: Sources = { ...initialSources(), bgg: bggDone() };

    expect(mergeSources(LOCAL, sources, "en").duration).toBe("75 minutes");
    expect(mergeSources(LOCAL, sources, "de").duration).toBe("75 Minuten");
    expect(mergeSources(LOCAL, sources, "en").age).toBe("ages 10+");
    expect(mergeSources(LOCAL, sources, "de").age).toBe("ab 10 Jahren");
    expect(mergeSources(LOCAL, sources, "en").players).toBe("3 - 4 players");
  });

  it("fills only the individual facts field bgg is missing from hall9000, never a field bgg already has", () => {
    const sources: Sources = {
      ...initialSources(),
      bgg: bggDone({ duration: null }), // bgg has no duration for this game
      hall9000: {
        status: "done",
        value: { rating: null, players: "5 - 6", duration: "90", age: 12 },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.duration).toBe("90 minutes"); // filled in from hall9000
    expect(result.players).toBe("3 - 4 players"); // bgg's own, hall9000's ignored
    expect(result.age).toBe("ages 10+"); // bgg's own, hall9000's ignored
  });

  it("uses board game quest's hits/misses as a good/bad fallback only once bgg has resolved with none of its own", () => {
    const sources: Sources = {
      ...initialSources(),
      bgg: bggDone({ good: null, bad: null }),
      boardgamequest: {
        status: "done",
        value: {
          rating: null,
          review: { rules: "How it plays.", hits: ["fun"], misses: ["long"], title: "Catan Review", url: "https://x" },
        },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.good).toEqual(["fun"]);
    expect(result.bad).toEqual(["long"]);
  });

  it("does not apply board game quest's good/bad fallback while bgg is still pending", () => {
    const sources: Sources = {
      ...initialSources(),
      boardgamequest: {
        status: "done",
        value: {
          rating: null,
          review: { rules: "How it plays.", hits: ["fun"], misses: ["long"], title: "Catan Review", url: "https://x" },
        },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.good).toBeNull();
    expect(result.bad).toBeNull();
  });

  it("never overrides bgg's own good/bad with board game quest's, even once both have resolved", () => {
    const sources: Sources = {
      ...initialSources(),
      bgg: bggDone({ good: ["bgg good"], bad: ["bgg bad"] }),
      boardgamequest: {
        status: "done",
        value: {
          rating: null,
          review: { rules: "x", hits: ["bgq good"], misses: ["bgq bad"], title: "t", url: "u" },
        },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.good).toEqual(["bgg good"]);
    expect(result.bad).toEqual(["bgg bad"]);
  });

  it("shows board game quest's How-it-plays review regardless of bgg's state", () => {
    const sources: Sources = {
      ...initialSources(),
      boardgamequest: {
        status: "done",
        value: {
          rating: { source: "Board Game Quest", value: 4.5, max: 5, count: null, title: "t", url: "u" },
          review: { rules: "How it plays.", hits: [], misses: [], title: "t", url: "u" },
        },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.bgq).toEqual({ score: 4.5, rules: "How it plays.", hits: [], misses: [], title: "t", url: "u" });
  });

  it("collects a rating entry from every source that resolved with one, in a fixed source order", () => {
    const sources: Sources = {
      ...initialSources(),
      brettspielereport: {
        status: "done",
        value: { rating: { source: "brettspiele-report", value: 14, max: 20, count: null, title: "t", url: "u2" }, complexity: null },
      },
      amazon: {
        status: "done",
        value: { rating: { source: "Amazon.de", value: 4.8, max: 5, count: 100, title: "t", url: "u1" }, price: null },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.ratings.map((r) => r.source)).toEqual(["Amazon.de", "brettspiele-report"]);
  });

  it("collects a price entry from every source that resolved with one", () => {
    const sources: Sources = {
      ...initialSources(),
      brettspielpreise: { status: "done", value: { value: 55.17, currency: "EUR", source: "Brettspielpreise.de", url: "u1" } },
      amazon: { status: "done", value: { rating: null, price: { value: 22.9, currency: "EUR", source: "Amazon.de", url: "u2" } } },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.prices).toEqual([
      { value: 55.17, currency: "EUR", source: "Brettspielpreise.de", url: "u1" },
      { value: 22.9, currency: "EUR", source: "Amazon.de", url: "u2" },
    ]);
  });

  it("prefers brettspiele-report's complexity over bgg's own once both resolved, same as today", () => {
    const sources: Sources = {
      ...initialSources(),
      bgg: bggDone({ complexity: { value: 2.8, max: 5, source: "BoardGameGeek" } }),
      brettspielereport: {
        status: "done",
        value: { rating: null, complexity: { value: 9, max: 20, source: "brettspiele-report" } },
      },
    };

    expect(mergeSources(LOCAL, sources, "en").complexity).toEqual({ value: 9, max: 20, source: "brettspiele-report" });
  });
});
