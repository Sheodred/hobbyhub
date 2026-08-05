<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/CommanderSpellbookClient.php';

$cardName = trim($_GET['cardName'] ?? '');
if ($cardName === '') {
    error_response('cardName is required', 400);
}

try {
    json_response((new CommanderSpellbookClient())->findCombos($cardName));
} catch (Throwable $e) {
    error_log($e->getMessage());
    // Secondary enhancement, not core content - degrade silently to an
    // empty list (the frontend's ComboPanel renders nothing) rather than
    // showing an error state, same as before.
    json_response([]);
}
