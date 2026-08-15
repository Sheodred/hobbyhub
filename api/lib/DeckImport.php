<?php
require_once __DIR__ . '/db.php';

// Extracted from cron/import_mtg_decks.php so it can be unit-tested without
// spending real API credits, the same split MetaRefresh.php uses.

// One deck and its cards, written together. A deck with no cards is not
// written at all: a half-imported deck renders as an empty deck page, which
// looks like a bug rather than like missing data.
function store_deck(PDO $pdo, array $deck, array $cards, string $format, string $archetypeName, string $archetypePath, int $sortOrder): bool
{
    if ($cards === []) {
        return false;
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'REPLACE INTO mtg_decks (deck_id, name, pilot, event, url, format, archetype_name, archetype_path, sort_order, fetched_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        )->execute([
            $deck['deckId'],
            $deck['name'],
            $deck['pilot'],
            $deck['event'],
            $deck['url'],
            $format,
            $archetypeName,
            $archetypePath,
            $sortOrder,
        ]);

        $pdo->prepare('DELETE FROM mtg_deck_cards WHERE deck_id = ?')->execute([$deck['deckId']]);

        $insert = $pdo->prepare(
            'INSERT INTO mtg_deck_cards (deck_id, section, name, count, sort_order) VALUES (?, ?, ?, ?, ?)'
        );
        foreach ($cards as $i => $card) {
            $insert->execute([$deck['deckId'], $card['section'], $card['name'], $card['count'], $i]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    return true;
}

// Already-imported decks are skipped without spending a credit on them - a
// published tournament deck's card list never changes, and the free tier is
// 200 calls a month. This is what makes re-running the import cheap.
function deck_already_imported(PDO $pdo, string $deckId): bool
{
    $stmt = $pdo->prepare('SELECT 1 FROM mtg_decks WHERE deck_id = ?');
    $stmt->execute([$deckId]);

    return (bool) $stmt->fetchColumn();
}
