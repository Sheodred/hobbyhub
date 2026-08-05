import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch, ApiError } from "./apiClient";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed JSON body on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { data: "success" })));

    const result = await apiFetch<{ data: string }>("/api/mtg/search");

    expect(result).toEqual({ data: "success" });
  });

  it("returns undefined for a 204 No Content response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(204, null)));

    expect(await apiFetch("/api/whatever")).toBeUndefined();
  });

  it("throws ApiError with the server's message and field errors on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(400, { message: "Validation failed", fieldErrors: { q: "must not be blank" } }),
      ),
    );

    await expect(apiFetch("/api/mtg/search")).rejects.toMatchObject({
      status: 400,
      message: "Validation failed",
      fieldErrors: { q: "must not be blank" },
    });
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );

    await expect(apiFetch("/api/mtg/search")).rejects.toMatchObject({
      status: 500,
      message: "Request failed",
    });
    await expect(apiFetch("/api/mtg/search")).rejects.toBeInstanceOf(ApiError);
  });
});
