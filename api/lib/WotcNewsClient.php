<?php
require_once __DIR__ . '/http_client.php';

// WotC discontinued their news RSS feed and there's no public news API, so
// this scrapes magic.wizards.com/en/news for article title + link only.
// Explicitly a "may break" integration: catches its own failures (network
// or DOM parsing) and returns an empty array on ANY problem, same as when
// the selector simply matches nothing - the caller (cron/refresh_news.php)
// substitutes the manual wotc_news_fallback table whenever this comes back
// empty, so the panel never just goes blank.
class WotcNewsClient
{
    private const MAX_ITEMS = 5;

    public function fetchLatest(): array
    {
        try {
            $html = http_get_html(WOTC_NEWS_URL);
            if ($html === null) {
                return [];
            }

            $doc = new DOMDocument();
            libxml_use_internal_errors(true); // real-world HTML trips DOMDocument's stricter parser otherwise
            $doc->loadHTML($html);
            libxml_use_internal_errors(false);

            $xpath = new DOMXPath($doc);
            // Article title links carry data-link-type="forced-server" and an
            // href starting with /en/news/ with a further path segment; the
            // category links (e.g. "Announcements") lack that attribute
            // entirely and point at a one-segment path, so they're excluded
            // without any extra filtering needed.
            $links = $xpath->query('//a[@data-link-type="forced-server" and starts-with(@href, "/en/news/")]');

            $items = [];
            foreach ($links as $link) {
                $headline = trim($link->textContent);
                if ($headline === '') {
                    continue;
                }
                $href = $link->getAttribute('href');
                $url = str_starts_with($href, 'http') ? $href : 'https://magic.wizards.com' . $href;
                $items[$url] = ['headline' => $headline, 'teaser' => $this->fetchTeaser($url), 'url' => $url, 'publishedAt' => null];
                if (count($items) >= self::MAX_ITEMS) {
                    break;
                }
            }
            return array_values($items);
        } catch (Throwable $e) {
            error_log('WotC news scrape failed: ' . $e->getMessage());
            return [];
        }
    }

    // The listing page has no summary text, only title + link - each
    // article page carries one in its <meta name="description"> tag
    // (verified: a single human-written sentence, same length/shape as
    // Tagesschau's firstSentence teaser). A per-article failure here must
    // not drop the headline/link the caller already has, so it's caught
    // and degrades to null rather than propagating.
    private function fetchTeaser(string $articleUrl): ?string
    {
        try {
            $html = http_get_html($articleUrl);
            if ($html === null) {
                return null;
            }

            $doc = new DOMDocument();
            libxml_use_internal_errors(true);
            $doc->loadHTML($html);
            libxml_use_internal_errors(false);

            $xpath = new DOMXPath($doc);
            $node = $xpath->query('//meta[@name="description"]/@content')->item(0);
            $teaser = $node !== null ? trim($node->textContent) : '';
            return $teaser !== '' ? $teaser : null;
        } catch (Throwable $e) {
            error_log("WotC article teaser fetch failed for $articleUrl: " . $e->getMessage());
            return null;
        }
    }
}
