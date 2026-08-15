import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BoardgameLookupPage } from "./BoardgameLookupPage";
import * as api from "./api";

describe("BoardgameLookupPage", () => {
  it("shows the game's rating, good/bad snippet, and BGG source credit after a search", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13,
        name: "Catan",
        description: "Trade, build, settle.",
        rating: 7.2,
        numRatings: 1000,
        good: "Great trading game.",
        bad: "Too much luck.",
        partial: false,
        amazon: null,
        bgq: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "catan" } });
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

  it("shows a disambiguation list and resolves the picked candidate", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "disambiguation",
      candidates: [
        { bggId: 13, name: "Catan", yearPublished: 1995 },
        { bggId: 1234, name: "Catan: Cities and Knights", yearPublished: 1998 },
      ],
    });
    vi.spyOn(api, "lookupBoardgameById").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13,
        name: "Catan",
        description: "Trade, build, settle.",
        rating: 7.2,
        numRatings: 1000,
        good: null,
        bad: null,
        partial: false,
        amazon: null,
        bgq: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    const option = await screen.findByRole("button", { name: /Catan \(1995\)/ });
    fireEvent.click(option);

    await waitFor(() => expect(api.lookupBoardgameById).toHaveBeenCalledWith(13));
    expect(await screen.findByText("Trade, build, settle.")).toBeInTheDocument();
  });

  it("says so plainly when only the ranks-dump data is available", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
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
        amazon: { rating: 4.7, count: 257, title: "KOSMOS Catan - Das Spiel", url: "https://www.amazon.de/dp/B00CATAN01" },
        bgq: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText(/Only the community rating is available/)).toBeInTheDocument();
    expect(screen.getByText("7.1")).toBeInTheDocument();
  });

  it("shows the Amazon rating and what product it matched", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13, name: "Catan", description: "Trade, build, settle.",
        rating: 7.2, numRatings: 1000, good: null, bad: null, partial: false,
        amazon: { rating: 4.7, count: 257, title: "KOSMOS Catan - Das Spiel", url: "https://www.amazon.de/dp/B00CATAN01" },
        bgq: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText("4.7")).toBeInTheDocument();
    expect(screen.getByText(/257 ratings/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "KOSMOS Catan - Das Spiel" })).toHaveAttribute(
      "href", "https://www.amazon.de/dp/B00CATAN01"
    );
  });

  it("shows Board Game Quest's score and how the game plays", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 331106, name: "Intarsia", description: "", rating: 7.2, numRatings: 900,
        good: "Beautiful production", bad: "Lacking replay value", partial: true, amazon: null,
        bgq: {
          score: 3.5,
          rules: "Players start with a random hand of ten cards in four colors plus wilds.",
          hits: ["Beautiful production"], misses: ["Lacking replay value"],
          title: "Intarsia Review", url: "https://www.boardgamequest.com/intarsia-review/",
        },
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/331106" },
      },
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "intarsia" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText("3.5")).toBeInTheDocument();
    expect(screen.getByText(/random hand of ten cards/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /full review at Board Game Quest/ })).toHaveAttribute(
      "href", "https://www.boardgamequest.com/intarsia-review/"
    );
  });
});
