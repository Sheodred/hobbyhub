<?php
// The instant half of a Lookup (#91): everything the imported ranks dump
// already knows, with no external call in the path. The page renders this
// first and lets /boardgames/lookup replace it when the slow sources land.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';

$q = trim($_GET['q'] ?? '');
if ($q === '') {
    error_response('q is required', 400);
}

try {
    json_response((new BggClient())->lookupLocal($q));
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
