<?php
// #180/#186: Amazon.de's own slice of the boardgame lookup - rating and
// price, one fetch serves both. Fired in parallel with bgg.php and the
// other four external endpoints; resolves its own search names locally
// (see BggClient::localSearchNames()) rather than waiting on bgg.php.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/AmazonRatingClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;
if ($bggId === null) {
    error_response('bgg_id is required', 400);
}

try {
    $names = (new BggClient())->localSearchNames($bggId);
    if ($names === []) {
        json_response(['status' => 'ok', 'rating' => null, 'price' => null]);
    }

    $amazon = new AmazonRatingClient();

    $rating = null;
    try {
        $found = first_hit($names, fn(string $n) => $amazon->rating($n));
        $rating = $found === null ? null : ['source' => $amazon->label()] + $found;
    } catch (Throwable $e) {
        error_log('amazon.de rating failed: ' . $e->getMessage());
    }

    $price = null;
    try {
        $found = first_hit($names, fn(string $n) => $amazon->priceFor($n));
        $price = $found === null ? null : [
            'value' => $found['price'],
            'currency' => $found['currency'],
            'source' => $amazon->label(),
            'url' => $found['url'],
        ];
    } catch (Throwable $e) {
        error_log('amazon.de price failed: ' . $e->getMessage());
    }

    json_response(['status' => 'ok', 'rating' => $rating, 'price' => $price]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
