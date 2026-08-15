<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/AmazonRatingClient.php';

final class AmazonRatingClientTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM amazon_rating_cache');
    }

    // Mirrors the real amazon.de search markup: results are separated by the
    // s-search-result marker, sponsored ones carry AdHolder on the class that
    // follows it, and the rating lives in the same block as the title.
    private function searchHtml(): string
    {
        return '<html><body>'
            . '<div data-asin="B0SPONSOR1" data-component-type="s-search-result" class="s-result-item AdHolder sg-col">'
            . '<h2 aria-label="Gesponserte Anzeige – Catan Deluxe"><span>Catan Deluxe Sponsored Edition</span></h2>'
            . '<span>9,9 von 5 Sternen</span><a aria-label="99.999 Bewertungen"><span>99.999</span></a>'
            . '</div>'
            . '<div data-asin="B0UNRELAT1" data-component-type="s-search-result" class="s-result-item sg-col">'
            . '<h2 aria-label="Stadt Land Vollpfosten"><span>Stadt Land Vollpfosten Brettspiel</span></h2>'
            . '<span>4,7 von 5 Sternen</span><a aria-label="1.234 Bewertungen"><span>1.234</span></a>'
            . '</div>'
            . '<div data-asin="B00CATAN01" data-component-type="s-search-result" class="s-result-item sg-col">'
            . '<h2 aria-label="KOSMOS Catan"><span>KOSMOS Catan - Das Spiel, Basisspiel</span></h2>'
            . '<span>4,7 von 5 Sternen</span><a aria-label="257 Bewertungen"><span>257</span></a>'
            . '</div>'
            . '</body></html>';
    }

    public function testPicksTheFirstNonSponsoredResultMatchingTheGameName(): void
    {
        $client = new AmazonRatingClient(fn() => $this->searchHtml());

        $result = $client->ratingFor('Catan');

        $this->assertSame(4.7, $result['rating']);
        $this->assertSame(257, $result['count']);
        $this->assertSame('KOSMOS Catan - Das Spiel, Basisspiel', $result['title']);
        $this->assertSame('https://www.amazon.de/dp/B00CATAN01', $result['url']);
    }

    public function testSkipsSponsoredResultsEvenWhenTheirTitleMatches(): void
    {
        $client = new AmazonRatingClient(fn() => $this->searchHtml());

        // The sponsored block names Catan and carries a 9,9 rating. Taking it
        // would show an advert's number as if it were the game's rating.
        $this->assertNotSame(9.9, $client->ratingFor('Catan')['rating']);
    }

    public function testReturnsNullWhenNoResultTitleMatchesTheGame(): void
    {
        $client = new AmazonRatingClient(fn() => $this->searchHtml());

        $this->assertNull($client->ratingFor('Wingspan'));
    }

    public function testReturnsNullWhenTheFetchFails(): void
    {
        $client = new AmazonRatingClient(fn() => null);

        $this->assertNull($client->ratingFor('Catan'));
    }

    public function testResultIsCachedAndNotRefetched(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            return $this->searchHtml();
        };

        (new AmazonRatingClient($fetch))->ratingFor('Catan');
        (new AmazonRatingClient($fetch))->ratingFor('  CATAN ');

        $this->assertSame(1, $calls, 'repeat lookups of the same game must be served from amazon_rating_cache');
    }

    public function testAFailedFetchIsNotCached(): void
    {
        (new AmazonRatingClient(fn() => null))->ratingFor('Catan');

        $this->assertSame(
            0,
            (int) db()->query("SELECT COUNT(*) FROM amazon_rating_cache WHERE query_key = 'catan'")->fetchColumn()
        );
    }
}
