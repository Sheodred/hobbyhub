import { useQuery } from "@tanstack/react-query";

import { getCombos } from "./api";
import { CardHoverPreview } from "./CardHoverPreview";

interface ComboPanelProps {
  cardName: string;
}

// Up to 3 combos this card is part of, via the Commander Spellbook API -
// styled like edhrec.com/combos/lightning-bolt's side panel (section 4.4).
// Renders nothing if there simply aren't any combos for this card, or if
// the lookup fails - this is a secondary enhancement, not core content, so
// it degrades silently rather than showing an error state.
export function ComboPanel({ cardName }: ComboPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mtg-combos", cardName],
    queryFn: () => getCombos(cardName),
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Combos</h2>
        <div className="mt-3 animate-pulse space-y-2" aria-hidden="true">
          <div className="h-4 w-full rounded bg-slate-800" />
          <div className="h-4 w-3/4 rounded bg-slate-800" />
        </div>
      </div>
    );
  }

  if (isError || !data || data.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Combos</h2>
      <ul className="mt-3 flex flex-col gap-4">
        {data.map((combo) => (
          <li key={combo.url} className="border-t border-slate-800 pt-3 first:border-t-0 first:pt-0">
            <p className="text-sm text-slate-200">
              {combo.cardCount} card combo with{" "}
              {combo.otherCards.map((name, index) => (
                <span key={name}>
                  {index > 0 && ", "}
                  <CardHoverPreview name={name}>
                    <span className="text-slate-100">{name}</span>
                  </CardHoverPreview>
                </span>
              ))}
            </p>
            {combo.produces.length > 0 && (
              <p className="mt-1 text-xs text-slate-400">Produces: {combo.produces.join(", ")}</p>
            )}
            {combo.numDecks != null && (
              <p className="mt-1 text-xs text-slate-500">Found in {combo.numDecks.toLocaleString()} decks</p>
            )}
            <a
              href={combo.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-indigo-400 hover:underline"
            >
              View full combo &rarr;
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
