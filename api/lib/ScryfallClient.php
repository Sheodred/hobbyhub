<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/Throttle.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';

// Live proxy to Scryfall (docs/adr/0003 in the pre-migration history) -
// keeps Scryfall's full search query syntax (colors, types, operators)
// rather than replacing it with a local search index, per explicit
// decision. Cache-aside via scryfall_cache (5 min TTL, matches the old
// Caffeine cache) plus a best-effort ~100ms throttle between outbound
// calls, matching Scryfall's API guidelines - not a perfectly atomic
// lock under heavy concurrency, which this hobby-scale project doesn't need.
class ScryfallClient
{
    private const CACHE_TTL_SECONDS = 300;
    private const THROTTLE_MIN_INTERVAL_MS = 100;

    /** @var callable */
    private $httpGetJson;

    // Injectable HTTP fetch, defaulting to the real network call - lets
    // tests substitute a canned response instead of hitting Scryfall for
    // real, the same DI-seam lesson the RestClientCustomizer bean taught
    // in the pre-migration Java version (see docs/project-history.md).
    public function __construct(?callable $httpGetJson = null)
    {
        $this->httpGetJson = $httpGetJson ?? 'http_get_json';
    }

    public function search(string $query, int $page): array
    {
        return $this->cached('search:' . $query . ':' . $page, function () use ($query, $page) {
            $data = $this->request('/cards/search?' . http_build_query(['q' => $query, 'page' => $page]));
            if ($data === null) {
                // Scryfall's documented response for "no cards match this query".
                return ['cards' => [], 'hasMore' => false, 'totalCards' => 0];
            }
            return [
                'cards' => array_map([$this, 'mapCard'], $data['data'] ?? []),
                'hasMore' => $data['has_more'] ?? false,
                'totalCards' => $data['total_cards'] ?? 0,
            ];
        });
    }

    public function getCard(string $id): ?array
    {
        return $this->cached('card:' . $id, function () use ($id) {
            $data = $this->request('/cards/' . rawurlencode($id));
            return $data === null ? null : $this->mapCard($data);
        });
    }

    public function getCardByName(string $name): ?array
    {
        return $this->cached('by-name:' . $name, function () use ($name) {
            $data = $this->request('/cards/named?' . http_build_query(['exact' => $name]));
            return $data === null ? null : $this->mapCard($data);
        });
    }

    public function getPrintings(string $name): array
    {
        return $this->cached('printings:' . $name, function () use ($name) {
            // Exact-name match (!"...") plus unique=prints so every printing
            // comes back instead of Scryfall deduplicating to the newest one.
            $query = '!"' . $name . '"';
            $data = $this->request('/cards/search?' . http_build_query([
                'q' => $query,
                'unique' => 'prints',
                'order' => 'released',
                'dir' => 'desc',
            ]));
            return $data === null ? [] : array_map([$this, 'mapCard'], $data['data'] ?? []);
        });
    }

    private function mapCard(array $c): array
    {
        $imageUris = $c['image_uris'] ?? ($c['card_faces'][0]['image_uris'] ?? null);
        return [
            'id' => $c['id'] ?? null,
            'name' => $c['name'] ?? null,
            // A double-faced card carries "" at the top level and the real
            // cost on its front face, so ?? never fires here the way it does
            // for oracle_text below - it takes an emptiness check (#34).
            'manaCost' => ($c['mana_cost'] ?? '') ?: ($c['card_faces'][0]['mana_cost'] ?? null),
            'typeLine' => $c['type_line'] ?? null,
            'oracleText' => $c['oracle_text'] ?? ($c['card_faces'][0]['oracle_text'] ?? null),
            'colors' => $c['colors'] ?? null,
            'setName' => $c['set_name'] ?? null,
            'rarity' => $c['rarity'] ?? null,
            'imageUrl' => $imageUris['normal'] ?? null,
            'artCropUrl' => $imageUris['art_crop'] ?? null,
            'layout' => $c['layout'] ?? null,
            // Only transform/modal_dfc faces carry their own image_uris; on a
            // split or adventure card the single image lives at the top level
            // and every face's imageUrl is null (#34).
            'faces' => isset($c['card_faces']) ? array_map(fn(array $f) => [
                'name' => $f['name'] ?? null,
                'manaCost' => $f['mana_cost'] ?? null,
                'typeLine' => $f['type_line'] ?? null,
                'oracleText' => $f['oracle_text'] ?? null,
                'imageUrl' => $f['image_uris']['normal'] ?? null,
            ], $c['card_faces']) : null,
        ];
    }

    private function cached(string $key, callable $fetch)
    {
        return cache_aside('scryfall_cache', 'cache_key', $key, self::CACHE_TTL_SECONDS, $fetch);
    }

    private function request(string $path): ?array
    {
        $this->throttle();
        return ($this->httpGetJson)(SCRYFALL_BASE_URL . $path, 10, ['User-Agent: ' . SCRYFALL_USER_AGENT]);
    }

    private function throttle(): void
    {
        throttle('scryfall_throttle', self::THROTTLE_MIN_INTERVAL_MS);
    }
}
