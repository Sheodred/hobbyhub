<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/ScryfallClient.php';

$q = trim($_GET['q'] ?? '');
if ($q === '') {
    error_response('q is required', 400);
}
$page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;

try {
    json_response((new ScryfallClient())->search($q, $page));
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong searching for cards.', 500);
}
