import { FleaMarketPanel } from "./FleaMarketPanel";
import { MusicPanel } from "./MusicPanel";
import { TagesschauPanel } from "./TagesschauPanel";
import { WeatherPanel } from "./WeatherPanel";
import { WotcNewsPanel } from "./WotcNewsPanel";

export function InfoPanels() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <TagesschauPanel />
      <WotcNewsPanel />
      <WeatherPanel />
      <FleaMarketPanel />
      <MusicPanel />
    </div>
  );
}
