import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { FaqPage } from "./FaqPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <FaqPage />
    </MemoryRouter>,
  );
}

describe("FaqPage", () => {
  // #138 item 7 asked for five; fewer would quietly miss the point of the
  // audit item, and the count is the only part of it a test can hold.
  it("answers five questions", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "FAQ", level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
  });

  // These answers restate the Privacy Policy and Terms in plainer words, so
  // each one has to point at the page carrying the binding version - a FAQ
  // that quietly becomes the only statement of a privacy claim is the failure
  // mode worth testing against.
  it("links its data and attribution answers to the pages that carry the full versions", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/legal/privacy");
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/legal/terms");
    expect(screen.getByRole("link", { name: "Impressum" })).toHaveAttribute("href", "/legal/impressum");
  });
});
