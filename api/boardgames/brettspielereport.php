<?php
// #180/#186: brettspiele-report's slice - their own rating and, when
// present, the Komplexität category score.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/BrettspieleReportClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;
if ($bggId === null) {
    error_response('bgg_id is required', 400);
}

try {
    $names = (new BggClient())->localSearchNames($bggId);
    if ($names === []) {
        json_response(['status' => 'ok', 'rating' => null, 'complexity' => null]);
    }

    $client = new BrettspieleReportClient();

    $rating = null;
    $complexity = null;
    try {
        $found = first_hit($names, fn(string $n) => $client->ratingFor($n));
        if ($found !== null) {
            $rating = [
                'source' => $client->label(),
                'value' => $found['rating'],
                'max' => $found['max'],
                'count' => null,
                'title' => $found['title'],
                'url' => $found['url'],
            ];
            $complexity = $found['complexity'] === null ? null : [
                'value' => $found['complexity'],
                'max' => BrettspieleReportClient::MAX_RATING,
                'source' => $client->label(),
            ];
        }
    } catch (Throwable $e) {
        error_log('brettspiele-report failed: ' . $e->getMessage());
    }

    json_response(['status' => 'ok', 'rating' => $rating, 'complexity' => $complexity]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
