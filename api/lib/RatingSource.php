<?php

// A Rating Source publishes its own score for a Game on its own scale, and
// those scales are never reconciled - see CONTEXT.md and ADR-0012 - ADR-0014.
// So a Rating carries its own max and the name of who published it:
//
//   ['source' => 'H@LL9000', 'value' => 4.6, 'max' => 6,
//    'count' => 9, 'title' => null, 'url' => '...']
//
// Adapters keep their own richer methods for everything that is not a rating
// (Board Game Quest's prose, H@LL9000's player count). This interface is only
// about the part every source has in common.
interface RatingSource
{
    // The source's own name, exactly as it should appear beside the score.
    public function label(): string;

    // Null means "nothing published for this Game" - a real answer, not a
    // failure. Failures throw and are handled by collect_ratings().
    public function rating(string $gameName): ?array;
}

// Every Rating Source is Best-Effort: one that is slow, broken or simply has
// no entry for this Game must never cost the user the answer they asked for,
// and must never take the others down with it (ADR-0011). That rule now lives
// here rather than being re-declared at each call site.
function collect_ratings(array $sources, array $gameNames): array
{
    $ratings = [];

    foreach ($sources as $source) {
        try {
            $rating = first_hit($gameNames, fn(string $name) => $source->rating($name));
        } catch (Throwable $e) {
            error_log($source->label() . ' rating failed: ' . $e->getMessage());
            continue;
        }

        if ($rating === null) {
            continue;
        }

        $ratings[] = ['source' => $source->label()] + $rating;
    }

    return $ratings;
}

// The sources are German sites; BGG's primary name is English (#122). So a
// game is looked for under several names - the English primary first, then
// whichever alternates look German (german_names.php) - and the first source
// that answers wins.
//
// A wrong name is not a wrong answer: it simply finds nothing, which is
// where a German-titled game already stands today. The cost of guessing is
// one extra throttled request per source on a cache miss, and only for the
// games the primary name failed on.
//
// Failures still throw rather than falling through to the next name: a
// source that is down has not said "nothing published for this name", and
// collect_ratings() is the one place that decides what to do about it.
function first_hit(array $gameNames, callable $fetch)
{
    foreach ($gameNames as $name) {
        $found = $fetch($name);
        if ($found !== null) {
            return $found;
        }
    }

    return null;
}
