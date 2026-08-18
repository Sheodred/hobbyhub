<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/RatingSource.php';

// The flattening these cover used to live inside api/boardgames/lookup.php,
// where the only way to reach it was an HTTP request.
final class RatingSourceTest extends TestCase
{
    public function testLabelsEachRatingWithItsSource(): void
    {
        $ratings = collect_ratings(
            [new FakeRatingSource('H@LL9000', ['value' => 4.6, 'max' => 6, 'count' => 9, 'title' => null, 'url' => 'u'])],
            ['Wingspan']
        );

        $this->assertSame([[
            'source' => 'H@LL9000',
            'value' => 4.6,
            'max' => 6,
            'count' => 9,
            'title' => null,
            'url' => 'u',
        ]], $ratings);
    }

    public function testSourceWithNothingPublishedIsSkippedNotReportedAsZero(): void
    {
        $this->assertSame([], collect_ratings([new FakeRatingSource('Amazon.de', null)], ['Wingspan']));
    }

    // Best-Effort: the whole point is that one broken source cannot cost the
    // user the sources that do work.
    public function testBrokenSourceDoesNotTakeDownTheOthers(): void
    {
        $ratings = collect_ratings([
            new ThrowingRatingSource('Amazon.de'),
            new FakeRatingSource('H@LL9000', ['value' => 4.6, 'max' => 6, 'count' => 9, 'title' => null, 'url' => 'u']),
        ], ['Wingspan']);

        $this->assertCount(1, $ratings);
        $this->assertSame('H@LL9000', $ratings[0]['source']);
    }

    public function testEachSourceKeepsItsOwnScale(): void
    {
        $ratings = collect_ratings([
            new FakeRatingSource('Amazon.de', ['value' => 4.8, 'max' => 5, 'count' => 12416, 'title' => 't', 'url' => 'u']),
            new FakeRatingSource('brettspiele-report', ['value' => 17, 'max' => 20, 'count' => null, 'title' => 't', 'url' => 'u']),
        ], ['Wingspan']);

        $this->assertSame([5, 20], array_column($ratings, 'max'));
    }

    // #122: the four secondary sources are German, BGG's primary name is
    // English, so Catan was searched for as "Catan" and found nowhere.
    public function testTriesTheGermanNameWhenTheEnglishOneFindsNothing(): void
    {
        $hall = new NamedRatingSource('H@LL9000', 'Die Siedler von Catan', ['value' => 5.4, 'max' => 6, 'count' => 5, 'title' => null, 'url' => 'u']);

        $ratings = collect_ratings([$hall], ['Catan', 'Die Siedler von Catan']);

        $this->assertCount(1, $ratings);
        $this->assertSame(5.4, $ratings[0]['value']);
        $this->assertSame(['Catan', 'Die Siedler von Catan'], $hall->asked);
    }

    public function testStopsAtTheFirstNameThatAnswers(): void
    {
        // A game the English name already finds must not spend a second
        // request per source on a German guess it does not need.
        $hall = new NamedRatingSource('H@LL9000', 'Wingspan', ['value' => 4.6, 'max' => 6, 'count' => 9, 'title' => null, 'url' => 'u']);

        collect_ratings([$hall], ['Wingspan', 'Flugelschlag']);

        $this->assertSame(['Wingspan'], $hall->asked);
    }

    // A source that is down has not said "nothing published under this
    // name", so the remaining names must not be spent papering over it.
    public function testAFailingSourceIsNotRetriedUnderEveryOtherName(): void
    {
        $this->assertSame([], collect_ratings([new ThrowingRatingSource('Amazon.de')], ['Catan', 'Die Siedler von Catan']));
    }
}

final class FakeRatingSource implements RatingSource
{
    public function __construct(private string $label, private ?array $rating)
    {
    }

    public function label(): string
    {
        return $this->label;
    }

    public function rating(string $gameName): ?array
    {
        return $this->rating;
    }
}

final class ThrowingRatingSource implements RatingSource
{
    public function __construct(private string $label)
    {
    }

    public function label(): string
    {
        return $this->label;
    }

    public function rating(string $gameName): ?array
    {
        throw new RuntimeException('upstream is down');
    }
}

final class NamedRatingSource implements RatingSource
{
    /** @var string[] */
    public array $asked = [];

    public function __construct(private string $label, private string $answersTo, private ?array $rating)
    {
    }

    public function label(): string
    {
        return $this->label;
    }

    public function rating(string $gameName): ?array
    {
        $this->asked[] = $gameName;
        return $gameName === $this->answersTo ? $this->rating : null;
    }
}
