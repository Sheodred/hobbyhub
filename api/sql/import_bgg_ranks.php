<?php
// One-off CLI importer for BGG's published boardgames_ranks.csv export.
//
//   php api/sql/import_bgg_ranks.php path/to/boardgames_ranks.csv
//
// Fills bgg_ranks, which BggClient falls back to while the live XML API is
// unavailable (#40). Re-runnable: rows are REPLACEd, so importing a newer
// dump over an older one just updates it. The CSV itself is deliberately
// NOT stored in this repo - it is BGG's data, not ours.
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/db.php';

$path = $argv[1] ?? '';
if ($path === '' || !is_readable($path)) {
    fwrite(STDERR, "usage: php import_bgg_ranks.php <boardgames_ranks.csv>\n");
    exit(1);
}

$handle = fopen($path, 'r');
$header = fgetcsv($handle);
if ($header === false) {
    fwrite(STDERR, "empty csv\n");
    exit(1);
}
// Index by column name rather than position - BGG has added category rank
// columns to this export before, and will again.
$col = array_flip($header);
foreach (['id', 'name', 'yearpublished', 'rank', 'average', 'usersrated', 'is_expansion'] as $required) {
    if (!isset($col[$required])) {
        fwrite(STDERR, "csv is missing the '$required' column\n");
        exit(1);
    }
}

$pdo = db();
$pdo->beginTransaction();
$stmt = $pdo->prepare(
    'REPLACE INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);

$imported = 0;
$skipped = 0;
while (($row = fgetcsv($handle)) !== false) {
    $id = (int) ($row[$col['id']] ?? 0);
    $name = trim((string) ($row[$col['name']] ?? ''));
    if ($id <= 0 || $name === '') {
        $skipped++;
        continue;
    }
    $stmt->execute([
        $id,
        mb_substr($name, 0, 255),
        ($row[$col['yearpublished']] ?? '') === '' ? null : (int) $row[$col['yearpublished']],
        ($row[$col['average']] ?? '') === '' ? null : (float) $row[$col['average']],
        ($row[$col['usersrated']] ?? '') === '' ? null : (int) $row[$col['usersrated']],
        (int) ($row[$col['is_expansion']] ?? 0),
        // The export writes 0 for every game BGG doesn't rank - four fifths
        // of the file. Storing that verbatim would let "rank 0" reach the
        // page as if it were a position.
        ((int) ($row[$col['rank']] ?? 0)) ?: null,
    ]);
    $imported++;
}
$pdo->commit();
fclose($handle);

echo "imported $imported rows, skipped $skipped\n";
