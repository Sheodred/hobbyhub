import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardHoverPreview } from "./CardHoverPreview";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderPreview() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CardHoverPreview name="Sol Ring">
        <span>Sol Ring</span>
      </CardHoverPreview>
    </QueryClientProvider>,
  );
}

describe("CardHoverPreview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not fetch or show a preview before it's hovered", () => {
    vi.stubGlobal("fetch", vi.fn());

    renderPreview();

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows the Scryfall image once hovered", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          id: "sol-ring-id",
          name: "Sol Ring",
          imageUrl: "https://img/sol-ring.jpg",
          manaCost: null,
          typeLine: null,
          oracleText: null,
          colors: null,
          setName: null,
          rarity: null,
          artCropUrl: null,
        }),
      ),
    );

    renderPreview();
    await user.hover(screen.getByText("Sol Ring"));

    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://img/sol-ring.jpg");
  });
});
