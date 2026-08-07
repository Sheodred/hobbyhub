<?php
require_once __DIR__ . '/NewsRefresh.php';

// Merges both scrapers' events into the news_items shape and hands off to
// replace_news(). The two sites frequently list the exact same physical
// event under slightly different names, so entries are deduplicated by
// event date + venue name - the one pair of fields both sources report
// identically - rather than by the event name text.
function refresh_flea_market_events(PDO $pdo, array $kinderflohmarktEvents, array $kinderbasarEvents): void
{
    $merged = [];
    foreach ([$kinderflohmarktEvents, $kinderbasarEvents] as $events) {
        foreach ($events as $event) {
            $key = substr($event['startDate'], 0, 10) . '|' . strtolower(trim($event['location']));
            if (!isset($merged[$key])) {
                $merged[$key] = $event;
            }
        }
    }

    usort($merged, fn(array $a, array $b) => $a['startDate'] <=> $b['startDate']);

    $items = array_map(fn(array $event) => [
        'headline' => $event['name'],
        'teaser' => $event['location'],
        'url' => $event['url'],
        'publishedAt' => $event['startDate'],
    ], $merged);

    replace_news($pdo, 'FLEAMARKET', $items);
}
