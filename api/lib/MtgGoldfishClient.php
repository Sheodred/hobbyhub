<?php
require_once __DIR__ . '/http_client.php';

// MTGGoldfish has no official metagame API - explicitly a "may break"
// integration, same spirit as WotcNewsClient. Their robots.txt (checked
// during planning) allows general crawling/reference use and only
// restricts AI-training, which this isn't. Catches its own failures and
// returns an empty array on any problem - this intentionally lets
// cron/refresh_mtg_meta.php replace the cache with "no data" rather than
// preserving a stale one, matching the original Java client's behavior.
class MtgGoldfishClient
{
    private const MAX_ITEMS = 3;

    public function standardDecks(): array
    {
        return $this->scrape(MTGGOLDFISH_STANDARD_URL);
    }

    public function commanderDecks(): array
    {
        return $this->scrape(MTGGOLDFISH_COMMANDER_URL);
    }

    private function scrape(string $url): array
    {
        try {
            $html = http_get_html($url);
            if ($html === null) {
                return [];
            }

            $doc = new DOMDocument();
            libxml_use_internal_errors(true);
            $doc->loadHTML($html);
            libxml_use_internal_errors(false);

            $xpath = new DOMXPath($doc);
            // Each archetype tile links twice (#online and #paper anchors on
            // the same /archetype/{slug} path) - keeping only #paper avoids
            // double-counting while picking the more universally recognized
            // paper-metagame view.
            $links = $xpath->query('//a[contains(@href, "/archetype/") and contains(@href, "#paper")]');

            $items = [];
            foreach ($links as $link) {
                $name = trim($link->textContent);
                if ($name === '') {
                    continue;
                }
                $href = explode('#', $link->getAttribute('href'))[0];
                $absoluteUrl = str_starts_with($href, 'http') ? $href : 'https://www.mtggoldfish.com' . $href;
                $items[$absoluteUrl] = ['name' => $name, 'url' => $absoluteUrl, 'numDecks' => null];
                if (count($items) >= self::MAX_ITEMS) {
                    break;
                }
            }
            return array_values($items);
        } catch (Throwable $e) {
            error_log("MTGGoldfish scrape failed for $url: " . $e->getMessage());
            return [];
        }
    }
}
