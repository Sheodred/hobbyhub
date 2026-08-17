import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { Hero } from "./Hero";

describe("Hero", () => {
  it("offers the card browser and the boardgame lookup as calls to action", () => {
    render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );

    // Board games lead: the lookup is the newest and most worked-on feature,
    // so it takes the filled button. "Look up MTG cards" rather than "Browse
    // cards" because a bare "cards" says nothing about which game.
    expect(screen.getByRole("link", { name: "Look up a board game" })).toHaveAttribute("href", "/boardgames");
    expect(screen.getByRole("link", { name: "Look up MTG cards" })).toHaveAttribute("href", "/mtg");
    // Chess has its own highlight card below the hero; a button here as well
    // was the same link twice on one screen.
    expect(screen.queryByRole("link", { name: "Play chess" })).not.toBeInTheDocument();
  });

  it("still reaches chess through the hotspot on the artwork", () => {
    render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Chess pieces in the hero scene" })).toHaveAttribute("href", "/chess");
  });
});
