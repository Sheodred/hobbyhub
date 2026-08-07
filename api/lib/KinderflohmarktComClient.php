<?php
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/ScrapeHtml.php';

// kinderflohmarkt.com has no public API, but every event on its Dortmund
// listing page ships its own schema.org Event JSON-LD block - far more
// stable to parse than the surrounding HTML/CSS.
class KinderflohmarktComClient
{
    public function fetchLatest(): array
    {
        return scrape_html(KINDERFLOHMARKT_COM_URL, 'http_get_html', function (DOMXPath $xpath) {
            $scripts = $xpath->query('//script[@type="application/ld+json"]');

            $items = [];
            foreach ($scripts as $script) {
                $data = json_decode($script->textContent, true);
                if (!is_array($data) || ($data['@type'] ?? null) !== 'Event') {
                    continue;
                }

                $name = trim($data['name'] ?? '');
                $startDate = $data['startDate'] ?? null;
                $location = trim($data['location']['name'] ?? '');
                $url = $data['url'] ?? null;
                if ($name === '' || $startDate === null || $url === null) {
                    continue;
                }

                $items[] = ['name' => $name, 'startDate' => $startDate, 'location' => $location, 'url' => $url];
            }
            return $items;
        }, [], 'kinderflohmarkt.com Dortmund flea markets');
    }
}
