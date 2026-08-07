<?php
require_once __DIR__ . '/db.php';

// Cache-aside: read-through on a keyed table shaped (keyColumn, response_json,
// expires_at), matching scryfall_cache and commander_spellbook_cache.
// $table/$keyColumn are interpolated into SQL directly - only ever call this
// with hardcoded literals, never with user input.
function cache_aside(string $table, string $keyColumn, string $key, int $ttlSeconds, callable $fetch)
{
    $pdo = db();

    $stmt = $pdo->prepare("SELECT response_json FROM $table WHERE $keyColumn = ? AND expires_at > NOW()");
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if ($row) {
        return json_decode($row['response_json'], true);
    }

    $result = $fetch();

    $stmt = $pdo->prepare(
        "REPLACE INTO $table ($keyColumn, response_json, expires_at) " .
        'VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))'
    );
    $stmt->execute([$key, json_encode($result), $ttlSeconds]);

    return $result;
}
