<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';

$q = trim($_GET['q'] ?? '');
if ($q === '') {
    error_response('q is required', 400);
}
// #130: only 'de' is ever meaningful today - anything else (missing, 'en',
// garbage) is today's existing behaviour, the BGG primary name.
$lang = ($_GET['lang'] ?? '') === 'de' ? 'de' : null;

try {
    json_response(['suggestions' => (new BggClient())->suggest($q, 3, $lang)]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up suggestions.', 500);
}
