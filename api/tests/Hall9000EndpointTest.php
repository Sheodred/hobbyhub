<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/Hall9000Client.php';
require_once __DIR__ . '/../lib/RatingSource.php';

final class Hall9000EndpointTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgg_ranks');
        db()->exec('DELETE FROM game_aliases');
        db()->exec('DELETE FROM hall9000_cache');
        db()->exec("INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES (13, 'Azul', 2017, 7.1, 100, 0, 99)");
    }

    public function testReturnsRatingAndFactsForAKnownGame(): void
    {
        $names = (new BggClient(fn() => null))->localSearchNames(13);
        $hall = new Hall9000Client(fn() => [
            'status' => 200,
            'url' => 'x',
            'body' => '<p>H@LL9000 Wertung Azul: 4,8, 17 Bewertung(en) Spieler: 2 - 4 Dauer: 30 - 45 Minuten Alter: ab 8 Jahren Jahr: 2017</p>',
        ]);

        $rating = first_hit($names, fn(string $n) => $hall->rating($n));
        $facts = first_hit($names, fn(string $n) => $hall->ratingFor($n));

        $this->assertSame(4.8, $rating['value']);
        $this->assertSame('30 - 45', $facts['duration']);
        $this->assertSame(8, $facts['age']);
    }
}
