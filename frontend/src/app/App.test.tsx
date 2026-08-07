import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { App } from "./App";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }));
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
  it("renders the app shell with the Sheodred's Forge logo", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: "Sheodred's Forge" })).toBeInTheDocument();
  });

  it("opening the mobile nav reveals the primary links", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click(screen.getByRole("button", { name: /open navigation menu/i }));

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Magic: The Gathering" })).toBeInTheDocument();
  });

  it("renders the home page content at /", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /hyperfixations/i })).toBeInTheDocument();
  });

  it("renders the MTG page content at /mtg", () => {
    renderAt("/mtg");
    expect(screen.getByRole("heading", { name: "Magic: The Gathering" })).toBeInTheDocument();
  });
});
