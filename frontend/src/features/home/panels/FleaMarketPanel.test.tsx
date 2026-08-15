import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FleaMarketPanel } from "./FleaMarketPanel";

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FleaMarketPanel />
    </QueryClientProvider>,
  );
}

function stubGeolocation(impl: Geolocation["getCurrentPosition"]) {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: impl },
  });
}

describe("FleaMarketPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error - cleaning up the per-test stub
    delete window.navigator.geolocation;
  });

  it("renders upcoming flea market events as links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          {
            name: "Kinderflohmarkt EKS Scharnhorst",
            location: "EKS Scharnhorst",
            url: "https://kinderflohmarkt.com/de/dortmund/#t21150",
            date: "2026-08-08T09:00:00+02:00",
            latitude: null,
            longitude: null,
          },
        ]),
      ),
    );

    renderPanel();

    expect(await screen.findByRole("link", { name: "Kinderflohmarkt EKS Scharnhorst" })).toHaveAttribute(
      "href",
      "https://kinderflohmarkt.com/de/dortmund/#t21150",
    );
    expect(screen.getByText(/· EKS Scharnhorst/)).toBeInTheDocument();
  });

  it("shows the distance to an event once the user's location and the event's coordinates are both known", async () => {
    stubGeolocation((success) => {
      success({ coords: { latitude: 51.5136, longitude: 7.4653 } } as GeolocationPosition);
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          {
            name: "Kinderflohmarkt EKS Scharnhorst",
            location: "EKS Scharnhorst",
            url: "https://kinderflohmarkt.com/de/dortmund/#t21150",
            date: "2026-08-08T09:00:00+02:00",
            latitude: 51.5511,
            longitude: 7.5386,
          },
        ]),
      ),
    );

    renderPanel();

    expect(await screen.findByText(/km away/)).toBeInTheDocument();
  });

  it("shows a graceful message when there are no upcoming events", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));

    renderPanel();

    expect(await screen.findByText(/no flea markets in the next 30 days/i)).toBeInTheDocument();
  });

  it("caps the list at 5 events with a show more toggle", async () => {
    const events = Array.from({ length: 7 }, (_, i) => ({
      name: `Flea Market ${i + 1}`,
      location: null,
      url: `https://example.com/${i + 1}`,
      date: "2026-08-08T09:00:00+02:00",
      latitude: null,
      longitude: null,
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, events)));

    renderPanel();

    await screen.findByRole("link", { name: "Flea Market 1" });
    expect(screen.getAllByRole("link")).toHaveLength(5);

    fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));

    expect(screen.getAllByRole("link")).toHaveLength(7);
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });
});
