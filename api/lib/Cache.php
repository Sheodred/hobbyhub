<?php
require_once __DIR__ . '/db.php';

// Cache-aside: read-through on a keyed table shaped (keyColumn, response_json,
// expires_at), matching scryfall_cache and commander_spellbook_cache.
// $table/$keyColumn are interpolated into SQL directly - only ever call this
// with hardcoded literals, never with user input.
// $missTtlSeconds opts a caller into caching an answer of null - "the source
// answered, and has nothing for this key". Leave it out and a null is not
// cached at all, which is what every caller did before #72. Callers that pass
// it must throw on a failed call rather than returning null, or an outage gets
// stored as "nothing here" for the whole TTL.
function cache_aside(
    string $table,
    string $keyColumn,
    string $key,
    int $ttlSeconds,
    callable $fetch,
    ?int $missTtlSeconds = null
) {
    $pdo = db();

    $stmt = $pdo->prepare("SELECT response_json FROM $table WHERE $keyColumn = ? AND expires_at > NOW()");
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if ($row) {
        return json_decode($row['response_json'], true);
    }

    $result = $fetch();

    // A transient outage must not pin a wrong answer for the full TTL, which
    // at BGG's 14 days would be two weeks (docs/adr/0011). Callers that have
    // not opted in signal a failure with null, so their nulls stay uncached.
    // For callers that did opt in, a failure throws instead, and this null is
    // the source saying "nothing for this key" - worth remembering, because
    // re-asking on every request is what made an uncovered game cost a full
    // remote lookup, throttle included, every single time (#72).
    if ($result === null) {
        if ($missTtlSeconds === null) {
            return null;
        }
        $ttlSeconds = $missTtlSeconds;
    }

    $stmt = $pdo->prepare(
        "REPLACE INTO $table ($keyColumn, response_json, expires_at) " .
        'VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))'
    );
    $stmt->execute([$key, json_encode($result), $ttlSeconds]);

    return $result;
}
