<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BrettspielpreiseClient.php';

final class BrettspielpreiseClientTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM brettspielpreise_cache');
    }

    // Shape of https://brettspielpreise.de/api/info, trimmed to the fields
    // the client reads.
    private function response(array $items): array
    {
        return ['currency' => 'EUR', 'items' => $items];
    }

    private function item(array $prices, string $name = 'Ark Nova', ?string $url = 'https://brettspielpreise.de/item/show/40549'): array
    {
        return ['name' => $name, 'url' => $url, 'prices' => $prices];
    }

    public function testTakesTheFirstOfferOfTheFirstItemTrustingTheirSmartSort(): void
    {
        $data = $this->response([
            $this->item([
                ['price' => 55.17, 'link' => 'https://brettspielpreise.de/item/go?storeitemid=1', 'stock' => 'Y', 'country' => 'DE'],
                ['price' => 49.98, 'link' => 'https://brettspielpreise.de/item/go?storeitemid=2', 'stock' => 'Y', 'country' => 'DE'],
            ]),
        ]);

        $result = (new BrettspielpreiseClient(fn() => $data))->priceFor(342942);

        // The second offer is cheaper, but SMART sort already put the first
        // one first - re-ranking here would second-guess their own
        // algorithm, which the client deliberately does not do.
        $this->assertSame(55.17, $result['price']);
        $this->assertSame('EUR', $result['currency']);
        $this->assertSame('Ark Nova', $result['title']);
        $this->assertSame('https://brettspielpreise.de/item/go?storeitemid=1', $result['url']);
    }

    public function testFallsThroughToTheNextItemWhenTheFirstHasNoPrices(): void
    {
        $data = $this->response([
            $this->item([], 'Ark Nova: Wrong Edition'),
            $this->item([['price' => 60.0, 'link' => 'https://brettspielpreise.de/item/go?storeitemid=9']], 'Ark Nova'),
        ]);

        $result = (new BrettspielpreiseClient(fn() => $data))->priceFor(342942);

        $this->assertSame(60.0, $result['price']);
        $this->assertSame('Ark Nova', $result['title']);
    }

    public function testReturnsNullWhenNoItemsMatch(): void
    {
        $result = (new BrettspielpreiseClient(fn() => $this->response([])))->priceFor(999999);

        $this->assertNull($result);
    }

    public function testResultIsCachedAndNotRefetched(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            return $this->response([$this->item([['price' => 55.17, 'link' => 'https://example.com/x']])]);
        };

        (new BrettspielpreiseClient($fetch))->priceFor(342942);
        (new BrettspielpreiseClient($fetch))->priceFor(342942);

        $this->assertSame(1, $calls, 'repeat lookups of the same bgg id must be served from brettspielpreise_cache');
    }

    public function testAFailedFetchIsNotCached(): void
    {
        try {
            (new BrettspielpreiseClient(fn() => null))->priceFor(342942);
        } catch (RuntimeException $e) {
            // The point of this test is what is left behind, not the throw.
        }

        $this->assertSame(
            0,
            (int) db()->query("SELECT COUNT(*) FROM brettspielpreise_cache WHERE query_key = '342942'")->fetchColumn()
        );
    }
}
