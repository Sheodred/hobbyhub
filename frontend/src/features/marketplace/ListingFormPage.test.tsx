import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ListingFormPage } from "./ListingFormPage";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderNewListingForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/marketplace/new"]}>
        <Routes>
          <Route path="/marketplace/new" element={<ListingFormPage />} />
          <Route path="/marketplace/:id" element={<div>listing detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ListingFormPage (create)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits a create request with the entered values and navigates to the new listing", async () => {
    const user = userEvent.setup();
    const createdListing = {
      id: "new-listing",
      title: "Catan",
      description: "",
      category: "BOARD_GAME",
      price: 20,
      condition: "Good",
      status: "ACTIVE",
      imageUrls: [],
      sellerId: "seller-1",
      sellerDisplayName: "Adrian",
      createdAt: new Date().toISOString(),
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, createdListing));
    vi.stubGlobal("fetch", fetchMock);

    renderNewListingForm();

    await user.type(screen.getByLabelText("Title"), "Catan");
    await user.type(screen.getByLabelText("Price (€)"), "20");
    await user.type(screen.getByLabelText("Condition"), "Good");
    await user.click(screen.getByRole("button", { name: /create listing/i }));

    expect(await screen.findByText("listing detail")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/listings",
      expect.objectContaining({ method: "POST" }),
    );
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody).toMatchObject({ title: "Catan", price: 20, condition: "Good", category: "OTHER" });
  });
});
