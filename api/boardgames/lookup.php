<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';

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
    json_response(['status' => 'ok', 'game' => $game]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
