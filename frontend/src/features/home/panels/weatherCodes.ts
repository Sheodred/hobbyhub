// Open-Meteo's `weather_code` is the WMO code table - only the subset
// realistically returned for "current conditions" is mapped here.
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
};

export function describeWeatherCode(code: number): string {
  return WEATHER_CODE_LABELS[code] ?? "Unknown conditions";
}

export type WeatherKind = "clear" | "partly-cloudy" | "cloudy" | "fog" | "rain" | "snow" | "thunderstorm";

const WEATHER_CODE_KINDS: Record<number, WeatherKind> = {
  0: "clear",
  1: "clear",
  2: "partly-cloudy",
  3: "cloudy",
  45: "fog",
  48: "fog",
  51: "rain",
  53: "rain",
  55: "rain",
  61: "rain",
  63: "rain",
  65: "rain",
  71: "snow",
  73: "snow",
  75: "snow",
  80: "rain",
  81: "rain",
  82: "rain",
  95: "thunderstorm",
};

export function classifyWeatherCode(code: number): WeatherKind {
  return WEATHER_CODE_KINDS[code] ?? "cloudy";
}
