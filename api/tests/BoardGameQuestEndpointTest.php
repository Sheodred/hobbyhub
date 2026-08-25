<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/BoardGameQuestClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

final class BoardGameQuestEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgg_ranks');
        db()->exec('DELETE FROM game_aliases');
        db()->exec('DELETE FROM bgq_review_cache');
        db()->exec("INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES (13, 'Azul', 2017, 7.1, 100, 0, 99)");
    }

    public function testReturnsBothRatingAndReviewForAKnownGame(): void
    {
        $names = (new BggClient(fn() => null))->localSearchNames(13);
        $bgq = new BoardGameQuestClient(fn() => [$this->post()]);

        $rating = first_hit($names, fn(string $n) => $bgq->rating($n));
        $review = first_hit($names, fn(string $n) => $bgq->reviewFor($n));

        $this->assertSame(4.5, $rating['value']);
        $this->assertSame('Players draft coloured tiles.', $review['rules']);
    }

    private function post(): array
    {
        return [
            'link' => 'https://www.boardgamequest.com/azul-review/',
            'title' => ['rendered' => 'Azul Review'],
            'content' => ['rendered' => '<p>Gameplay Overview: Players draft coloured tiles. Final Score: 4.5 Stars</p>'],
        ];
    }
}
