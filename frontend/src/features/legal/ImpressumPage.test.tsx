import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ImpressumPage } from "./ImpressumPage";

describe("ImpressumPage", () => {
  it("renders the heading and the required TMG sections", () => {
    render(<ImpressumPage />);

    expect(screen.getByRole("heading", { name: "Impressum", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Service provider" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /responsible for content/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /odr/i })).toHaveAttribute("href", "https://ec.europa.eu/consumers/odr/");
  });

  it("makes the contact email a clickable mailto: link (#155)", () => {
    render(<ImpressumPage />);

    expect(screen.getByRole("link", { name: "kluge@sheoforge.de" })).toHaveAttribute(
      "href",
      "mailto:kluge@sheoforge.de"
    );
  });
});
