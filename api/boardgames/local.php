<?php
// The instant half of a Lookup (#91): everything the imported ranks dump
// already knows, with no external call in the path. The page renders this
// first and lets /boardgames/lookup replace it when the slow sources land.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';

$q = trim($_GET['q'] ?? '');
// #115: a shared link or a top-10 click arrives by id, not name, and wants
// the same instant answer the typed path gets.
$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;
if ($q === '' && $bggId === null) {
    error_response('q or bgg_id is required', 400);
}
$lang = ($_GET['lang'] ?? '') === 'de' ? 'de' : null;

try {
    $client = new BggClient();
    json_response($bggId !== null ? $client->lookupLocalById($bggId, $lang) : $client->lookupLocal($q, $lang));
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
