<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/ScryfallClient.php';

$name = trim($_GET['name'] ?? '');
if ($name === '') {
    error_response('name is required', 400);
}

try {
    json_response((new ScryfallClient())->getPrintings($name));
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong loading printings.', 500);
}
