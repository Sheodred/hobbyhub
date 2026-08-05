import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WeatherPanel } from "./WeatherPanel";

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WeatherPanel />
    </QueryClientProvider>,
  );
}

function stubGeolocation(impl: Geolocation["getCurrentPosition"]) {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: impl },
  });
}

describe("WeatherPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error - cleaning up the per-test stub
    delete window.navigator.geolocation;
  });

  it("shows the temperature and conditions once geolocation and the forecast both resolve", async () => {
    stubGeolocation((success) => {
      success({ coords: { latitude: 52.52, longitude: 13.4 } } as GeolocationPosition);
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ current: { temperature_2m: 18.4, weather_code: 2 } }),
      }),
    );

    renderPanel();

    expect(await screen.findByText("18°C")).toBeInTheDocument();
    expect(screen.getByText("Partly cloudy")).toBeInTheDocument();
  });

  it("shows a graceful message when the user declines the location prompt", async () => {
    stubGeolocation((_success, error) => {
      error!({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError);
    });

    renderPanel();

    expect(await screen.findByText(/location access was declined/i)).toBeInTheDocument();
  });

  it("shows a graceful message when geolocation isn't available at all", async () => {
    renderPanel();

    expect(await screen.findByText(/couldn't load the weather/i)).toBeInTheDocument();
  });
});
