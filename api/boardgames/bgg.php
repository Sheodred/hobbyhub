<?php
// #180/#186: BGG's own slice of the boardgame lookup - name, description,
// image, facts, categories, BGG's own rating/rank, good/bad. The only
// endpoint of the six that can fail the whole card (404/502) - the other
// five are Best-Effort and always answer 200. Fired in parallel with them;
// does not wait on or block any of them.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';

$q = trim($_GET['q'] ?? '');
$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;

if ($q === '' && $bggId === null) {
    error_response('q or bgg_id is required', 400);
}
// #130: only 'de' is ever meaningful today - anything else (missing, 'en',
// garbage) is today's existing behaviour, BGG's own primary name.
$lang = ($_GET['lang'] ?? '') === 'de' ? 'de' : null;

try {
    $client = new BggClient();

    if ($bggId === null) {
        $resolved = $client->resolveSearch($q);
        if ($resolved['status'] === 'not_found') {
            json_response([
                'status' => 'not_found',
                'query' => $q,
                'suggestions' => $client->didYouMean($q, 5, $lang),
            ]);
        }
        if ($resolved['status'] === 'disambiguation') {
            json_response(['status' => 'disambiguation', 'candidates' => $resolved['candidates']]);
        }
        $bggId = $resolved['bggId'];
    }

    $game = $client->lookup($bggId);
    if ($game === null) {
        error_response('That board game could not be found on BoardGameGeek.', 404);
    }
    if ($lang !== null) {
        $game['name'] = $client->preferredName($bggId, $lang) ?? $game['name'];
    }
    $game['descriptionTranslated'] = false;
    if ($lang !== null) {
        $translated = $client->preferredDescription($bggId, $lang);
        if ($translated !== null) {
            $game['description'] = $translated;
            $game['descriptionTranslated'] = true;
        }
    }
    // Search-only, never a field this API has published.
    unset($game['germanNames']);

    json_response(['status' => 'ok', 'game' => $game]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
