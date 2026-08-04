import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TermsPage } from "./TermsPage";

describe("TermsPage", () => {
  it("renders the heading and clarifies there is no online shop", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { name: "Terms of Service", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2. No online shop" })).toBeInTheDocument();
    expect(screen.getByText(/no checkout/i)).toBeInTheDocument();
  });
});
