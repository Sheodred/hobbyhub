import { DortmundNewsPanel } from "./DortmundNewsPanel";
import { FleaMarketPanel } from "./FleaMarketPanel";
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
      <DortmundNewsPanel />
    </div>
  );
}
