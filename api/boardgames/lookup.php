<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/AmazonRatingClient.php';
require_once __DIR__ . '/../lib/BoardGameQuestClient.php';

$q = trim($_GET['q'] ?? '');
$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;

if ($q === '' && $bggId === null) {
    error_response('q or bgg_id is required', 400);
}

try {
    $client = new BggClient();

    if ($bggId === null) {
        $resolved = $client->resolveSearch($q);
        if ($resolved['status'] === 'not_found') {
            error_response('No board game found for that name.', 404);
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
    // Second opinion from retail, best-effort: a missing or failing Amazon
    // rating must never cost the user the BGG answer they asked for.
    try {
        $game['amazon'] = (new AmazonRatingClient())->ratingFor($game['name']);
    } catch (Throwable $e) {
        error_log('amazon rating lookup failed: ' . $e->getMessage());
        $game['amazon'] = null;
    }

    // Board Game Quest's own verdict, also best-effort. Their Hits/Misses
    // fill the good/bad slots while BGG's comments are unavailable (#40);
    // once BGG answers again its own comments keep priority.
    try {
        $game['bgq'] = (new BoardGameQuestClient())->reviewFor($game['name']);
        if ($game['bgq'] !== null) {
            $game['good'] ??= $game['bgq']['hits'][0] ?? null;
            $game['bad'] ??= $game['bgq']['misses'][0] ?? null;
        }
    } catch (Throwable $e) {
        error_log('board game quest lookup failed: ' . $e->getMessage());
        $game['bgq'] = null;
    }

    json_response(['status' => 'ok', 'game' => $game]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
