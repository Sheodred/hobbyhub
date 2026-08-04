import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { AuthProvider } from "../auth/AuthContext";
import { HomePage } from "./HomePage";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { message: "no session" })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("links all three highlight cards to their pages", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <HomePage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: /Magic: The Gathering/ })).toHaveAttribute("href", "/mtg");
    expect(screen.getByRole("link", { name: /Marketplace/ })).toHaveAttribute("href", "/marketplace");
    expect(screen.getByRole("link", { name: /Chess vs\. AI/ })).toHaveAttribute("href", "/chess");
  });
});
