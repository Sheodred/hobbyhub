import type { WeatherKind } from "./weatherCodes";

interface WeatherIconProps {
  kind: WeatherKind;
  isDay: boolean;
  className?: string;
}

// AI-generated (Higgsfield/Recraft) icon set, replacing the old hand-drawn
// line icons - one cohesive flat-vector style across all conditions, day and
// night variants where the condition itself looks different after dark.
const ICON_FILES: Record<WeatherKind, { day: string; night: string }> = {
  clear: { day: "clear-day", night: "clear-night" },
  "partly-cloudy": { day: "partly-cloudy-day", night: "partly-cloudy-night" },
  cloudy: { day: "cloudy", night: "cloudy" },
  fog: { day: "fog", night: "fog" },
  rain: { day: "rain", night: "rain" },
  snow: { day: "snow", night: "snow" },
  thunderstorm: { day: "thunderstorm", night: "thunderstorm" },
};

export function WeatherIcon({ kind, isDay, className }: WeatherIconProps) {
  const file = isDay ? ICON_FILES[kind].day : ICON_FILES[kind].night;
  return <img src={`/weather/${file}.svg`} alt="" aria-hidden="true" className={`${className ?? ""} object-contain`} />;
}
