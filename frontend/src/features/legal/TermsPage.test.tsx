import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TermsPage } from "./TermsPage";

describe("TermsPage", () => {
  it("renders the heading and the third-party MTG data section", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { name: "Terms of Service", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /third-party data/i })).toBeInTheDocument();
    expect(screen.getByText(/unofficial fan content/i)).toBeInTheDocument();
  });
});
