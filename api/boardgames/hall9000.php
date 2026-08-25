<?php
// #180/#186: H@LL9000's slice - facts (players/duration/age, unit-free
// numbers, see Hall9000Client::numericPrefix()) and their own rating.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/Hall9000Client.php';
require_once __DIR__ . '/../lib/RatingSource.php';

$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;
if ($bggId === null) {
    error_response('bgg_id is required', 400);
}

try {
    $names = (new BggClient())->localSearchNames($bggId);
    if ($names === []) {
        json_response(['status' => 'ok', 'rating' => null, 'players' => null, 'duration' => null, 'age' => null]);
    }

    $hall = new Hall9000Client();

    $rating = null;
    $players = null;
    $duration = null;
    $age = null;
    try {
        $found = first_hit($names, fn(string $n) => $hall->ratingFor($n));
        if ($found !== null) {
            $rating = [
                'source' => $hall->label(),
                'value' => $found['rating'],
                'max' => $found['max'],
                'count' => $found['count'],
                'title' => null,
                'url' => $found['url'],
            ];
            $players = $found['players'];
            $duration = $found['duration'];
            $age = $found['age'];
        }
    } catch (Throwable $e) {
        error_log('hall9000 failed: ' . $e->getMessage());
    }

    json_response(['status' => 'ok', 'rating' => $rating, 'players' => $players, 'duration' => $duration, 'age' => $age]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
