<?php
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/ScrapeHtml.php';

// kinderbasar-online.de has no JSON-LD per event, only styled HTML cards -
// date/time/location are read from the card's meta rows by position, with a
// regex for the date/time since the visible text is German-formatted
// ("Samstag, 08.08.2026" / "von 09:00 bis 14:00 Uhr").
class KinderbasarOnlineClient
{
    private const BASE_URL = 'https://www.kinderbasar-online.de';

    public function fetchLatest(): array
    {
        return scrape_html(KINDERBASAR_ONLINE_URL, 'http_get_html', function (DOMXPath $xpath) {
            $cards = $xpath->query('//article[contains(concat(" ", normalize-space(@class), " "), " event-card ")]');

            $items = [];
            foreach ($cards as $card) {
                $titleLink = $xpath->query('.//a[contains(concat(" ", normalize-space(@class), " "), " event-title ")]', $card)->item(0);
                $metaRows = $xpath->query('.//p[contains(concat(" ", normalize-space(@class), " "), " meta-row ")]', $card);
                if ($titleLink === null || $metaRows->length < 3) {
                    continue;
                }

                $name = trim($titleLink->getAttribute('title')) ?: trim($titleLink->textContent);
                $dateText = trim($metaRows->item(0)->textContent);
                $timeText = trim($metaRows->item(1)->textContent);
                $location = trim($metaRows->item(2)->textContent);

                if ($name === '' || !preg_match('/(\d{2})\.(\d{2})\.(\d{4})/', $dateText, $dateMatch)) {
                    continue;
                }
                $time = preg_match('/(\d{2}:\d{2})/', $timeText, $timeMatch) ? $timeMatch[1] : '00:00';
                $startDate = "{$dateMatch[3]}-{$dateMatch[2]}-{$dateMatch[1]}T{$time}:00";

                $href = $titleLink->getAttribute('href');
                $url = str_starts_with($href, 'http') ? $href : self::BASE_URL . $href;

                $items[] = ['name' => $name, 'startDate' => $startDate, 'location' => $location, 'url' => $url];
            }
            return $items;
        }, [], 'kinderbasar-online.de Dortmund flea markets');
    }
}
