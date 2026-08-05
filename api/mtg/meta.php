<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/db.php';

function mtg_meta_entries(PDO $pdo, string $category): array
{
    $stmt = $pdo->prepare(
        'SELECT name, url, num_decks FROM mtg_meta_entries WHERE category = ? ORDER BY sort_order ASC'
    );
    $stmt->execute([$category]);
    return array_map(function ($row) {
        return [
            'name' => $row['name'],
            'url' => $row['url'],
            'numDecks' => $row['num_decks'] !== null ? (int) $row['num_decks'] : null,
        ];
    }, $stmt->fetchAll());
}

$pdo = db();
json_response([
    'mostPlayedCards' => mtg_meta_entries($pdo, 'MOST_PLAYED_CARDS'),
    'popularCommanderDecks' => mtg_meta_entries($pdo, 'POPULAR_COMMANDER_DECKS'),
    'standardDecks' => mtg_meta_entries($pdo, 'STANDARD_DECKS'),
    'commanderDecks' => mtg_meta_entries($pdo, 'COMMANDER_DECKS'),
]);
