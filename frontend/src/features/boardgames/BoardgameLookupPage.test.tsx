import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BoardgameLookupPage } from "./BoardgameLookupPage";
import * as api from "./api";
import type { Boardgame } from "./api";

describe("BoardgameLookupPage", () => {
  // The example is the site's one worked example, so it is pinned: it has to
  // resolve to a single game, not a disambiguation list (#100).
  it("uses a modern hobby game as the search example", () => {
    render(<BoardgameLookupPage />);
    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "Search for a board game, e.g. Frosthaven");
  });

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
        ratings: [],
        bgq: null,
        players: null,
        duration: null,
        age: null,
        complexity: null,
        isExpansion: false,
        rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
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
        ratings: [],
        bgq: null,
        players: null,
        duration: null,
        age: null,
        complexity: null,
        isExpansion: false,
        rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
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
        ratings: [
          { source: "Amazon.de", value: 4.7, max: 5, count: 257, title: "KOSMOS Catan - Das Spiel", url: "https://www.amazon.de/dp/B00CATAN01" },
          { source: "H@LL9000", value: 4.8, max: 6, count: 17, title: null, url: "https://www.hall9000.de/html/spiel/catan" },
        ],
        bgq: null,
        players: "2 - 4",
        duration: "30 - 45 Minuten",
        age: null,
        complexity: null,
        isExpansion: false,
        rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText(/Only the community rating is available/)).toBeInTheDocument();
    expect(screen.getByText("7.1")).toBeInTheDocument();
  });

  it("shows every external rating with its own scale", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13, name: "Catan", description: "Trade, build, settle.",
        rating: 7.2, numRatings: 1000, good: null, bad: null, partial: false,
        ratings: [
          { source: "Amazon.de", value: 4.7, max: 5, count: 257, title: "KOSMOS Catan - Das Spiel", url: "https://www.amazon.de/dp/B00CATAN01" },
          { source: "H@LL9000", value: 4.8, max: 6, count: 17, title: null, url: "https://www.hall9000.de/html/spiel/catan" },
        ],
        bgq: null,
        players: "2 - 4",
        duration: "30 - 45 Minuten",
        age: null,
        complexity: null,
        isExpansion: false,
        rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
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
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 926, name: "Catan: Cities & Knights", description: "More Catan.",
        rating: 7.4, numRatings: 40000, good: null, bad: null, partial: false,
        ratings: [], bgq: null,
        players: "3 - 4",
        duration: "90 Minuten",
        age: "ab 12 Jahren",
        complexity: { value: 12, max: 20, url: "https://www.brettspiele-report.de/catan-staedte-und-ritter/" },
        isExpansion: true,
        rank: 401,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/926" },
      },
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cities and knights" } });
    fireEvent.submit(screen.getByRole("search"));

    // One chip per fact, not one dot-separated line.
    expect(await screen.findByText("3 - 4 players")).toBeInTheDocument();
    expect(screen.getByText("90 Minuten")).toBeInTheDocument();
    expect(screen.getByText("ab 12 Jahren")).toBeInTheDocument();
    expect(screen.getByText("BGG rank #401")).toBeInTheDocument();
    expect(screen.getByText("Expansion")).toBeInTheDocument();
    // The scale travels with the number, and the link says whose number it is.
    expect(screen.getByRole("link", { name: /Komplexität 12 \/ 20/ })).toHaveAttribute(
      "href", "https://www.brettspiele-report.de/catan-staedte-und-ritter/"
    );
  });

  it("leaves out facts no source published, rather than showing empty labels", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13, name: "Catan", description: "Trade, build, settle.",
        rating: 7.2, numRatings: 1000, good: null, bad: null, partial: false,
        ratings: [], bgq: null,
        players: "3 - 4", duration: null, age: null, complexity: null, isExpansion: false, rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByText("3 - 4 players")).toBeInTheDocument();
    expect(screen.queryByText("Expansion")).not.toBeInTheDocument();
    expect(screen.queryByText(/Komplexität/)).not.toBeInTheDocument();
    // An unranked game says nothing, rather than "BGG rank #0".
    expect(screen.queryByText(/BGG rank/)).not.toBeInTheDocument();
  });

  it("shows Board Game Quest's score and how the game plays", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 331106, name: "Intarsia", description: "", rating: 7.2, numRatings: 900,
        good: "Beautiful production", bad: "Lacking replay value", partial: true, players: "2 - 4", duration: "30 - 45 Minuten",
        age: null, complexity: null, isExpansion: false, rank: null,
        ratings: [
          { source: "Board Game Quest", value: 3.5, max: 5, count: null, title: "Intarsia Review", url: "https://www.boardgamequest.com/intarsia-review/" },
          { source: "brettspiele-report", value: 15, max: 20, count: null, title: "Intarsia", url: "https://www.brettspiele-report.de/intarsia/" },
        ],
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
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13, name: "Catan", description: "Trade, build, settle.",
        rating: 7.2, numRatings: 1000, good: null, bad: null, partial: false,
        ratings: [], bgq: null, players: null, duration: null, age: null,
        complexity: null, isExpansion: false, rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);

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
    vi.spyOn(api, "lookupBoardgameById").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13, name: "Catan", description: "Trade, build, settle.",
        rating: 7.2, numRatings: 1000, good: null, bad: null, partial: false,
        ratings: [], bgq: null, players: null, duration: null, age: null,
        complexity: null, isExpansion: false, rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "cat" } });

    await waitFor(() => expect(api.suggestBoardgames).toHaveBeenCalledWith("cat"));
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);
    expect(input).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(options[0]);

    await waitFor(() => expect(api.lookupBoardgameById).toHaveBeenCalledWith(13));
    expect(await screen.findByText("Trade, build, settle.")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("does not fetch suggestions below the minimum query length", async () => {
    vi.spyOn(api, "suggestBoardgames").mockResolvedValue([]);

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "c" } });

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(api.suggestBoardgames).not.toHaveBeenCalled();
  });

  it("supports arrow-key navigation and Enter to pick a suggestion", async () => {
    vi.spyOn(api, "suggestBoardgames").mockResolvedValue([
      { bggId: 13, name: "Catan", yearPublished: 1995 },
      { bggId: 926, name: "Catan: Cities & Knights", yearPublished: 1998 },
    ]);
    vi.spyOn(api, "lookupBoardgameById").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 926, name: "Catan: Cities & Knights", description: "More Catan.",
        rating: 7.4, numRatings: 40000, good: null, bad: null, partial: false,
        ratings: [], bgq: null, players: null, duration: null, age: null,
        complexity: null, isExpansion: true, rank: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/926" },
      },
    });

    render(<BoardgameLookupPage />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "cat" } });
    await screen.findAllByRole("option");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "boardgame-suggestion-926");

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(api.lookupBoardgameById).toHaveBeenCalledWith(926));
    expect(await screen.findByText("More Catan.")).toBeInTheDocument();
  });

  it("closes the suggestion list on Escape without clearing the typed text", async () => {
    vi.spyOn(api, "suggestBoardgames").mockResolvedValue([{ bggId: 13, name: "Catan", yearPublished: 1995 }]);

    render(<BoardgameLookupPage />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "cat" } });
    await screen.findAllByRole("option");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(input).toHaveValue("cat");
  });

  it("degrades silently when the suggest endpoint errors", async () => {
    vi.spyOn(api, "suggestBoardgames").mockRejectedValue(new Error("network error"));

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cat" } });

    await waitFor(() => expect(api.suggestBoardgames).toHaveBeenCalled());
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
  it("offers close names instead of an error when nothing matches (#92)", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "not_found",
      query: "teasd",
      suggestions: [
        { bggId: 13, name: "Catan", yearPublished: 1995 },
        { bggId: 266192, name: "Wingspan", yearPublished: 2019 },
      ],
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "teasd" } });
    fireEvent.submit(screen.getByRole("search"));

    // The old behaviour surfaced a 502 as "Something went wrong looking up
    // that board game" - a server fault for what is really "no such game".
    await waitFor(() => expect(screen.getByText(/did you mean/i)).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Catan/ })).toBeInTheDocument();
  });

  it("says 'no exact match' once, in the status region only (#107)", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "not_found",
      query: "teasd",
      suggestions: [{ bggId: 13, name: "Catan", yearPublished: 1995 }],
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "teasd" } });
    fireEvent.submit(screen.getByRole("search"));

    // The status region is visible, so a second paragraph repeating it renders
    // the same sentence twice, stacked.
    await waitFor(() => expect(screen.getByText(/did you mean/i)).toBeInTheDocument());
    expect(screen.getAllByText(/no exact match/i)).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(/no exact match for “teasd”\. 1 similar name suggested\./i);
  });

  it("says so plainly when nothing matches and there is nothing to suggest", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "not_found",
      query: "zzzzqqqq",
      suggestions: [],
    });

    render(<BoardgameLookupPage />);
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
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "not_found",
      query: "ctaan",
      suggestions: [{ bggId: 13, name: "Catan", yearPublished: 1995 }],
    });
    const byId = vi.spyOn(api, "lookupBoardgameById").mockResolvedValue({
      status: "disambiguation",
      candidates: [],
    });

    render(<BoardgameLookupPage />);
    const box = screen.getByRole("combobox");
    fireEvent.change(box, { target: { value: "ctaan" } });
    fireEvent.submit(screen.getByRole("search"));

    fireEvent.click(await screen.findByRole("button", { name: /Catan/ }));

    await waitFor(() => expect(byId).toHaveBeenCalledWith(13));
    // Leaving the typo in the box desyncs what the user sees from what they
    // got back - the same bug pick() had for disambiguation candidates.
    expect(box).toHaveValue("Catan");
  });

  it("does not reopen the typeahead over the result after taking a suggestion", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "not_found",
      query: "ctaan",
      suggestions: [{ bggId: 13, name: "Catan", yearPublished: 1995 }],
    });
    vi.spyOn(api, "lookupBoardgameById").mockResolvedValue({ status: "disambiguation", candidates: [] });

    render(<BoardgameLookupPage />);
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
        isExpansion: false,
        rank: 566,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    // The slow half never settles during this test, so anything asserted
    // below is necessarily coming from the instant path.
    vi.spyOn(api, "lookupBoardgame").mockReturnValue(new Promise(() => {}));

    render(<BoardgameLookupPage />);
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
        duration: null, age: null, complexity: null, isExpansion: false, rank: 566,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13, name: "Catan", description: "Trade, build, settle.", rating: 7.2,
        numRatings: 1000, good: "Great trading game.", bad: "Too much luck.",
        partial: false, ratings: [], bgq: null, players: "3-4", duration: null,
        age: null, complexity: null, isExpansion: false, rank: 566,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
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
        duration: null, age: null, complexity: null, isExpansion: false, rank: 566,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });
    vi.spyOn(api, "lookupBoardgame").mockRejectedValue(new Error("upstream down"));

    render(<BoardgameLookupPage />);
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
    vi.spyOn(api, "lookupBoardgame").mockReturnValue(new Promise(() => {}));

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByText("Catan")).toBeInTheDocument());
    expect(screen.getByText("7.1")).toBeInTheDocument();
  });
});
