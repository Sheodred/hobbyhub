import { describe, expect, it, vi, beforeEach } from "vitest";
import { lookupBoardgame, suggestBoardgames } from "./api";

describe("lookupBoardgame", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("requests the lookup endpoint with the query param and returns the parsed body", async () => {
    const body = { status: "ok", game: { bggId: 13, name: "Catan" } };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    });

    const result = await lookupBoardgame("catan");

    expect(fetch).toHaveBeenCalledWith("/api/boardgames/lookup?q=catan", expect.anything());
    expect(result).toEqual(body);
  });
});

describe("suggestBoardgames", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("requests the suggest endpoint with the query param and returns just the suggestions", async () => {
    const body = { suggestions: [{ bggId: 13, name: "Catan", yearPublished: 1995 }] };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    });

    const result = await suggestBoardgames("cat");

    expect(fetch).toHaveBeenCalledWith("/api/boardgames/suggest?q=cat", expect.anything());
    expect(result).toEqual(body.suggestions);
  });
});
