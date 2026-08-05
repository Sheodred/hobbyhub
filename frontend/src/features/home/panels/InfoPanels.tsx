import { WeatherPanel } from "./WeatherPanel";

// News panels (Tagesschau, WotC) join this grid as they're built.
export function InfoPanels() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <WeatherPanel />
    </div>
  );
}
