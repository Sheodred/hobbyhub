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

    // Since #72 "no listing for this game" is cached, so a failed fetch has to
    // be told apart from an answered one.
    public function testThrowsWhenTheFetchFails(): void
    {
        $this->expectException(RuntimeException::class);

        (new AmazonRatingClient(fn() => null))->ratingFor('Catan');
    }

    public function testRemembersAGameWithNoMatchingListing(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            return $this->searchHtml(); // Catan listings, nothing for Wingspan
        };

        $this->assertNull((new AmazonRatingClient($fetch))->ratingFor('Wingspan'));
        $this->assertNull((new AmazonRatingClient($fetch))->ratingFor('Wingspan'));

        $this->assertSame(1, $calls, 'a repeat ask is a full round trip behind a 2s throttle (#72)');
    }

    // amazon.de serves its anti-bot interstitial with a 200, so "no listing
    // found" and "we were blocked" arrive looking identical. Remembering the
    // second as the first would hide every game's rating for the miss TTL and
    // would not self-heal when the block lifts.
    public function testRefusesToRememberAMissFromAPageThatIsNotASearchResultPage(): void
    {
        $captcha = '<html><body><h4>Geben Sie die Zeichen unten ein</h4></body></html>';

        try {
            (new AmazonRatingClient(fn() => $captcha))->ratingFor('Catan');
            $this->fail('a block page is not an answer about this game');
        } catch (RuntimeException $e) {
            // expected
        }

        $this->assertSame(
            0,
            (int) db()->query("SELECT COUNT(*) FROM amazon_rating_cache WHERE query_key = 'catan'")->fetchColumn()
        );
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
        try {
            (new AmazonRatingClient(fn() => null))->ratingFor('Catan');
        } catch (RuntimeException $e) {
            // The point of this test is what is left behind, not the throw.
        }

        $this->assertSame(
            0,
            (int) db()->query("SELECT COUNT(*) FROM amazon_rating_cache WHERE query_key = 'catan'")->fetchColumn()
        );
    }

    // #90: real amazon.de markup, a struck-through UVP list price ahead of
    // the actual selling price - data-a-color is what tells them apart, not
    // position, since a discounted listing shows the UVP first.
    private function priceBlock(string $title, ?string $price = null, ?string $uvp = null, bool $withRating = true): string
    {
        $strike = $uvp === null ? '' : '<span class="a-offscreen">UVP: ' . $uvp
            . "\u{00A0}€</span><span class=\"a-price a-text-price\" data-a-size=\"b\" data-a-color=\"secondary\">"
            . '<span class="a-offscreen">' . $uvp . "\u{00A0}€</span></span>";
        $rating = $withRating ? '<span>4,7 von 5 Sternen</span><a aria-label="257 Bewertungen"><span>257</span></a>' : '';
        $priceSpan = $price === null ? '' : '<span class="a-price" data-a-size="xl" data-a-color="base">'
            . '<span class="a-offscreen">' . $price . "\u{00A0}€</span></span>";

        return '<div data-asin="B0PRICE001" data-component-type="s-search-result" class="s-result-item sg-col">'
            . '<h2 aria-label="' . $title . '"><span>' . $title . '</span></h2>'
            . $rating
            . $strike
            . $priceSpan
            . '</div>';
    }

    public function testReadsThePriceFromTheSameBlockAsTheRating(): void
    {
        $client = new AmazonRatingClient(fn() => $this->priceBlock('KOSMOS Catan - Das Spiel', '22,90'));

        $this->assertSame(22.9, $client->priceFor('Catan')['price']);
        $this->assertSame('EUR', $client->priceFor('Catan')['currency']);
    }

    public function testNeverReadsTheStruckThroughUvpAsThePrice(): void
    {
        $client = new AmazonRatingClient(fn() => $this->priceBlock('KOSMOS Catan - Das Spiel', '22,90', '36,99'));

        $this->assertSame(22.9, $client->priceFor('Catan')['price']);
    }

    // amazon.de's non-breaking space (U+00A0) between the number and the
    // euro sign is not matched by plain \s - a regression here silently
    // drops every real price while a same-shape fixture using an ordinary
    // space would still pass.
    public function testHandlesTheNonBreakingSpaceBeforeTheEuroSign(): void
    {
        $client = new AmazonRatingClient(fn() => $this->priceBlock('Catan', '19,99'));

        $this->assertSame(19.99, $client->priceFor('Catan')['price']);
    }

    public function testPriceForReturnsNullWhenNoBlockHasAPrice(): void
    {
        // Rating markup only, no a-price span anywhere - the everyday
        // fixture already used by the rating tests.
        $client = new AmazonRatingClient(fn() => $this->searchHtml());

        $this->assertNull($client->priceFor('Catan'));
    }

    // A brand-new listing can have a price with no reviews yet. ratingFor()
    // must keep walking past it rather than stopping on the first title
    // match, since the whole point of #90 is that price and rating are
    // independent facts on independent blocks.
    public function testRatingForSkipsAPriceOnlyBlockAndKeepsLookingForARating(): void
    {
        $html = $this->priceBlock('Catan New Listing', '19,99', null, withRating: false)
            . $this->priceBlock('Catan Standard Edition', '22,90');

        $client = new AmazonRatingClient(fn() => $html);

        $this->assertSame(4.7, $client->ratingFor('Catan')['rating']);
    }

    public function testPriceForSkipsARatingOnlyBlockAndKeepsLookingForAPrice(): void
    {
        $html = $this->priceBlock('Catan Rated Only', null)
            . $this->priceBlock('Catan Standard Edition', '22,90');

        $client = new AmazonRatingClient(fn() => $html);

        $this->assertSame(22.9, $client->priceFor('Catan')['price']);
    }

    public function testPriceForSkipsSponsoredResultsEvenWhenTheirTitleMatches(): void
    {
        $sponsored = '<div data-asin="B0SPONSOR2" data-component-type="s-search-result" class="s-result-item AdHolder sg-col">'
            . '<h2 aria-label="Gesponserte Anzeige"><span>Catan Sponsored</span></h2>'
            . '<span class="a-price" data-a-size="xl" data-a-color="base"><span class="a-offscreen">1,00' . "\u{00A0}"
            . '€</span></span></div>' . $this->priceBlock('Catan Real Listing', '22,90');

        $client = new AmazonRatingClient(fn() => $sponsored);

        $this->assertSame(22.9, $client->priceFor('Catan')['price']);
    }
}
