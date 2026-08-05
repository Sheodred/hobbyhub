import { TagesschauPanel } from "./TagesschauPanel";
import { WeatherPanel } from "./WeatherPanel";

// The WotC news panel joins this grid once it's built.
export function InfoPanels() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <TagesschauPanel />
      <WeatherPanel />
    </div>
  );
}
