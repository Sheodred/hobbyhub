<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/AmazonRatingClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

// Exercises the assembly logic amazon.php contains, without going through
// an actual HTTP request - AmazonRatingClient itself is already tested in
// AmazonRatingClientTest.php.
final class AmazonEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgg_ranks');
        db()->exec('DELETE FROM game_aliases');
        db()->exec('DELETE FROM amazon_rating_cache');
        db()->exec("INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES (13, 'Catan', 1995, 7.1, 100, 0, 566)");
    }

    public function testReturnsBothRatingAndPriceForAKnownGame(): void
    {
        $names = (new BggClient(fn() => null))->localSearchNames(13);
        $amazon = new AmazonRatingClient(fn() => $this->searchHtml());

        $rating = first_hit($names, fn(string $n) => $amazon->rating($n));
        $price = first_hit($names, fn(string $n) => $amazon->priceFor($n));

        $this->assertNotNull($rating);
        $this->assertNotNull($price);
        $this->assertSame(22.90, $price['price']);
    }

    public function testReturnsNullForBothWhenNothingMatches(): void
    {
        $names = (new BggClient(fn() => null))->localSearchNames(13);
        // A real search-result page (has the s-search-result marker, so it
        // isn't mistaken for a block page) that simply has nothing for Catan.
        $amazon = new AmazonRatingClient(fn() => '<div data-asin="B0OTHER001" data-component-type="s-search-result" class="s-result-item sg-col">'
            . '<h2><span>Wingspan Deluxe Edition</span></h2>'
            . '<span>4,8 von 5 Sternen</span><a aria-label="500 Bewertungen"><span>500</span></a>'
            . '</div>');

        $rating = first_hit($names, fn(string $n) => $amazon->rating($n));
        $price = first_hit($names, fn(string $n) => $amazon->priceFor($n));

        $this->assertNull($rating);
        $this->assertNull($price);
    }

    private function searchHtml(): string
    {
        return '<div data-asin="B0DSWFN2XZ" data-component-type="s-search-result" class="s-result-item sg-col">'
            . '<h2><span>KOSMOS Catan - Das Spiel</span></h2>'
            . '<span>4,7 von 5 Sternen</span><a aria-label="257 Bewertungen"><span>257</span></a>'
            . '<span class="a-price" data-a-size="xl" data-a-color="base"><span class="a-offscreen">22,90' . "\u{00A0}" . '€</span></span>'
            . '</div>';
    }
}
