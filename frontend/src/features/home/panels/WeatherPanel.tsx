import { useQuery } from "@tanstack/react-query";

import { useGeolocation } from "../../../hooks/useGeolocation";
import { InfoPanelCard } from "./InfoPanelCard";
import { describeWeatherCode } from "./weatherCodes";

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
  };
}

async function fetchWeather(latitude: number, longitude: number): Promise<OpenMeteoResponse> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Weather request failed");
  }
  return response.json();
}

// Called directly from the browser (no backend involvement) - Open-Meteo is
// free, keyless, and CORS-friendly, and there's no rate-limit concern worth
// a server-side cache for a single-location-per-visitor call like this one.
export function WeatherPanel() {
  const geolocation = useGeolocation();
  const isReady = geolocation.status === "success";

  const { data, isFetching, isError } = useQuery({
    queryKey: ["weather", isReady ? geolocation.latitude : null, isReady ? geolocation.longitude : null],
    queryFn: () => fetchWeather((geolocation as { latitude: number }).latitude, (geolocation as { longitude: number }).longitude),
    enabled: isReady,
  });

  if (geolocation.status === "denied") {
    return (
      <InfoPanelCard title="Weather">
        <p className="text-sm text-slate-400">Location access was declined, so this panel is hidden.</p>
      </InfoPanelCard>
    );
  }

  if (geolocation.status === "error" || isError) {
    return (
      <InfoPanelCard title="Weather">
        <p className="text-sm text-slate-400">Couldn&apos;t load the weather right now.</p>
      </InfoPanelCard>
    );
  }

  if (geolocation.status === "loading" || isFetching || !data) {
    return (
      <InfoPanelCard title="Weather">
        <div className="animate-pulse space-y-2" aria-hidden="true">
          <div className="h-8 w-20 rounded bg-slate-800" />
          <div className="h-4 w-32 rounded bg-slate-800" />
        </div>
        <span className="sr-only">Loading weather…</span>
      </InfoPanelCard>
    );
  }

  return (
    <InfoPanelCard title="Weather">
      <p className="text-3xl font-semibold text-slate-100">{Math.round(data.current.temperature_2m)}°C</p>
      <p className="mt-1 text-sm text-slate-400">{describeWeatherCode(data.current.weather_code)}</p>
    </InfoPanelCard>
  );
}
