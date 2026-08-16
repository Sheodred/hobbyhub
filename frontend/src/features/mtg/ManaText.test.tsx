import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ManaText } from "./ManaText";

describe("ManaText", () => {
  it("renders each mana token as a Scryfall symbol image", () => {
    render(<ManaText text="Sacrifice a creature: Add {C}{C}." />);

    const symbols = screen.getAllByAltText("colorless mana");
    expect(symbols).toHaveLength(2);
    expect(symbols[0]).toHaveAttribute("src", "https://svgs.scryfall.io/card-symbols/C.svg");
    expect(screen.getByText(/Sacrifice a creature: Add/)).toBeInTheDocument();
  });

  it("collapses hybrid and tap symbols to their Scryfall filenames", () => {
    render(<ManaText text="{2}{W/U}{T}" />);

    expect(screen.getByAltText("white or blue mana")).toHaveAttribute("src", "https://svgs.scryfall.io/card-symbols/WU.svg");
    expect(screen.getByAltText("tap")).toHaveAttribute("src", "https://svgs.scryfall.io/card-symbols/T.svg");
    expect(screen.getByAltText("2 generic mana")).toHaveAttribute("src", "https://svgs.scryfall.io/card-symbols/2.svg");
  });

  // The symbol is an image, so its alt text is the only thing a screen reader
  // gets - and rules text is mostly symbols. Passing the raw token through
  // made it read "open brace U close brace" (#51).
  it("describes every symbol in words rather than passing the raw token through", () => {
    render(<ManaText text="{W}{U}{B}{R}{G}{X}{Q}{E}{S}{2/W}{W/P}" />);

    const spoken = screen.getAllByRole("img").map((img) => img.getAttribute("alt"));

    expect(spoken).toEqual([
      "white mana",
      "blue mana",
      "black mana",
      "red mana",
      "green mana",
      "X mana",
      "untap",
      "energy counter",
      "snow mana",
      "2 generic or white mana",
      "white Phyrexian mana",
    ]);
    expect(spoken.some((alt) => alt?.includes("{"))).toBe(false);
  });

  // An unrecognised token must still say something, not render an empty alt
  // that a screen reader skips silently.
  it("falls back to the bare token text for symbols it does not know", () => {
    render(<ManaText text="{HW}" />);

    expect(screen.getByRole("img")).toHaveAttribute("alt", "HW mana");
  });
});
