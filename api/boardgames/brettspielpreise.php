<?php
// #180/#186: Brettspielpreise.de's slice - the retail price, keyed
// directly by BGG id, no title matching or name resolution needed.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BrettspielpreiseClient.php';

$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;
if ($bggId === null) {
    error_response('bgg_id is required', 400);
}

try {
    $client = new BrettspielpreiseClient();

    $price = null;
    try {
        $found = $client->priceFor($bggId);
        $price = $found === null ? null : [
            'value' => $found['price'],
            'currency' => $found['currency'],
            'source' => $client->label(),
            'url' => $found['url'],
        ];
    } catch (Throwable $e) {
        error_log('brettspielpreise.de failed: ' . $e->getMessage());
    }

    json_response(['status' => 'ok', 'price' => $price]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
