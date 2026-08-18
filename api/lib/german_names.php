<?php

// BGG models one entry per game and hangs every localized title off it as an
// untagged <name type="alternate">. There is no language attribute to read:
// probed live on id 13, a <name> carries type/sortindex/value and nothing
// else, across 65 alternates in every language BGG knows. So the German
// title of a game cannot be looked up - only guessed at (#122).
//
// Guessing is safe here in a way it usually would not be, and that is the
// whole design: these candidates are only ever used as *search terms*
// against the secondary sources, never displayed and never stored as fact.
// A wrong candidate finds nothing, which is exactly what a German-titled
// game gets today. A right one turns four empty tiles into four filled ones.

// Each extra candidate is another throttled request per source on a cache
// miss, and there are four sources, so the list stays short. Two is enough
// once the list is ranked - the German title is not merely present among the
// candidates, it is the one that looks most German.
const GERMAN_NAME_CANDIDATE_LIMIT = 2;

// Particles and nouns a non-German title essentially never carries. "van" is
// deliberately absent - it is Dutch ("De Kolonisten van Catan"), and so is
// the bare "de" that would drag half the Romance languages in with it.
//
// Lookarounds rather than \s so that adjacent markers both count: consuming
// the space after "Die" would put "Siedler" out of reach of the next match.
const GERMAN_NAME_MARKERS =
    '/(?<!\p{L})(?:die|der|das|des|dem|den|von|vom|zum|zur|und|ein|eine|einen|im|auf|für|mit|spiel|siedler)(?!\p{L})/iu';

/**
 * German-looking alternates for a game, most German-looking first, primary
 * excluded.
 *
 * @param string[] $names every <name> value on the thing, primary included
 * @return string[]
 */
function german_name_candidates(array $names, string $primary): array
{
    $scored = [];

    foreach ($names as $name) {
        $name = trim($name);
        if ($name === '' || mb_strtolower($name) === mb_strtolower(trim($primary))) {
            continue;
        }
        $score = german_name_score($name);
        if ($score === 0) {
            continue;
        }
        // Keyed so two alternates differing only in case count once, and
        // first-wins so the keeper is BGG's own spelling rather than whatever
        // casing happens to come last.
        $scored[mb_strtolower($name)] ??= ['name' => $name, 'score' => $score];
    }

    // Ranking, not document order, is what makes a two-entry list enough.
    // Catan carries "Catan: Das Spiel", "Catan: Die Bordspel" (Dutch) and
    // "Les Colons de Katäne" (French, but with an umlaut) *ahead* of "Die
    // Siedler von Catan" in BGG's own ordering, so taking the first few as
    // they come drops the only name that actually resolves. Sorting is stable
    // in PHP 8, so equal scores keep BGG's order.
    $scored = array_values($scored);
    usort($scored, fn(array $a, array $b) => $b['score'] <=> $a['score']);

    return array_column(array_slice($scored, 0, GERMAN_NAME_CANDIDATE_LIMIT), 'name');
}

/**
 * How German a title looks: one point for a character German has and its
 * neighbours do not, one for each word only German uses. Zero means "not a
 * candidate" - the two are the same question asked at different resolutions.
 */
function german_name_score(string $name): int
{
    // A title written in another script is another language's title, whatever
    // words it appears to contain - "Catan (Колонизаторы)" is not German.
    if (preg_match('/[^\p{Latin}\p{Common}]/u', $name) === 1) {
        return 0;
    }

    return (preg_match('/[äöüß]/iu', $name) === 1 ? 1 : 0)
        + (int) preg_match_all(GERMAN_NAME_MARKERS, $name);
}
