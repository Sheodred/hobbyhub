<?php
require_once __DIR__ . '/../../lib/http.php';
require_once __DIR__ . '/../../lib/db.php';

$deckId = trim($_GET['id'] ?? '');
if ($deckId === '') {
    error_response('id is required', 400);
}

$pdo = db();
$stmt = $pdo->prepare('SELECT deck_id, name, pilot, event, url, format, archetype_name FROM mtg_decks WHERE deck_id = ?');
$stmt->execute([$deckId]);
$deck = $stmt->fetch();

if (!$deck) {
    error_response('deck not found', 404);
}

$stmt = $pdo->prepare('SELECT section, name, count FROM mtg_deck_cards WHERE deck_id = ? ORDER BY sort_order');
$stmt->execute([$deckId]);

// Grouped by section here rather than in the frontend: the section order is
// the import order (Mainboard before Sideboard, as MTGGoldfish lists them),
// and that ordering is only knowable on this side.
$sections = [];
foreach ($stmt->fetchAll() as $row) {
    $sections[$row['section']][] = ['name' => $row['name'], 'count' => (int) $row['count']];
}

json_response([
    'deckId' => $deck['deck_id'],
    'name' => $deck['name'],
    'pilot' => $deck['pilot'],
    'event' => $deck['event'],
    'url' => $deck['url'],
    'format' => $deck['format'],
    'archetypeName' => $deck['archetype_name'],
    'sections' => array_map(
        fn(string $section) => ['section' => $section, 'cards' => $sections[$section]],
        array_keys($sections)
    ),
]);
