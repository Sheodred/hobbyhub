import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, ApiError, getAccessToken, setAccessToken } from "./apiClient";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("apiFetch", () => {
  beforeEach(() => {
    setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it("attaches the in-memory access token as a Bearer header when present", async () => {
    setAccessToken("token-abc");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/whatever");

    const [, options] = fetchMock.mock.calls[0];
    expect((options.headers as Headers).get("Authorization")).toBe("Bearer token-abc");
  });

  it("always sends credentials: include, even with no access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/whatever");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.credentials).toBe("include");
  });

  it("on a 401, refreshes once and retries the original request with the new token", async () => {
    const fetchMock = vi
      .fn()
      // 1. original request fails
      .mockResolvedValueOnce(jsonResponse(401, { message: "expired" }))
      // 2. refresh call succeeds
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: "new-token", user: {} }))
      // 3. retried original request succeeds
      .mockResolvedValueOnce(jsonResponse(200, { data: "success" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ data: string }>("/api/protected");

    expect(result).toEqual({ data: "success" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/refresh");
    expect(getAccessToken()).toBe("new-token");

    // The retried call must carry the freshly refreshed token, not the old (missing) one.
    const retriedOptions = fetchMock.mock.calls[2][1];
    expect((retriedOptions.headers as Headers).get("Authorization")).toBe("Bearer new-token");
  });

  it("does not retry forever if refresh itself fails - propagates the original error once", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: "expired" }))
      .mockResolvedValueOnce(jsonResponse(401, { message: "refresh also invalid" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/api/protected")).rejects.toBeInstanceOf(ApiError);
    // original request + one refresh attempt - no infinite loop, no third call.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getAccessToken()).toBeNull();
  });

  it("throws ApiError with the server's message and field errors on failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { message: "Validation failed", fieldErrors: { email: "must not be blank" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/api/auth/signup")).rejects.toMatchObject({
      status: 400,
      message: "Validation failed",
      fieldErrors: { email: "must not be blank" },
    });
  });
});
