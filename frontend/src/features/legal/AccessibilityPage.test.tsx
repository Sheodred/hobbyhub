import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccessibilityPage } from "./AccessibilityPage";

describe("AccessibilityPage", () => {
  it("names the known limitations and a way to report a barrier", () => {
    render(<AccessibilityPage />);

    expect(screen.getByRole("heading", { name: "Accessibility", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Known limitations" })).toBeInTheDocument();
    expect(screen.getByText(/kluge@sheoforge\.de/)).toBeInTheDocument();
  });

  // Over-claiming conformance is its own legal risk, and naming a
  // Durchsetzungsstelle or Schlichtungsstelle promises a procedure that is
  // only available against public bodies - neither belongs on this page.
  it("claims partial conformance only, and no public-body procedure", () => {
    const { container } = render(<AccessibilityPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("Partially conformant");
    expect(text).not.toMatch(/fully (accessible|conformant)/i);
    expect(text).not.toMatch(/Durchsetzungsstelle|Schlichtungsstelle/i);
  });
});
