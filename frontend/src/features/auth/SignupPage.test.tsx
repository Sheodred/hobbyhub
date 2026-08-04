import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { AuthProvider } from "./AuthContext";
import { SignupPage } from "./SignupPage";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderSignupPage() {
  return render(
    <MemoryRouter initialEntries={["/signup"]}>
      <AuthProvider>
        <SignupPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SignupPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { message: "no session" })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a password shorter than 8 characters before hitting the server", async () => {
    const user = userEvent.setup();
    renderSignupPage();
    await screen.findByRole("heading", { name: "Sign up" });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();

    await user.type(screen.getByLabelText("Display name"), "Alice");
    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("at least 8 characters");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server's error message on a duplicate email", async () => {
    renderSignupPage();
    await screen.findByRole("heading", { name: "Sign up" });

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(409, { message: "An account with email 'alice@example.com' already exists" }),
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Display name"), "Alice");
    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
  });
});
