<?php
// The lookup page's pre-search starting point (#102): BGG's top 10, read
// straight from the imported ranks dump - no external call, no arguments.
// An empty list means the dump has not been imported; the page renders
// nothing rather than an empty grid.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';

try {
    json_response(['games' => (new BggClient())->topRanked()]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong loading the top board games.', 500);
}
