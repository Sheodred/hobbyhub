<?php
// #180/#186: Board Game Quest's slice - How-it-plays text (with a link
// back to the full review), Hits/Misses (good/bad fallback, merged
// client-side against BGG's own comments), and their own rating.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/BoardGameQuestClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;
if ($bggId === null) {
    error_response('bgg_id is required', 400);
}

try {
    $names = (new BggClient())->localSearchNames($bggId);
    if ($names === []) {
        json_response(['status' => 'ok', 'rating' => null, 'review' => null]);
    }

    $bgq = new BoardGameQuestClient();

    $rating = null;
    $review = null;
    try {
        // One reviewFor() covers both - rating() itself just wraps it, and
        // calling both here would be a second cache_aside on the exact same
        // key, harmless but pointless.
        $found = first_hit($names, fn(string $n) => $bgq->reviewFor($n));
        if ($found !== null) {
            $rating = [
                'source' => $bgq->label(),
                'value' => $found['score'],
                'max' => 5,
                'count' => null,
                'title' => $found['title'],
                'url' => $found['url'],
            ];
            $review = [
                'rules' => $found['rules'],
                'hits' => $found['hits'],
                'misses' => $found['misses'],
                'title' => $found['title'],
                'url' => $found['url'],
            ];
        }
    } catch (Throwable $e) {
        error_log('board game quest failed: ' . $e->getMessage());
    }

    json_response(['status' => 'ok', 'rating' => $rating, 'review' => $review]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
