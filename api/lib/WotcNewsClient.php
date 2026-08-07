<?php
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/ScrapeHtml.php';

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
        return scrape_html(WOTC_NEWS_URL, 'http_get_html', function (DOMXPath $xpath) {
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
        }, [], 'WotC news');
    }

    // The listing page has no summary text, only title + link - each
    // article page carries one in its <meta name="description"> tag
    // (verified: a single human-written sentence, same length/shape as
    // Tagesschau's firstSentence teaser). A per-article failure here must
    // not drop the headline/link the caller already has, so it's caught
    // and degrades to null rather than propagating.
    private function fetchTeaser(string $articleUrl): ?string
    {
        return scrape_html($articleUrl, 'http_get_html', function (DOMXPath $xpath) {
            $node = $xpath->query('//meta[@name="description"]/@content')->item(0);
            $teaser = $node !== null ? trim($node->textContent) : '';
            return $teaser !== '' ? $teaser : null;
        }, null, 'WotC article teaser');
    }
}
