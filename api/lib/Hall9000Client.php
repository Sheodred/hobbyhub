<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/Throttle.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';
require_once __DIR__ . '/RatingSource.php';

// Reads H@LL9000's aggregate rating for a game (docs/adr/0014).
//
// Their game pages live at a predictable slug - /html/spiel/<slug> - so
// there is no search step, and therefore none of the wrong-product risk
// that made AmazonRatingClient and BoardGameQuestClient need defensive
// matching. A slug that doesn't exist simply 404s and yields null.
//
// robots.txt disallows exactly one path (/html/bewerten, the voting form),
// which this client never requests. Checked 2026-08-15.
class Hall9000Client implements RatingSource
{
    // Confirmed empirically from their own ranking page: the top entry is
    // 6,0 and the rest cluster 5,2-5,9. Their scale explanation page does
    // not state a maximum in machine-readable form.
    public const MAX_RATING = 6;

    private const CACHE_TTL_SECONDS = 14 * 24 * 60 * 60;
    private const THROTTLE_MIN_INTERVAL_MS = 1000;
    private const GAME_URL = 'https://www.hall9000.de/html/spiel/';

    /** @var callable */
    private $httpGetHtml;

    public function __construct(?callable $httpGetHtml = null)
    {
        $this->httpGetHtml = $httpGetHtml ?? 'http_get_html';
    }

    /**
     * @return array{rating:float,max:int,count:?int,players:?string,duration:?string,age:?string,url:string}|null
     */
    public function label(): string
    {
        return 'H@LL9000';
    }

    // Out of 6, which is why every Rating carries its own max.
    public function rating(string $gameName): ?array
    {
        $found = $this->ratingFor($gameName);

        return $found === null ? null : [
            'value' => $found['rating'],
            'max' => $found['max'],
            'count' => $found['count'],
            'title' => null,
            'url' => $found['url'],
        ];
    }

    public function ratingFor(string $gameName): ?array
    {
        $slug = $this->slug($gameName);
        if ($slug === '') {
            return null;
        }

        return cache_aside('hall9000_cache', 'query_key', $slug, self::CACHE_TTL_SECONDS, function () use ($slug) {
            $this->throttle();
            $html = ($this->httpGetHtml)(
                self::GAME_URL . rawurlencode($slug),
                15,
                ['Accept: text/html', 'Accept-Language: de-DE,de;q=0.9']
            );
            return $html === null ? null : $this->parse($html, $slug);
        });
    }

    /**
     * @return array{rating:float,max:int,count:?int,players:?string,duration:?string,url:string}|null
     */
    public function parse(string $html, string $slug): ?array
    {
        $text = $this->plainText($html);

        // "H@LL9000 Wertung Azul: 4,8, 17 Bewertung(en)"
        if (!preg_match('/Wertung[^:]{0,80}:\s*(\d(?:[,.]\d)?)\s*,\s*(\d+)\s*Bewertung/iu', $text, $m)) {
            return null;
        }
        $rating = (float) str_replace(',', '.', $m[1]);
        if ($rating <= 0 || $rating > self::MAX_RATING) {
            return null; // not the shape we think it is - say nothing
        }

        return [
            'rating' => $rating,
            'max' => self::MAX_RATING,
            'count' => (int) $m[2],
            'players' => $this->field($text, 'Spieler'),
            'duration' => $this->field($text, 'Dauer'),
            'age' => $this->field($text, 'Alter'),
            'url' => self::GAME_URL . $slug,
        ];
    }

    // "Spieler: 2 - 4", "Dauer: 30 - 45 Minuten", "Alter: ab 8 Jahren"
    private function field(string $text, string $label): ?string
    {
        if (!preg_match('/' . preg_quote($label, '/') . ':\s*([^:]{1,40}?)\s+(?:Dauer|Alter|Jahr|Bewertung|Verlag):/iu', $text, $m)) {
            return null;
        }
        $value = trim($m[1]);
        return $value === '' ? null : $value;
    }

    // Matches the slugs in their own RSS feeds: lowercase, every run of
    // non-alphanumerics collapsed to a single underscore.
    private function slug(string $gameName): string
    {
        $slug = mb_strtolower(trim($gameName));
        $slug = strtr($slug, ['ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss']);
        return trim(preg_replace('/[^a-z0-9]+/u', '_', $slug), '_');
    }

    private function plainText(string $html): string
    {
        $html = preg_replace('/<script.*?<\/script>/is', ' ', $html);
        return trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES)));
    }

    private function throttle(): void
    {
        throttle('hall9000_throttle', self::THROTTLE_MIN_INTERVAL_MS);
    }
}
