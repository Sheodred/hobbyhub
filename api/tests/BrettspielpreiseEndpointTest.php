<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BrettspielpreiseClient.php';

final class BrettspielpreiseEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM brettspielpreise_cache');
    }

    public function testShapesThePriceWithTheClientsOwnLabel(): void
    {
        $client = new BrettspielpreiseClient(fn() => [
            'currency' => 'EUR',
            'items' => [['name' => 'Ark Nova', 'url' => null, 'prices' => [
                ['price' => 55.17, 'link' => 'https://brettspielpreise.de/item/go?storeitemid=1', 'stock' => 'Y', 'country' => 'DE'],
            ]]],
        ]);

        $found = $client->priceFor(342942);
        $price = $found === null ? null : [
            'value' => $found['price'],
            'currency' => $found['currency'],
            'source' => $client->label(),
            'url' => $found['url'],
        ];

        $this->assertSame([
            'value' => 55.17,
            'currency' => 'EUR',
            'source' => 'Brettspielpreise.de',
            'url' => 'https://brettspielpreise.de/item/go?storeitemid=1',
        ], $price);
    }
}
