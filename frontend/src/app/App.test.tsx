import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { App } from "./App";

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
  it("renders the app shell with the HobbyHub logo and primary nav", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: "HobbyHub" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
  });

  it("renders the home page content at /", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });

  it("renders the MTG page content at /mtg", () => {
    renderAt("/mtg");
    expect(screen.getByRole("heading", { name: "Magic: The Gathering" })).toBeInTheDocument();
  });
});
