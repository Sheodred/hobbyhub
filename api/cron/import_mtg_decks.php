<?php
// CLI importer for MTGGoldfish decks, via parse.bot's wrapper.
//
//   php api/cron/import_mtg_decks.php <format> [archetypes] [decks-per-archetype]
//   php api/cron/import_mtg_decks.php standard 5 3
//
// NOT a WebCron target, unlike the other two cron scripts: every call costs a
// credit against a 200/month budget, so this only ever runs when a human
// decides to spend them. A full run costs 1 + archetypes + (archetypes x
// decks) calls - the defaults below are 1 + 5 + 15 = 21.
//
// Re-runnable and cheap to re-run: decks already in the database are skipped
// without a call, so a second run only fetches what is genuinely new.
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/DeckImport.php';
require_once __DIR__ . '/../lib/ParseBotMtgGoldfishClient.php';

$format = $argv[1] ?? '';
$maxArchetypes = (int) ($argv[2] ?? 5);
$maxDecksPerArchetype = (int) ($argv[3] ?? 3);

if ($format === '') {
    fwrite(STDERR, "usage: php import_mtg_decks.php <format> [archetypes] [decks-per-archetype]\n");
    exit(1);
}

if (PARSE_BOT_API_KEY === '') {
    fwrite(STDERR, "PARSE_BOT_API_KEY is empty - set it in config.local.php first\n");
    exit(1);
}

$pdo = db();
$client = new ParseBotMtgGoldfishClient();
$calls = 0;

$archetypes = $client->metagame($format);
$calls++;
if ($archetypes === null) {
    fwrite(STDERR, "get_metagame failed for format '$format' - nothing imported\n");
    exit(1);
}

$importedDecks = 0;
foreach (array_slice($archetypes, 0, $maxArchetypes) as $archetype) {
    $decks = $client->archetypeDecks($archetype['path']);
    $calls++;
    if ($decks === null) {
        fwrite(STDERR, "get_archetype_decks failed for {$archetype['path']} - skipping\n");
        continue;
    }

    $sortOrder = 0;
    foreach (array_slice($decks, 0, $maxDecksPerArchetype) as $deck) {
        if (deck_already_imported($pdo, $deck['deckId'])) {
            echo "skip {$deck['deckId']} (already imported)\n";
            $sortOrder++;
            continue;
        }

        $full = $client->deck($deck['deckId']);
        $calls++;
        if ($full === null) {
            fwrite(STDERR, "get_deck failed for {$deck['deckId']} - skipping\n");
            continue;
        }

        if (store_deck($pdo, $deck, $full['cards'], $format, $archetype['name'], $archetype['path'], $sortOrder)) {
            $importedDecks++;
            echo "imported {$deck['deckId']} ({$deck['name']}, " . count($full['cards']) . " cards)\n";
        } else {
            fwrite(STDERR, "deck {$deck['deckId']} came back with no cards - not stored\n");
        }
        $sortOrder++;
    }
}

echo "done: $importedDecks decks imported, $calls API calls spent\n";
