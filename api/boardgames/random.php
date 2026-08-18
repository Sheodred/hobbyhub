<?php
// The lookup page's "Surprise me" button (#120): one random game, drawn
// straight from the imported ranks dump - no external call, no arguments.
// A null bggId means the dump has no eligible game (or is not imported);
// the page hides the button rather than letting it error when pressed.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';

try {
    json_response(['bggId' => (new BggClient())->randomBggId()]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong picking a random board game.', 500);
}
