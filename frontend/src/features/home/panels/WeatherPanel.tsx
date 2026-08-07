import { useQuery } from "@tanstack/react-query";

import { FadeIn } from "../../../components/FadeIn";
import { useGeolocation } from "../../../hooks/useGeolocation";
import { WeatherIcon } from "./WeatherIcon";
import { classifyWeatherCode, describeWeatherCode } from "./weatherCodes";

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    weather_code: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    precipitation_probability: number[];
  };
}

interface PlaceResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
}

async function fetchWeather(latitude: number, longitude: number): Promise<OpenMeteoResponse> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&hourly=precipitation_probability&forecast_days=1&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Weather request failed");
  }
  return response.json();
}

// BigDataCloud's reverse-geocode-client endpoint is free, keyless, and built
// for direct browser calls (unlike Nominatim, which asks for a server-side
// User-Agent and stricter rate limits) - a good match for the same
// single-call-per-visitor shape as the weather request above.
async function fetchPlace(latitude: number, longitude: number): Promise<PlaceResponse> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Place lookup failed");
  }
  return response.json();
}

function currentPrecipitationProbability(data: OpenMeteoResponse): number | null {
  // Open-Meteo's hourly times sit on the hour (e.g. "…T14:00"); current.time
  // carries minutes, so truncate to find the matching hourly slot.
  const currentHour = `${data.current.time.slice(0, 13)}:00`;
  const index = data.hourly.time.indexOf(currentHour);
  return index === -1 ? null : data.hourly.precipitation_probability[index];
}

function formatLocalTime(isoTime: string): string {
  const [, time] = isoTime.split("T");
  return time ?? isoTime;
}

const TILE_CLASS = "rounded-[2rem] border border-white/10 bg-white/[0.03] p-1.5";
const TILE_INNER_CLASS =
  "rounded-[calc(2rem-0.375rem)] bg-[#1b1533]/60 px-6 py-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] sm:px-10";

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

  // Best-effort - if this fails or is still loading, the panel just omits
  // the place name rather than blocking on it like the weather data.
  const { data: place } = useQuery({
    queryKey: ["weather-place", isReady ? geolocation.latitude : null, isReady ? geolocation.longitude : null],
    queryFn: () => fetchPlace((geolocation as { latitude: number }).latitude, (geolocation as { longitude: number }).longitude),
    enabled: isReady,
    retry: false,
  });

  if (geolocation.status === "denied") {
    return (
      <FadeIn className={TILE_CLASS}>
        <div className={TILE_INNER_CLASS}>
          <p className="text-sm text-slate-400">Location access was declined, so this panel is hidden.</p>
        </div>
      </FadeIn>
    );
  }

  if (geolocation.status === "error" || isError) {
    return (
      <FadeIn className={TILE_CLASS}>
        <div className={TILE_INNER_CLASS}>
          <p className="text-sm text-slate-400">Couldn&apos;t load the weather right now.</p>
        </div>
      </FadeIn>
    );
  }

  if (geolocation.status === "loading" || isFetching || !data) {
    return (
      <FadeIn className={TILE_CLASS}>
        <div className={TILE_INNER_CLASS}>
          <div className="flex animate-pulse items-center gap-6" aria-hidden="true">
            <div className="h-14 w-14 rounded-full bg-slate-800" />
            <div className="space-y-2">
              <div className="h-8 w-24 rounded bg-slate-800" />
              <div className="h-4 w-40 rounded bg-slate-800" />
            </div>
          </div>
          <span className="sr-only">Loading weather…</span>
        </div>
      </FadeIn>
    );
  }

  const kind = classifyWeatherCode(data.current.weather_code);
  const isDay = data.current.is_day === 1;
  const precipitationProbability = currentPrecipitationProbability(data);
  const placeName = place?.city || place?.locality || place?.principalSubdivision;

  return (
    <FadeIn className={TILE_CLASS}>
      <div className={TILE_INNER_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <WeatherIcon kind={kind} isDay={isDay} className="h-14 w-14 shrink-0 text-indigo-400" />
            <div>
              <p className="text-4xl font-semibold tabular-nums text-slate-100 sm:text-5xl">
                {Math.round(data.current.temperature_2m)}°C
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {describeWeatherCode(data.current.weather_code)} · {isDay ? "Day" : "Night"}
                {precipitationProbability !== null && <> · {precipitationProbability}% rain</>}
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-slate-400">
            {placeName && <p className="font-medium text-slate-300">{placeName}</p>}
            <p className="mt-1 tabular-nums">{formatLocalTime(data.current.time)}</p>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
