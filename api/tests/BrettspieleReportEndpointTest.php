<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/BrettspieleReportClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

final class BrettspieleReportEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgg_ranks');
        db()->exec('DELETE FROM game_aliases');
        db()->exec('DELETE FROM brettspiele_report_cache');
        db()->exec("INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES (13, 'Azul', 2017, 7.1, 100, 0, 99)");
    }

    public function testReturnsRatingAndComplexityForAKnownGame(): void
    {
        $names = (new BggClient(fn() => null))->localSearchNames(13);
        $client = new BrettspieleReportClient(fn() => [$this->post()]);

        $rating = first_hit($names, fn(string $n) => $client->rating($n));
        $facts = first_hit($names, fn(string $n) => $client->ratingFor($n));

        $this->assertSame(14, $rating['value']);
        $this->assertSame(9, $facts['complexity']);
    }

    private function post(): array
    {
        return [
            'link' => 'https://www.brettspiele-report.de/azul-review/',
            'title' => ['rendered' => 'Azul'],
            'content' => ['rendered' => '<p>Komplexität: 9 Bewertung: 14</p>'],
        ];
    }
}
