<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/FleaMarketRefresh.php';

final class FleaMarketRefreshTest extends TestCase
{
    private const SOURCE = 'FLEAMARKET';

    protected function setUp(): void
    {
        db()->prepare('DELETE FROM news_items WHERE source = ?')->execute([self::SOURCE]);
    }

    public function testDeduplicatesTheSameEventReportedByBothSourcesAndSortsByDate(): void
    {
        $pdo = db();

        refresh_flea_market_events(
            $pdo,
            [
                ['name' => 'Kinderflohmarkt EKS Scharnhorst, EKS Scharnhorst', 'startDate' => '2026-08-08T09:00:00+02:00', 'location' => 'EKS Scharnhorst', 'url' => 'https://kinderflohmarkt.com/a'],
                ['name' => 'Trödel rund ums Kind', 'startDate' => '2026-09-05T09:00:00+02:00', 'location' => 'Am Zehnthof 152', 'url' => 'https://kinderflohmarkt.com/b'],
            ],
            [
                // Same event as the first one above (same date + venue), different name text.
                ['name' => 'Kinderflohmarkt Dortmund EKS Scharnhorst', 'startDate' => '2026-08-08T09:00:00', 'location' => 'EKS Scharnhorst', 'url' => 'https://www.kinderbasar-online.de/x'],
            ],
            fn(string $location) => null, // fake geocoder - no network calls in tests
        );

        $rows = $pdo->prepare('SELECT headline, teaser, published_at FROM news_items WHERE source = ? ORDER BY sort_order ASC');
        $rows->execute([self::SOURCE]);
        $rows = $rows->fetchAll();

        $this->assertCount(2, $rows, 'the duplicate EKS Scharnhorst entry must be merged into one');
        $this->assertSame('Kinderflohmarkt EKS Scharnhorst, EKS Scharnhorst', $rows[0]['headline']);
        $this->assertSame('EKS Scharnhorst', $rows[0]['teaser']);
        $this->assertSame('Trödel rund ums Kind', $rows[1]['headline'], 'must be sorted by date, earliest first');
    }

    public function testStoresGeocodedCoordinatesPerVenue(): void
    {
        $pdo = db();

        refresh_flea_market_events(
            $pdo,
            [['name' => 'Kinderflohmarkt EKS Scharnhorst', 'startDate' => '2026-08-08T09:00:00+02:00', 'location' => 'EKS Scharnhorst', 'url' => 'https://kinderflohmarkt.com/a']],
            [],
            fn(string $location) => $location === 'EKS Scharnhorst' ? ['latitude' => 51.5511, 'longitude' => 7.5386] : null,
        );

        $rows = $pdo->prepare('SELECT latitude, longitude FROM news_items WHERE source = ?');
        $rows->execute([self::SOURCE]);
        $row = $rows->fetch();

        $this->assertEqualsWithDelta(51.5511, (float) $row['latitude'], 0.0001);
        $this->assertEqualsWithDelta(7.5386, (float) $row['longitude'], 0.0001);
    }
}
