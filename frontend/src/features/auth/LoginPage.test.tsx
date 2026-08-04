import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { AuthProvider } from "./AuthContext";
import { LoginPage } from "./LoginPage";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    // AuthProvider's own mount-time refresh call - "logged out" by default.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { message: "no session" })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks submission and shows an error when fields are empty", async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: "Log in" });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();

    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email and password are required.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server's error message on invalid credentials", async () => {
    renderLoginPage();
    await screen.findByRole("heading", { name: "Log in" });

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(401, { message: "Invalid email or password" }));

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
  });
});
