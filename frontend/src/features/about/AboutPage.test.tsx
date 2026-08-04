import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AboutPage } from "./AboutPage";

describe("AboutPage", () => {
  it("renders the heading and a link to the GitHub profile", () => {
    render(<AboutPage />);

    expect(screen.getByRole("heading", { name: "About Me" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute("href", "https://github.com/Sheodred");
  });
});
