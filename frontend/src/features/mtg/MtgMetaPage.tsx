import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { getMtgMeta } from "./api";
import { MetaWidget } from "./MetaWidget";

export function MtgMetaPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["mtg-meta"], queryFn: getMtgMeta });

  return (
    <div>
      <FadeIn>
        <Link to="/mtg" className="text-sm text-indigo-400 hover:underline">
          &larr; Back to card browser
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-slate-100">Magic: The Gathering &mdash; Meta &amp; Stats</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          What&apos;s actually being played right now - popularity from EDHREC, competitive tier lists from
          MTGGoldfish. Refreshed every few hours, not fetched live.
        </p>
      </FadeIn>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <MetaWidget
          title="Most played cards"
          source="EDHREC, past week"
          entries={data?.mostPlayedCards}
          isLoading={isLoading}
          isError={isError}
          cardNames
        />
        <MetaWidget
          title="Most popular Commander decks"
          source="EDHREC, past week"
          entries={data?.popularCommanderDecks}
          isLoading={isLoading}
          isError={isError}
          cardNames
        />
        <MetaWidget
          title="Strongest Standard decks"
          source="MTGGoldfish metagame"
          entries={data?.standardDecks}
          isLoading={isLoading}
          isError={isError}
        />
        <MetaWidget
          title="Strongest Commander decks"
          source="MTGGoldfish metagame"
          entries={data?.commanderDecks}
          isLoading={isLoading}
          isError={isError}
        />
      </div>

      <FadeIn className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-medium text-slate-100">Looking for a specific deck?</h3>
        <p className="mt-2 text-sm text-slate-400">
          Moxfield doesn&apos;t offer a public API for browsing decks, so there&apos;s no live feed to show here -
          browse decks directly on{" "}
          <a
            href="https://www.moxfield.com/decks"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 hover:underline"
          >
            Moxfield
          </a>{" "}
          instead.
        </p>
      </FadeIn>
    </div>
  );
}
