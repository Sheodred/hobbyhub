import { useQuery } from "@tanstack/react-query";

import { QueryState } from "../../components/QueryState";
import { getCombos } from "./api";
import { CardHoverPreview } from "./CardHoverPreview";

interface ComboPanelProps {
  cardName: string;
}

// Up to 3 combos this card is part of, via EDHREC's combo API -
// styled like edhrec.com/combos/lightning-bolt's side panel (section 4.4).
// Renders nothing when the card genuinely has no combos, but says so when
// the lookup fails: silence for both made a broken backend look identical
// to an empty result for as long as it took someone to notice (issue #35).
export function ComboPanel({ cardName }: ComboPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mtg-combos", cardName],
    queryFn: () => getCombos(cardName),
  });

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      isEmpty={!data || data.length === 0}
      loadingFallback={
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Combos</h2>
          <div className="mt-3 animate-pulse space-y-2" aria-hidden="true">
            <div className="h-4 w-full rounded bg-slate-800" />
            <div className="h-4 w-3/4 rounded bg-slate-800" />
          </div>
        </div>
      }
      errorFallback={
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Combos</h2>
          <p className="mt-3 text-sm text-slate-400">Combo lookup is unavailable right now.</p>
        </div>
      }
      emptyFallback={null}
    >
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Combos</h2>
        <ul className="mt-3 flex flex-col gap-4">
          {(data ?? []).map((combo) => (
            <li key={combo.url} className="border-t border-slate-800 pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm text-slate-200">
                {combo.cardCount} card combo with{" "}
                {combo.otherCards.map((card, index) => (
                  <span key={card.name}>
                    {index > 0 && ", "}
                    <CardHoverPreview name={card.name}>
                      <span className="text-slate-100">{card.name}</span>
                    </CardHoverPreview>
                  </span>
                ))}
              </p>
              {/* The names are right above, so the thumbnails are decorative -
                  they carry no information a screen reader is missing. */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {combo.otherCards.map(
                  (card) =>
                    card.imageUrl && (
                      <img
                        key={card.name}
                        src={card.imageUrl}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="h-[67px] w-12 rounded border border-slate-700 object-cover"
                      />
                    ),
                )}
              </div>
              {combo.produces.length > 0 && (
                <p className="mt-1 text-xs text-slate-400">Produces: {combo.produces.join(", ")}</p>
              )}
              {combo.numDecks != null && (
                <p className="mt-1 text-xs text-slate-400">Found in {combo.numDecks.toLocaleString()} decks</p>
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
    </QueryState>
  );
}
