import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
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
    vi.useRealTimers();
    // @ts-expect-error - cleaning up the per-test stub
    delete window.navigator.geolocation;
  });

  it("shows the temperature, conditions, rain chance, live clock, and place once everything resolves", async () => {
    // System clock pinned so the live clock (driven by the browser's own
    // clock + the location's UTC offset, not the API response) is asserted
    // deterministically rather than against whenever the test happens to run.
    // shouldAdvanceTime keeps the fake clock ticking in step with real time
    // (just offset to the pinned instant below) so findBy's internal
    // setTimeout-based polling still progresses instead of hanging.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-07T12:32:00Z"));

    stubGeolocation((success) => {
      success({ coords: { latitude: 52.52, longitude: 13.4 } } as GeolocationPosition);
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("bigdatacloud")) {
          return Promise.resolve({ ok: true, json: async () => ({ city: "Berlin" }) });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            utc_offset_seconds: 7200,
            current: { time: "2026-08-07T14:32", temperature_2m: 18.4, weather_code: 2, is_day: 1 },
            hourly: {
              time: ["2026-08-07T13:00", "2026-08-07T14:00", "2026-08-07T15:00"],
              precipitation_probability: [10, 20, 30],
            },
            daily: {
              time: ["2026-08-07", "2026-08-08"],
              weather_code: [2, 61],
              temperature_2m_max: [21.2, 17.8],
              temperature_2m_min: [12.5, 11.1],
              precipitation_probability_max: [20, 65],
            },
          }),
        });
      }),
    );

    renderPanel();

    expect(await screen.findByText("18°C")).toBeInTheDocument();
    expect(screen.getByText(/Partly cloudy · Day · 20% rain/)).toBeInTheDocument();
    expect(screen.getByText("14:32 GMT+2")).toBeInTheDocument();
    expect(screen.getByText("Berlin")).toBeInTheDocument();

    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    expect(screen.getByText("/ 11°C", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Light rain · 65% rain/)).toBeInTheDocument();

    // The clock ticks forward on its own (useNow's interval), not just once
    // at fetch time - advance the system clock past a minute boundary and
    // confirm the displayed time actually follows it.
    vi.setSystemTime(new Date("2026-08-07T12:33:30Z"));
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(await screen.findByText("14:33 GMT+2")).toBeInTheDocument();
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
