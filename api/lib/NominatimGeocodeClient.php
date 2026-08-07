<?php
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';

// Nominatim (OpenStreetMap) geocoding, cache-aside via geocode_cache. Flea
// market venue names repeat week over week, so once a venue's coordinates
// are cached they're reused indefinitely (no TTL - addresses don't move).
// Nominatim's usage policy caps public API use at 1 req/sec and requires an
// identifying User-Agent; the sleep only fires on a cache miss, which after
// the first run is rare (the same handful of Dortmund venues repeat).
class NominatimGeocodeClient
{
    private const CACHE_TTL_SECONDS = 365 * 24 * 60 * 60;

    /** @var callable */
    private $httpGetJson;

    public function __construct(?callable $httpGetJson = null)
    {
        $this->httpGetJson = $httpGetJson ?? 'http_get_json';
    }

    /** @return array{latitude: float, longitude: float}|null */
    public function geocode(string $location): ?array
    {
        $location = trim($location);
        if ($location === '') {
            return null;
        }

        return cache_aside('geocode_cache', 'location_key', strtolower($location), self::CACHE_TTL_SECONDS, function () use ($location) {
            // Both flea market sources only ever list Dortmund-area events
            // (see KinderflohmarktComClient/KinderbasarOnlineClient) - the
            // venue text alone is often just a place name, so anchoring the
            // query to the city keeps ambiguous names from resolving
            // somewhere else entirely.
            $url = NOMINATIM_BASE_URL . '/search?' . http_build_query([
                'q' => $location . ', Dortmund, Germany',
                'format' => 'json',
                'limit' => 1,
            ]);
            $results = ($this->httpGetJson)($url, 10, ['User-Agent: ' . SCRYFALL_USER_AGENT]);
            usleep(1_000_000);

            if (empty($results[0]['lat']) || empty($results[0]['lon'])) {
                return null;
            }
            return ['latitude' => (float) $results[0]['lat'], 'longitude' => (float) $results[0]['lon']];
        });
    }
}
