<?php
// The lookup page's pre-search award panel (#105): this year's Spiel des
// Jahres results, read straight from the hand-maintained sdj_awards table -
// no external call. An empty `categories` means the table has not been
// seeded; the page renders nothing rather than an empty panel.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/SdjAwards.php';

try {
    json_response((new SdjAwards())->current());
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong loading the award winners.', 500);
}
