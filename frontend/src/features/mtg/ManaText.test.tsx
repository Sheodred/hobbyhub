import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ManaText } from "./ManaText";

describe("ManaText", () => {
  it("renders each mana token as a Scryfall symbol image", () => {
    render(<ManaText text="Sacrifice a creature: Add {C}{C}." />);

    const symbols = screen.getAllByAltText("{C}");
    expect(symbols).toHaveLength(2);
    expect(symbols[0]).toHaveAttribute("src", "https://svgs.scryfall.io/card-symbols/C.svg");
    expect(screen.getByText(/Sacrifice a creature: Add/)).toBeInTheDocument();
  });

  it("collapses hybrid and tap symbols to their Scryfall filenames", () => {
    render(<ManaText text="{2}{W/U}{T}" />);

    expect(screen.getByAltText("{W/U}")).toHaveAttribute("src", "https://svgs.scryfall.io/card-symbols/WU.svg");
    expect(screen.getByAltText("{T}")).toHaveAttribute("src", "https://svgs.scryfall.io/card-symbols/T.svg");
    expect(screen.getByAltText("{2}")).toHaveAttribute("src", "https://svgs.scryfall.io/card-symbols/2.svg");
  });
});
