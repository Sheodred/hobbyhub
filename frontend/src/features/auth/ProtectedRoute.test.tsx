import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function renderProtected(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div>Secret profile content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when there is no session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { message: "no session" })));

    renderProtected("/profile");

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Secret profile content")).not.toBeInTheDocument();
  });

  it("renders the protected content once a session is confirmed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          accessToken: "token",
          user: { id: "1", email: "a@example.com", displayName: "A", role: "USER" },
        }),
      ),
    );

    renderProtected("/profile");

    expect(await screen.findByText("Secret profile content")).toBeInTheDocument();
  });
});
