import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CookieConsent } from "./CookieConsent";

describe("CookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("shows the banner when no choice has been stored yet", () => {
    render(<CookieConsent />);
    expect(screen.getByRole("dialog", { name: /cookie preferences/i })).toBeInTheDocument();
  });

  it("stores the choice and hides itself when accepted", async () => {
    const user = userEvent.setup();
    render(<CookieConsent />);

    await user.click(screen.getByRole("button", { name: /accept/i }));

    expect(localStorage.getItem("hobbyhub-cookie-consent")).toBe("accepted");
    expect(screen.queryByRole("dialog", { name: /cookie preferences/i })).not.toBeInTheDocument();
  });

  it("does not render again once a choice was already stored", () => {
    localStorage.setItem("hobbyhub-cookie-consent", "declined");
    render(<CookieConsent />);
    expect(screen.queryByRole("dialog", { name: /cookie preferences/i })).not.toBeInTheDocument();
  });
});
