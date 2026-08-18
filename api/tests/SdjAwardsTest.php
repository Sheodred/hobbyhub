<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/SdjAwards.php';

final class SdjAwardsTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM sdj_awards');
    }

    private function seed2026(): void
    {
        db()->exec(
            "INSERT INTO sdj_awards (award_year, category, kind, name, bgg_id, sort_order) VALUES
             (2026, 'Spiel des Jahres', 'winner', 'DITO!', 400495, 0),
             (2026, 'Spiel des Jahres', 'nominee', 'Cozy Sticker Ville', NULL, 1),
             (2026, 'Spiel des Jahres', 'nominee', 'Morty Sorty Magic Shop', NULL, 2),
             (2026, 'Spiel des Jahres', 'recommended', 'Hot Streak', NULL, 3),
             (2026, 'Kinderspiel des Jahres', 'winner', 'Die Insel der Mookies', 435346, 10)"
        );
    }

    public function testCurrentGroupsWinnerNomineesAndRecommendationsByCategory(): void
    {
        $this->seed2026();

        $result = (new SdjAwards())->current();

        $this->assertSame(2026, $result['year']);
        // Two pots seeded, in sort_order (Spiel before Kinderspiel).
        $this->assertCount(2, $result['categories']);

        $spiel = $result['categories'][0];
        $this->assertSame('Spiel des Jahres', $spiel['category']);
        $this->assertSame(['bggId' => 400495, 'name' => 'DITO!'], $spiel['winner']);
        $this->assertSame(['Cozy Sticker Ville', 'Morty Sorty Magic Shop'], $spiel['nominees']);
        $this->assertSame(['Hot Streak'], $spiel['recommended']);

        // A nominee/recommendation-less pot is still valid as long as it has a
        // winner; its lists come back empty, not missing.
        $kinder = $result['categories'][1];
        $this->assertSame('Kinderspiel des Jahres', $kinder['category']);
        $this->assertSame(['bggId' => 435346, 'name' => 'Die Insel der Mookies'], $kinder['winner']);
        $this->assertSame([], $kinder['nominees']);
        $this->assertSame([], $kinder['recommended']);
    }

    public function testCurrentServesOnlyTheLatestYear(): void
    {
        $this->seed2026();
        db()->exec(
            "INSERT INTO sdj_awards (award_year, category, kind, name, bgg_id, sort_order) VALUES
             (2025, 'Spiel des Jahres', 'winner', 'Old Winner', 111, 0)"
        );

        $result = (new SdjAwards())->current();

        $this->assertSame(2026, $result['year']);
        $winners = array_map(fn(array $c) => $c['winner']['name'], $result['categories']);
        $this->assertNotContains('Old Winner', $winners);
    }

    public function testCurrentDropsAPotThatHasNoWinner(): void
    {
        db()->exec(
            "INSERT INTO sdj_awards (award_year, category, kind, name, bgg_id, sort_order) VALUES
             (2026, 'Spiel des Jahres', 'nominee', 'Only A Nominee', NULL, 0)"
        );

        $result = (new SdjAwards())->current();

        $this->assertSame(2026, $result['year']);
        $this->assertSame([], $result['categories']);
    }

    public function testCurrentIsEmptyWhenNothingSeeded(): void
    {
        $this->assertSame(['year' => null, 'categories' => []], (new SdjAwards())->current());
    }
}
