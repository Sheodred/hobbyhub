import { Hero } from "./Hero";
import { HighlightCard } from "./HighlightCard";
import { highlights } from "./highlights";
import { InfoPanels } from "./panels/InfoPanels";

export function HomePage() {
  return (
    <div className="mx-auto flex w-3/4 flex-col gap-12">
      <Hero />

      <section aria-labelledby="highlights-heading">
        <h2 id="highlights-heading" className="sr-only">
          Explore
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {highlights.map((highlight, index) => (
            <HighlightCard key={highlight.to} highlight={highlight} index={index} />
          ))}
        </div>
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
