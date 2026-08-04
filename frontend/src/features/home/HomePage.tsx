import { Hero } from "./Hero";
import { HighlightCard } from "./HighlightCard";
import { highlights } from "./highlights";

export function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <Hero />

      <section aria-labelledby="highlights-heading">
        <h2 id="highlights-heading" className="sr-only">
          Explore
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {highlights.map((highlight, index) => (
            <HighlightCard key={highlight.to} highlight={highlight} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}
