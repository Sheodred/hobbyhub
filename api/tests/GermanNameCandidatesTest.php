<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/german_names.php';

class GermanNameCandidatesTest extends TestCase
{
    // The reproduction from #122: Catan finds nothing on any of the four
    // German sources because they are all handed BGG's English primary name.
    // These are the real alternates from thing id 13, in BGG's own (unranked)
    // order - "Die Siedler von Catan", the only one that actually resolves on
    // H@LL9000 (verified live), sits behind three other candidates that also
    // score above zero. An unranked "take the first few" version of this
    // function drops it from a capped list; only scoring-then-ranking keeps it.
    private const CATAN_NAMES = [
        'Catan',
        'Catan (Колонизаторы)',
        'Catan telepesei',
        'Catan: Das Spiel',
        'Catan: Die Bordspel',
        'De Kolonisten van Catan',
        'Les Colons de Catane',
        'Les Colons de Katäne',
        'Die Siedler von Catan',
        'The Settlers of Catan',
    ];

    public function testFindsTheGermanTitleAmongBggsUntaggedAlternates(): void
    {
        $candidates = german_name_candidates(self::CATAN_NAMES, 'Catan');

        $this->assertContains('Die Siedler von Catan', $candidates);
    }

    // The regression this issue actually shipped once, mid-session: an
    // earlier version took candidates in BGG's own document order and
    // capped the list, which silently dropped "Die Siedler von Catan"
    // behind "Catan: Das Spiel" and "Catan: Die Bordspel" (Dutch, but
    // "Die" is a marker word too) - fixing nothing, since neither of those
    // resolves on any real source.
    public function testRanksTheStrongestCandidateFirstEvenWhenItAppearsLastOnBgg(): void
    {
        $candidates = german_name_candidates(self::CATAN_NAMES, 'Catan');

        $this->assertSame('Die Siedler von Catan', $candidates[0]);
    }

    public function testDropsOtherLanguagesThatLookSuperficiallySimilar(): void
    {
        $candidates = german_name_candidates(self::CATAN_NAMES, 'Catan');

        // Dutch "van" and French "de" are the two that a looser marker list
        // would let through; the Hungarian and Russian ones are the control.
        $this->assertNotContains('De Kolonisten van Catan', $candidates);
        $this->assertNotContains('Les Colons de Catane', $candidates);
        $this->assertNotContains('Catan telepesei', $candidates);
        $this->assertNotContains('Catan (Колонизаторы)', $candidates);
        $this->assertNotContains('The Settlers of Catan', $candidates);
    }

    public function testNeverRepeatsThePrimaryName(): void
    {
        // The caller already tries the primary first, so returning it here
        // would spend a second identical request on every source.
        $candidates = german_name_candidates(['Die Siedler von Catan', 'Catan'], 'Die Siedler von Catan');

        $this->assertNotContains('Die Siedler von Catan', $candidates);
    }

    public function testAnUmlautIsEnoughOnItsOwn(): void
    {
        // Flügelschlag (Wingspan) carries no German particle at all.
        $candidates = german_name_candidates(['Wingspan', 'Flügelschlag', 'Alas'], 'Wingspan');

        $this->assertSame(['Flügelschlag'], $candidates);
    }

    public function testEszettCounts(): void
    {
        $this->assertGreaterThan(0, german_name_score('Straße nach Indien'));
    }

    public function testCapsTheListSoACacheMissStaysCheap(): void
    {
        $names = ['Base', 'Die Eins', 'Der Zwei', 'Das Drei', 'Ein Vier', 'Vom Fünf'];

        $this->assertCount(GERMAN_NAME_CANDIDATE_LIMIT, german_name_candidates($names, 'Base'));
    }

    public function testAGameWithNoGermanAlternateYieldsNothing(): void
    {
        $this->assertSame([], german_name_candidates(['Gloomhaven', 'Мрачная гавань'], 'Gloomhaven'));
    }

    public function testBlankAndDuplicateNamesAreIgnored(): void
    {
        $names = ['Catan', '  ', 'Die Siedler von Catan', 'die siedler von catan'];

        $this->assertSame(['Die Siedler von Catan'], german_name_candidates($names, 'Catan'));
    }
}
