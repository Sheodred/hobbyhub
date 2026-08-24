<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/PriceSource.php';

// Mirrors RatingSourceTest.php: the flattening/best-effort behaviour used to
// live inline in api/boardgames/lookup.php, reachable only via an HTTP
// request.
final class PriceSourceTest extends TestCase
{
    public function testLabelsEachPriceWithItsSource(): void
    {
        $prices = collect_prices([
            'Brettspielpreise.de' => fn() => ['price' => 19.99, 'currency' => 'EUR', 'title' => 't', 'url' => 'u'],
        ]);

        $this->assertSame([[
            'value' => 19.99,
            'currency' => 'EUR',
            'source' => 'Brettspielpreise.de',
            'url' => 'u',
        ]], $prices);
    }

    // #176: the whole point of this issue - two sources with a real price
    // for the same game must both reach the page, not just the first one.
    public function testMultipleSourcesWithAPriceAreAllReturned(): void
    {
        $prices = collect_prices([
            'Brettspielpreise.de' => fn() => ['price' => 19.99, 'currency' => 'EUR', 'title' => 't', 'url' => 'u1'],
            'Amazon.de' => fn() => ['price' => 22.90, 'currency' => 'EUR', 'title' => 't', 'url' => 'u2'],
        ]);

        $this->assertCount(2, $prices);
        $this->assertSame(['Brettspielpreise.de', 'Amazon.de'], array_column($prices, 'source'));
    }

    public function testSourceWithNoListingIsSkippedNotReportedAsZero(): void
    {
        $this->assertSame([], collect_prices(['Amazon.de' => fn() => null]));
    }

    // Best-Effort, same as collect_ratings(): one broken source cannot cost
    // the user the sources that do work.
    public function testBrokenSourceDoesNotTakeDownTheOthers(): void
    {
        $prices = collect_prices([
            'Brettspielpreise.de' => function () {
                throw new RuntimeException('upstream is down');
            },
            'Amazon.de' => fn() => ['price' => 22.90, 'currency' => 'EUR', 'title' => 't', 'url' => 'u2'],
        ]);

        $this->assertCount(1, $prices);
        $this->assertSame('Amazon.de', $prices[0]['source']);
    }
}
