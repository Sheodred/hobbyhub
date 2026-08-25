import type {
  AmazonResult,
  BggCoreResult,
  Boardgame,
  BoardGameQuestResult,
  BrettspieleReportResult,
  Complexity,
  ExternalRating,
  Hall9000Result,
  Lang,
  RetailPrice,
} from "./api";

// #180/#186 fix (final review): "failed" is its own terminal state, distinct
// from "pending" - a source that errored is settled and must stop showing a
// spinner, but (unlike "done") has no value to merge in.
export type SourceState<T> = { status: "pending" } | { status: "done"; value: T } | { status: "failed" };

export interface Sources {
  bgg: SourceState<BggCoreResult>;
  amazon: SourceState<AmazonResult>;
  boardgamequest: SourceState<BoardGameQuestResult>;
  hall9000: SourceState<Hall9000Result>;
  brettspielereport: SourceState<BrettspieleReportResult>;
  brettspielpreise: SourceState<RetailPrice | null>;
}

export function initialSources(): Sources {
  return {
    bgg: { status: "pending" },
    amazon: { status: "pending" },
    boardgamequest: { status: "pending" },
    hall9000: { status: "pending" },
    brettspielereport: { status: "pending" },
    brettspielpreise: { status: "pending" },
  };
}

function done<T>(state: SourceState<T>): T | null {
  return state.status === "done" ? state.value : null;
}

// #180/#186: BGG's own facts carry no unit word ("2 - 4", "75", "10") -
// this is the one place that turns them into a labeled display string,
// so every source speaks the same unit-free language upstream of here
// and the label always matches the page's current DE/EN toggle.
function labelPlayers(value: string, lang: Lang): string {
  return lang === "de" ? `${value} Spieler` : `${value} players`;
}
function labelDuration(value: string, lang: Lang): string {
  return lang === "de" ? `${value} Minuten` : `${value} minutes`;
}
function labelAge(value: number, lang: Lang): string {
  return lang === "de" ? `ab ${value} Jahren` : `ages ${value}+`;
}

/**
 * Recomputed from scratch on every source arrival rather than patched
 * incrementally - simpler to reason about and test than tracking which
 * fields have already been merged.
 */
export function mergeSources(local: Boardgame, sources: Sources, lang: Lang): Boardgame {
  const bgg = done(sources.bgg);
  const amazon = done(sources.amazon);
  const boardgamequest = done(sources.boardgamequest);
  const hall9000 = done(sources.hall9000);
  const brettspielereport = done(sources.brettspielereport);
  const brettspielpreise = done(sources.brettspielpreise);

  // Cast: bgg.age/players/duration are BGG's raw unit-free values (number |
  // string), narrower than Boardgame's labeled-string fields - safe here
  // because the return below always overwrites all three with the labeled
  // version before this function's result is read.
  const base: Boardgame =
    bgg === null ? local : ({ ...local, ...bgg, ratings: local.ratings, prices: local.prices } as Boardgame);

  // Facts: bgg's own value wins per field; hall9000 only fills a field
  // bgg did not have at all, never replaces one it did.
  const rawPlayers = bgg?.players ?? hall9000?.players ?? null;
  const rawDuration = bgg?.duration ?? hall9000?.duration ?? null;
  const rawAge = bgg?.age ?? hall9000?.age ?? null;

  // good/bad: waits for bgg specifically, so board game quest's fallback
  // never flashes in and then gets replaced once bgg's own answer lands.
  let good = base.good;
  let bad = base.bad;
  if (bgg !== null) {
    good = bgg.good ?? (boardgamequest?.review?.hits.length ? boardgamequest.review.hits : null);
    bad = bgg.bad ?? (boardgamequest?.review?.misses.length ? boardgamequest.review.misses : null);
  }

  // Complexity: brettspiele-report's own value wins over bgg's fallback,
  // same direction lookup.php used before this split.
  const complexity: Complexity | null = brettspielereport?.complexity ?? bgg?.complexity ?? local.complexity;

  const ratings: ExternalRating[] = [amazon?.rating, boardgamequest?.rating, hall9000?.rating, brettspielereport?.rating].filter(
    (r): r is ExternalRating => r !== null && r !== undefined
  );

  const prices: RetailPrice[] = [brettspielpreise, amazon?.price].filter(
    (p): p is RetailPrice => p !== null && p !== undefined
  );

  return {
    ...base,
    players: rawPlayers === null ? null : labelPlayers(rawPlayers, lang),
    duration: rawDuration === null ? null : labelDuration(rawDuration, lang),
    age: rawAge === null ? null : labelAge(rawAge, lang),
    good,
    bad,
    complexity,
    bgq:
      boardgamequest?.review === null || boardgamequest?.review === undefined
        ? null
        : { ...boardgamequest.review, score: boardgamequest.rating?.value ?? 0 },
    ratings,
    prices,
  };
}
