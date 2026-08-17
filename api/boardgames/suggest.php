<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';

$q = trim($_GET['q'] ?? '');
if ($q === '') {
    error_response('q is required', 400);
}

try {
    json_response(['suggestions' => (new BggClient())->suggest($q)]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up suggestions.', 500);
}
