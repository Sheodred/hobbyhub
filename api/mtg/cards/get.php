<?php
// Reached via the .htaccess rewrite for /api/mtg/cards/{id} (any id other
// than the literal "by-name", which has its own more specific rule).
require_once __DIR__ . '/../../lib/http.php';
require_once __DIR__ . '/../../lib/ScryfallClient.php';

$id = $_GET['id'] ?? '';

try {
    $card = (new ScryfallClient())->getCard($id);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong loading this card.', 500);
}

if ($card === null) {
    error_response('Card not found', 404);
}
json_response($card);
