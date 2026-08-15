<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/db.php';

// Decks for one archetype, straight from the imported snapshot - no outbound
// call, so nothing here can be rate-limited, blocked or slow.
$path = trim($_GET['path'] ?? '');
if ($path === '') {
    error_response('path is required', 400);
}

$stmt = db()->prepare(
    'SELECT deck_id, name, pilot, event, url, archetype_name
     FROM mtg_decks WHERE archetype_path = ? ORDER BY sort_order'
);
$stmt->execute([$path]);
$rows = $stmt->fetchAll();

$decks = [];
foreach ($rows as $row) {
    $decks[] = [
        'deckId' => $row['deck_id'],
        'name' => $row['name'],
        'pilot' => $row['pilot'],
        'event' => $row['event'],
        'url' => $row['url'],
    ];
}

json_response([
    'archetypeName' => $rows === [] ? null : $rows[0]['archetype_name'],
    'decks' => $decks,
]);
