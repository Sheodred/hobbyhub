<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/Hall9000Client.php';
require_once __DIR__ . '/../lib/BrettspieleReportClient.php';

final class GermanRatingClientsTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM hall9000_cache');
        db()->exec('DELETE FROM brettspiele_report_cache');
    }

    // --- H@LL9000 ---------------------------------------------------------

    private function hallPage(): string
    {
        return '<html><body><h1>H@LL9000 - Rezension/Kritik Spiel: Azul</h1>'
            . '<p>H@LL9000-Bewertungen H@LL9000 Wertung Azul: 4,8, 17 Bewertung(en)</p>'
            . '<p>Spieler: 2 - 4 Dauer: 30 - 45 Minuten Alter: ab 8 Jahren Jahr: 2017</p>'
            . '</body></html>';
    }

    public function testHallParsesRatingCountAndPlayerInfo(): void
    {
        $r = (new Hall9000Client(fn() => $this->hallPage()))->ratingFor('Azul');

        $this->assertSame(4.8, $r['rating']);
        $this->assertSame(6, $r['max']);
        $this->assertSame(17, $r['count']);
        $this->assertSame('2 - 4', $r['players']);
        $this->assertSame('30 - 45 Minuten', $r['duration']);
        $this->assertSame('ab 8 Jahren', $r['age']);
        $this->assertSame('https://www.hall9000.de/html/spiel/azul', $r['url']);
    }

    public function testHallReportsNoAgeWhenThePageOmitsIt(): void
    {
        $page = '<p>H@LL9000 Wertung Azul: 4,8, 17 Bewertung(en)</p>'
            . '<p>Spieler: 2 - 4 Dauer: 30 - 45 Minuten Jahr: 2017</p>';

        $r = (new Hall9000Client(fn() => $page))->ratingFor('Azul');

        $this->assertNull($r['age'], 'a missing field is null, never an empty label');
        $this->assertSame('2 - 4', $r['players']);
    }

    public function testHallBuildsTheSlugTheirOwnFeedsUse(): void
    {
        $seen = null;
        $client = new Hall9000Client(function ($url) use (&$seen) {
            $seen = $url;
            return $this->hallPage();
        });

        $client->ratingFor('Das Orakel von Delphi');

        $this->assertStringEndsWith('/das_orakel_von_delphi', $seen);
    }

    public function testHallReturnsNullWhenThePageIsMissingOrUnparsed(): void
    {
        $this->assertNull((new Hall9000Client(fn() => null))->ratingFor('Nichtvorhanden'));
        $this->assertNull((new Hall9000Client(fn() => '<html>nothing here</html>'))->ratingFor('Azul'));
    }

    public function testHallRejectsAnImplausibleRating(): void
    {
        // Above their scale means the pattern matched something else.
        $page = '<p>Wertung Azul: 9,9, 17 Bewertung(en)</p>';
        $this->assertNull((new Hall9000Client(fn() => $page))->ratingFor('Azul'));
    }

    // --- brettspiele-report ----------------------------------------------

    private function reportPosts(): array
    {
        $body = 'brettspiele-report Bewertung Azul Aufteilung der Spielbox: 17 '
            . 'Qualit&auml;t des Spielmaterials: 19 Anspruch an die Spieler: 5 '
            . 'Komplexit&auml;t: 4 Bewertung: 15 Meinung brettspiele-report: Sehr gut.';

        return [
            ['link' => 'https://www.brettspiele-report.de/azul-sommerpavillon/',
             'title' => ['rendered' => 'Azul &#8211; Der Sommerpavillon'],
             'content' => ['rendered' => $body]],
            ['link' => 'https://www.brettspiele-report.de/azul/',
             'title' => ['rendered' => 'Azul'],
             'content' => ['rendered' => $body]],
        ];
    }

    public function testReportTakesTheOverallScoreNotACategoryScore(): void
    {
        $r = (new BrettspieleReportClient(fn() => $this->reportPosts()))->ratingFor('Azul');

        $this->assertSame(15, $r['rating']);
        $this->assertSame(20, $r['max']);
        $this->assertSame('https://www.brettspiele-report.de/azul/', $r['url']);
    }

    public function testReportReadsKomplexitaetAlongsideTheOverallScore(): void
    {
        // Their own complexity descriptor, on the same 20-point scale as the
        // overall verdict. Read as a fact about the game, never mixed into
        // the ratings - it says how heavy, not how good.
        $r = (new BrettspieleReportClient(fn() => $this->reportPosts()))->ratingFor('Azul');

        $this->assertSame(4, $r['complexity']);
        $this->assertSame(15, $r['rating'], 'the overall verdict must not move');
    }

    public function testReportReportsNoComplexityWhenTheReviewOmitsIt(): void
    {
        $posts = [[
            'link' => 'https://www.brettspiele-report.de/azul/',
            'title' => ['rendered' => 'Azul'],
            'content' => ['rendered' => 'brettspiele-report Bewertung Azul Bewertung: 15 Sehr gut.'],
        ]];

        $this->assertNull((new BrettspieleReportClient(fn() => $posts))->ratingFor('Azul')['complexity']);
    }

    public function testReportRejectsADifferentGameInTheSameSeries(): void
    {
        $posts = [$this->reportPosts()[0]]; // only "Azul - Der Sommerpavillon"

        $this->assertNull(
            (new BrettspieleReportClient(fn() => $posts))->ratingFor('Azul'),
            'a sequel is a different game - its score must not be shown as this one'
        );
    }

    public function testReportReturnsNullWhenTheFetchFails(): void
    {
        $this->assertNull((new BrettspieleReportClient(fn() => null))->ratingFor('Azul'));
    }

    public function testReportCachesItsAnswer(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            return $this->reportPosts();
        };

        (new BrettspieleReportClient($fetch))->ratingFor('Azul');
        (new BrettspieleReportClient($fetch))->ratingFor(' AZUL ');

        $this->assertSame(1, $calls);
    }
}
