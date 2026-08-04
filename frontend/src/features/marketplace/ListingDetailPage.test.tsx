import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../auth/AuthContext";
import { ListingDetailPage } from "./ListingDetailPage";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const sampleListing = {
  id: "listing-1",
  title: "Wingspan",
  description: "Great condition",
  category: "BOARD_GAME",
  price: 28,
  condition: "Good",
  status: "ACTIVE",
  imageUrls: [],
  sellerId: "seller-1",
  sellerDisplayName: "Adrian",
  createdAt: new Date().toISOString(),
};

function renderAt(path: string, loggedInAsUserId: string | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn((requestPath: string) => {
      if (requestPath === "/api/auth/refresh") {
        if (!loggedInAsUserId) {
          return Promise.resolve(jsonResponse(401, { message: "no session" }));
        }
        return Promise.resolve(
          jsonResponse(200, {
            accessToken: "token",
            expiresInSeconds: 900,
            user: { id: loggedInAsUserId, email: "u@example.com", displayName: "Someone", role: "USER" },
          }),
        );
      }
      return Promise.resolve(jsonResponse(200, sampleListing));
    }),
  );

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="/marketplace/:id" element={<ListingDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ListingDetailPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Edit/Remove controls to the owner", async () => {
    renderAt("/marketplace/listing-1", "seller-1");

    expect(await screen.findByRole("heading", { name: "Wingspan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove listing/i })).toBeInTheDocument();
  });

  it("hides Edit/Remove controls from a non-owner", async () => {
    renderAt("/marketplace/listing-1", "someone-else");

    expect(await screen.findByRole("heading", { name: "Wingspan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove listing/i })).not.toBeInTheDocument();
  });

  it("hides Edit/Remove controls when logged out", async () => {
    renderAt("/marketplace/listing-1", null);

    expect(await screen.findByRole("heading", { name: "Wingspan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /edit/i })).not.toBeInTheDocument();
  });
});
