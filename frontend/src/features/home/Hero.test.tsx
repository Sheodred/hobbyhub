import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { AuthProvider } from "../auth/AuthContext";
import { Hero } from "./Hero";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderHero() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Hero />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Hero", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Sign up / Log in when logged out", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { message: "no session" })));

    renderHero();

    expect(await screen.findByRole("link", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
  });

  it("shows a personalized welcome once a session is confirmed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          accessToken: "token",
          user: { id: "1", email: "a@example.com", displayName: "Alice", role: "USER" },
        }),
      ),
    );

    renderHero();

    // "Alice" is wrapped in its own <span> for styling, so it's a separate
    // text node from "Welcome back," - assert on each rather than one
    // continuous string match, which can't span element boundaries.
    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText(/Welcome back,/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign up" })).not.toBeInTheDocument();
  });
});
