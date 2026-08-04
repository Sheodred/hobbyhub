import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { App } from "./App";

beforeEach(() => {
  // AuthProvider fires a real fetch("/api/auth/refresh") on mount to check
  // for an existing session - mock it as "logged out" so tests don't hit a
  // real network call jsdom can't resolve anyway.
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "No refresh token cookie present" }),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("App routing", () => {
  it("renders the app shell with the HobbyHub logo", async () => {
    renderAt("/");
    // AuthProvider's mount-time session check resolves asynchronously -
    // await it settling so React doesn't warn about an unwrapped act().
    expect(await screen.findByRole("link", { name: "HobbyHub" })).toBeInTheDocument();
  });

  it("opening the mobile nav reveals the primary links", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await screen.findByRole("link", { name: "HobbyHub" });

    await user.click(screen.getByRole("button", { name: /open navigation menu/i }));

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Marketplace" })).toBeInTheDocument();
  });

  it("renders the home page content at /", async () => {
    renderAt("/");
    expect(
      await screen.findByRole("heading", { name: /things I actually enjoy/i }),
    ).toBeInTheDocument();
  });

  it("renders the MTG page content at /mtg", async () => {
    renderAt("/mtg");
    expect(await screen.findByRole("heading", { name: "Magic: The Gathering" })).toBeInTheDocument();
  });
});
