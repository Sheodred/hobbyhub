<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BoardGameQuestClient.php';

final class BoardGameQuestClientTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgq_review_cache');
    }

    private function post(string $title, string $body, string $link): array
    {
        return [
            'link' => $link,
            'title' => ['rendered' => $title],
            'content' => ['rendered' => '<p>' . $body . '</p>'],
        ];
    }

    private function feed(): array
    {
        return [
            // A round-up post that mentions the game but reviews nothing.
            $this->post('Top 10 Board Games We Disagree On', 'Azul is great. No score here.', 'https://www.boardgamequest.com/top-10/'),
            // The real review.
            $this->post(
                'Azul Review',
                'Gameplay Overview: Players draft coloured tiles from factory displays and place them '
                . 'on their board to score points. Components: nice. '
                . 'Final Score: 4.5 Stars &#8211; a gorgeous abstract that plays in 40 minutes. '
                . 'Hits: &#8226; Beautiful production &#8226; Easy to teach '
                . 'Misses: &#8226; Can be mean at four players',
                'https://www.boardgamequest.com/azul-review/'
            ),
        ];
    }

    public function testParsesScoreGameplayAndProsConsFromTheReviewPost(): void
    {
        $client = new BoardGameQuestClient(fn() => $this->feed());

        $r = $client->reviewFor('Azul');

        $this->assertSame(4.5, $r['score']);
        $this->assertStringContainsString('draft coloured tiles', $r['rules']);
        $this->assertStringNotContainsString('Final Score', $r['rules'], 'the rules blurb must stop at the next section');
        $this->assertSame(['Beautiful production', 'Easy to teach'], $r['hits']);
        $this->assertSame(['Can be mean at four players'], $r['misses']);
        $this->assertSame('https://www.boardgamequest.com/azul-review/', $r['url']);
    }

    public function testIgnoresRoundUpPostsThatCarryNoScore(): void
    {
        $client = new BoardGameQuestClient(fn() => [$this->feed()[0]]);

        $this->assertNull($client->reviewFor('Azul'), 'a post without a Final Score is not a review');
    }

    public function testReturnsNullWhenNoPostTitleMatchesTheGame(): void
    {
        $client = new BoardGameQuestClient(fn() => $this->feed());

        $this->assertNull($client->reviewFor('Wingspan'));
    }

    public function testReturnsNullWhenTheFetchFails(): void
    {
        $this->assertNull((new BoardGameQuestClient(fn() => null))->reviewFor('Azul'));
    }

    public function testResultIsCachedAndNotRefetched(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            return $this->feed();
        };

        (new BoardGameQuestClient($fetch))->reviewFor('Azul');
        (new BoardGameQuestClient($fetch))->reviewFor('  AZUL ');

        $this->assertSame(1, $calls);
    }

    public function testRulesBlurbIsTruncatedRatherThanRepublishedWhole(): void
    {
        $long = str_repeat('Players place tiles and score points. ', 40);
        $client = new BoardGameQuestClient(fn() => [
            $this->post('Azul Review', 'Gameplay Overview: ' . $long . ' Final Score: 4 Stars', 'https://x/azul-review/'),
        ]);

        $rules = $client->reviewFor('Azul')['rules'];

        $this->assertLessThanOrEqual(BoardGameQuestClient::RULES_MAX_LENGTH + 1, mb_strlen($rules));
        $this->assertStringEndsWith('…', $rules);
    }

    public function testDoesNotAcceptAReviewOfADifferentEdition(): void
    {
        // BGQ reviewed "Wingspan Pocket", not Wingspan. Presenting that score
        // as Wingspan's would be a wrong answer with a real citation attached.
        $client = new BoardGameQuestClient(fn() => [
            $this->post('Wingspan Pocket Review', 'Gameplay Overview: Birds. Final Score: 5 Stars', 'https://x/wingspan-pocket-review/'),
        ]);

        $this->assertNull($client->reviewFor('Wingspan'));
        $this->assertSame(5.0, $client->reviewFor('Wingspan Pocket')['score']);
    }
}
