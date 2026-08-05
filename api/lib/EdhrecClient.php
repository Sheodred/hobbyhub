<?php
require_once __DIR__ . '/http_client.php';

// EDHREC's open, key-free JSON API (json.edhrec.com) - the same data source
// that powers edhrec.com's own pages. Used for two of the four MTG Meta &
// Stats widgets: most-played cards and popular Commander decks.
class EdhrecClient
{
    private const MAX_ITEMS = 3;

    public function mostPlayedCards(): array
    {
        return $this->fetch('/pages/top/week.json');
    }

    public function popularCommanderDecks(): array
    {
        return $this->fetch('/pages/commanders/week.json');
    }

    private function fetch(string $path): array
    {
        $json = http_get_json(EDHREC_JSON_BASE_URL . $path);
        if ($json === null) {
            // A genuine request failure - propagate so the caller can keep
            // the existing cache (see cron/refresh_mtg_meta.php).
            throw new RuntimeException("EDHREC request failed: $path");
        }

        $cardviews = $json['container']['json_dict']['cardlists'][0]['cardviews'] ?? [];
        $items = [];
        foreach (array_slice($cardviews, 0, self::MAX_ITEMS) as $view) {
            $items[] = [
                'name' => $view['name'] ?? '',
                'url' => 'https://edhrec.com' . ($view['url'] ?? ''),
                'numDecks' => $view['num_decks'] ?? null,
            ];
        }
        return $items;
    }
}
