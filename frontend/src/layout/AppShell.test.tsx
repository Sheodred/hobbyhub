import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppShell } from "./AppShell";

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<h1>Page content</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  // WCAG 2.4.1. Before this existed, a keyboard user tabbed through the header
  // and the hero's three decorative hotspots before reaching any content (#51).
  it("offers a skip link as the very first focusable element", () => {
    renderShell();

    const focusable = document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    expect(focusable[0]).toHaveTextContent("Skip to main content");
    expect(focusable[0]).toHaveAttribute("href", "#main-content");
  });

  it("points the skip link at a main landmark that can actually receive focus", () => {
    renderShell();

    const main = screen.getByRole("main");

    // Same id the link targets, or the jump silently does nothing.
    expect(main).toHaveAttribute("id", "main-content");
    // Without a tabindex the browser scrolls but never moves focus, so a
    // screen reader keeps reading from the header.
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("keeps the skip link visually hidden until it is focused", () => {
    renderShell();

    const link = screen.getByRole("link", { name: "Skip to main content" });

    expect(link.className).toContain("sr-only");
    expect(link.className).toContain("focus:not-sr-only");
  });
});
