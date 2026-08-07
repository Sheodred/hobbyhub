<?php
require_once __DIR__ . '/NewsRefresh.php';
require_once __DIR__ . '/NominatimGeocodeClient.php';

// Merges both scrapers' events into the news_items shape and hands off to
// replace_news(). The two sites frequently list the exact same physical
// event under slightly different names, so entries are deduplicated by
// event date + venue name - the one pair of fields both sources report
// identically - rather than by the event name text.
//
// $geocode defaults to NominatimGeocodeClient::geocode; overridable so tests
// can substitute a fake instead of hitting the real geocoding service.
function refresh_flea_market_events(PDO $pdo, array $kinderflohmarktEvents, array $kinderbasarEvents, ?callable $geocode = null): void
{
    $geocode ??= [new NominatimGeocodeClient(), 'geocode'];

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

    $items = array_map(function (array $event) use ($geocode) {
        $coords = $geocode($event['location']);
        return [
            'headline' => $event['name'],
            'teaser' => $event['location'],
            'url' => $event['url'],
            'publishedAt' => $event['startDate'],
            'latitude' => $coords['latitude'] ?? null,
            'longitude' => $coords['longitude'] ?? null,
        ];
    }, $merged);

    replace_news($pdo, 'FLEAMARKET', $items);
}
