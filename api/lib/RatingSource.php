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
function collect_ratings(array $sources, string $gameName): array
{
    $ratings = [];

    foreach ($sources as $source) {
        try {
            $rating = $source->rating($gameName);
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
