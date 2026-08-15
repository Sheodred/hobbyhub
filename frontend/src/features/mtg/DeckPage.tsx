import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { ApiError } from "../../lib/apiClient";
import { getDeck } from "./api";
import { CardHoverPreview } from "./CardHoverPreview";

export function DeckPage() {
  const { deckId } = useParams<{ deckId: string }>();

  const {
    data: deck,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["mtg-deck", deckId],
    queryFn: () => getDeck(deckId!),
    enabled: Boolean(deckId),
  });

  if (isFetching) {
    return <p className="text-slate-400">Loading deck…</p>;
  }

  if (isError) {
    return (
      <p role="alert" className="text-rose-400">
        {error instanceof ApiError && error.status === 404
          ? "This deck isn't in the imported snapshot."
          : "Something went wrong loading this deck."}
      </p>
    );
  }

  if (!deck) {
    return null;
  }

  return (
    <FadeIn key={deck.deckId}>
      <Link to="/mtg/meta" className="text-sm text-indigo-400 hover:underline">
        &larr; Back to meta &amp; stats
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-slate-100">{deck.name}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {[deck.pilot, deck.event, deck.archetypeName].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {deck.sections.map((section) => (
          <div key={section.section} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {section.section} ({section.cards.reduce((total, card) => total + card.count, 0)})
            </h2>
            <ul className="mt-3 flex flex-col gap-1">
              {section.cards.map((card) => (
                <li key={card.name} className="flex items-baseline gap-2 text-sm">
                  <span className="w-6 shrink-0 text-slate-500">{card.count}</span>
                  <CardHoverPreview name={card.name}>
                    <span className="text-slate-200">{card.name}</span>
                  </CardHoverPreview>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </FadeIn>
  );
}
