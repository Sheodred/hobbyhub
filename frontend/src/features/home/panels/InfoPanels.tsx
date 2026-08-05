import { TagesschauPanel } from "./TagesschauPanel";
import { WeatherPanel } from "./WeatherPanel";
import { WotcNewsPanel } from "./WotcNewsPanel";

export function InfoPanels() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <TagesschauPanel />
      <WotcNewsPanel />
      <WeatherPanel />
    </div>
  );
}
