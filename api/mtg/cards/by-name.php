<?php
// Exact-name lookup for card-name hover previews (e.g. on the MTG Meta &
// Stats page) - a lighter call than /printings, which fetches every printing.
require_once __DIR__ . '/../../lib/http.php';
require_once __DIR__ . '/../../lib/ScryfallClient.php';

$name = trim($_GET['name'] ?? '');
if ($name === '') {
    error_response('name is required', 400);
}

try {
    $card = (new ScryfallClient())->getCardByName($name);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong loading this card.', 500);
}

if ($card === null) {
    error_response('Card not found', 404);
}
json_response($card);
