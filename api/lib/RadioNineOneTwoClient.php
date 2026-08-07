<?php
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/ScrapeHtml.php';

// radio912.de has no public news API/feed, so this scrapes the Dortmund news
// listing page for headline + teaser + link, same "may break" pattern as
// WotcNewsClient: any network or DOM failure degrades to an empty array
// rather than propagating, so the cron job just keeps the existing cache.
class RadioNineOneTwoClient
{
    private const MAX_ITEMS = 5;
    private const BASE_URL = 'https://www.radio912.de';

    public function fetchLatest(): array
    {
        return scrape_html(RADIO912_NEWS_URL, 'http_get_html', function (DOMXPath $xpath) {
            $articles = $xpath->query('//article[contains(concat(" ", normalize-space(@class), " "), " article-card ")]');

            $items = [];
            foreach ($articles as $article) {
                $link = $xpath->query('.//a[starts-with(@href, "/artikel/")]', $article)->item(0);
                $headlineNode = $xpath->query('.//span[contains(concat(" ", normalize-space(@class), " "), " article-headline ")]', $article)->item(0);
                if ($link === null || $headlineNode === null) {
                    continue;
                }

                $headline = trim($headlineNode->textContent);
                if ($headline === '') {
                    continue;
                }

                $teaserSpans = $xpath->query('.//p[contains(concat(" ", normalize-space(@class), " "), " line-clamp-5 ")]/span', $article);
                $teaserNode = $teaserSpans->length > 0 ? $teaserSpans->item($teaserSpans->length - 1) : null;
                $teaser = $teaserNode !== null ? trim($teaserNode->textContent) : null;

                $url = self::BASE_URL . $link->getAttribute('href');
                $items[$url] = ['headline' => $headline, 'teaser' => $teaser !== '' ? $teaser : null, 'url' => $url, 'publishedAt' => null];
                if (count($items) >= self::MAX_ITEMS) {
                    break;
                }
            }
            return array_values($items);
        }, [], 'radio912 Dortmund news');
    }
}
