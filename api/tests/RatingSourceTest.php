<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/RatingSource.php';

// #180/#186: collect_ratings() batched multiple external sources into one
// list - dead now that lookup.php's work is split one source per endpoint
// (see bgg.php/amazon.php/boardgamequest.php/hall9000.php/
// brettspielereport.php). first_hit() (tries multiple name candidates
// against ONE source) stays essential and every one of those endpoints
// uses it, so its behavior is still covered here directly.
final class RatingSourceTest extends TestCase
{
    // #122: the four secondary sources are German, BGG's primary name is
    // English, so Catan was searched for as "Catan" and found nowhere.
    public function testTriesTheGermanNameWhenTheEnglishOneFindsNothing(): void
    {
        $asked = [];
        $found = first_hit(['Catan', 'Die Siedler von Catan'], function (string $name) use (&$asked) {
            $asked[] = $name;
            return $name === 'Die Siedler von Catan' ? ['value' => 5.4] : null;
        });

        $this->assertSame(['value' => 5.4], $found);
        $this->assertSame(['Catan', 'Die Siedler von Catan'], $asked);
    }

    public function testStopsAtTheFirstNameThatAnswers(): void
    {
        $asked = [];
        first_hit(['Wingspan', 'Flugelschlag'], function (string $name) use (&$asked) {
            $asked[] = $name;
            return ['value' => 4.6];
        });

        $this->assertSame(['Wingspan'], $asked, 'a name that already answered must not spend a second request on a guess it does not need');
    }

    // A source that is down has not said "nothing published under this
    // name", so the remaining names must not be spent papering over it.
    public function testAFailingCallIsNotRetriedUnderAnotherName(): void
    {
        $asked = [];
        try {
            first_hit(['Catan', 'Die Siedler von Catan'], function (string $name) use (&$asked) {
                $asked[] = $name;
                throw new RuntimeException('upstream is down');
            });
            $this->fail('expected the exception to propagate');
        } catch (RuntimeException $e) {
            $this->assertSame(['Catan'], $asked);
        }
    }

    public function testReturnsNullWhenNoNameAnswers(): void
    {
        $this->assertNull(first_hit(['Catan', 'Die Siedler von Catan'], fn() => null));
    }
}
