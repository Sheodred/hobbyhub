import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { Hero } from "./Hero";

describe("Hero", () => {
  it("links to all three things the site actually does", () => {
    render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Browse cards" })).toHaveAttribute("href", "/mtg");
    expect(screen.getByRole("link", { name: "Play chess" })).toHaveAttribute("href", "/chess");
    expect(screen.getByRole("link", { name: "Look up a board game" })).toHaveAttribute("href", "/boardgames");
  });
});
