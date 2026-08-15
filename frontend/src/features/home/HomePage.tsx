import { Hero } from "./Hero";
import { HighlightCard } from "./HighlightCard";
import { highlights } from "./highlights";
import { InfoPanels } from "./panels/InfoPanels";
import { MusicPanel } from "./panels/MusicPanel";
import { WeatherPanel } from "./panels/WeatherPanel";

export function HomePage() {
  return (
    <div className="mx-auto flex w-full flex-col gap-12">
      <Hero />

      <section aria-labelledby="music-heading" className="mx-auto w-full max-w-md">
        <h2 id="music-heading" className="sr-only">
          Music
        </h2>
        <MusicPanel />
      </section>

      <section aria-labelledby="highlights-heading">
        <h2 id="highlights-heading" className="sr-only">
          Explore
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          {highlights.map((highlight, index) => (
            <div key={highlight.to} className={index === 0 ? "sm:col-span-3" : "sm:col-span-2"}>
              <HighlightCard highlight={highlight} index={index} />
            </div>
          ))}
        </div>
      </section>

      <section id="weather" aria-labelledby="weather-heading" className="scroll-mt-24">
        <h2 id="weather-heading" className="sr-only">
          Weather
        </h2>
        <WeatherPanel />
      </section>

      <section aria-labelledby="info-heading">
        <h2 id="info-heading" className="sr-only">
          Today
        </h2>
        <InfoPanels />
      </section>
    </div>
  );
}
