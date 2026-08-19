<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BggClient.php';

final class BggClientTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgg_lookup_cache');
        db()->exec('DELETE FROM bgg_search_cache');
        db()->exec('DELETE FROM bgg_ranks');
        db()->exec('DELETE FROM game_aliases');
    }

    private function seedRanks(): void
    {
        // Wingspan is deliberately left unranked - BGG ranks only games past
        // a ratings threshold, and most of the 180k dump has no rank at all.
        db()->exec(
            "INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES
             (13, 'Catan', 1995, 7.09029, 143738, 0, 566),
             (926, 'Catan: Cities & Knights', 1998, 7.4, 40000, 1, 401),
             (266192, 'Wingspan', 2019, 8.1, 120000, 0, NULL)"
        );
    }

    private function seedAlias(int $bggId, string $name, ?string $lang = 'de'): void
    {
        $stmt = db()->prepare('INSERT INTO game_aliases (bgg_id, name, lang) VALUES (?, ?, ?)');
        $stmt->execute([$bggId, $name, $lang]);
    }

    private function thingXml(string $inner): SimpleXMLElement
    {
        return new SimpleXMLElement('<items>' . $inner . '</items>');
    }

    public function testLookupCacheMissCallsFetcherAndMapsResult(): void
    {
        $calls = 0;
        $client = new BggClient(function () use (&$calls) {
            $calls++;
            return $this->thingXml(
                '<item id="13">' .
                '<name type="primary" value="Catan"/>' .
                '<description>Trade, build, settle.</description>' .
                '<statistics><ratings><average value="7.15"/><usersrated value="1000"/></ratings></statistics>' .
                '<comments>' .
                '<comment username="a" rating="10" value="Great trading game."/>' .
                '<comment username="b" rating="9" value="A modern classic."/>' .
                '<comment username="c" rating="8" value="Still holds up."/>' .
                '<comment username="d" rating="3" value="Too much luck."/>' .
                '<comment username="e" rating="2" value="Rolled badly, lost badly."/>' .
                '<comment username="f" rating="1" value="Boring after round two."/>' .
                '</comments>' .
                '</item>'
            );
        });

        $result = $client->lookup(13);

        $this->assertSame(1, $calls);
        $this->assertSame('Catan', $result['name']);
        $this->assertSame(7.2, $result['rating']); // rounds 7.15 to 1 decimal
        $this->assertSame(1000, $result['numRatings']);
        $this->assertSame(
            ['Great trading game.', 'A modern classic.', 'Still holds up.'],
            $result['good']
        );
        $this->assertSame(
            ['Boring after round two.', 'Rolled badly, lost badly.', 'Too much luck.'],
            $result['bad']
        );
        $this->assertSame(['name' => 'BoardGameGeek', 'url' => 'https://boardgamegeek.com/boardgame/13'], $result['source']);
    }

    public function testExcludesUrlCommentsAsVoteBrigadingSpam(): void
    {
        // A one-star comment linking a video and begging others to also
        // rate 1 is a real, recurring BGG pattern - it has the lowest
        // rating in the pool but is not a review, so it must not win a
        // "bad" slot over an actual (if less extreme) complaint.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="7"><name type="primary" value="Azul"/>' .
            '<comments totalitems="7" page="1">' .
            '<comment username="a" rating="9" value="Beautiful and tight."/>' .
            '<comment username="b" rating="9" value="A great gateway game."/>' .
            '<comment username="c" rating="8" value="Gorgeous components."/>' .
            '<comment username="d" rating="3" value="Repetitive."/>' .
            '<comment username="e" rating="2" value="No real interaction."/>' .
            '<comment username="f" rating="1" value="Anyone who see this please rate it 1 https://youtu.be/x"/>' .
            '<comment username="g" rating="1" value="Solitaire with extra steps."/>' .
            '</comments></item>'
        ));

        $result = $client->lookup(7);

        $this->assertSame(
            ['Solitaire with extra steps.', 'No real interaction.', 'Repetitive.'],
            $result['bad'],
            'the spam comment must not displace a real complaint from the bottom 3'
        );
    }

    public function testLookupAsksForRatedCommentsOnly(): void
    {
        // `comments` and `ratingcomments` are mutually exclusive at BGG's end
        // and `comments` wins, returning every comment with rating="N/A" -
        // which pickGoodBad() discards, so good/bad silently stayed null for
        // every game. Asserting on the request, because no fixture can catch
        // it: the bug is in what we ask for, not in what we do with the answer.
        $url = null;
        $client = new BggClient(function (string $u) use (&$url) {
            $url = $u;
            return $this->thingXml('<item id="13"><name type="primary" value="Catan"/></item>');
        });

        $client->lookup(13);

        $this->assertStringContainsString('ratingcomments=1', $url);
        // '&comments=1', not 'comments=1' - the latter is a substring of
        // 'ratingcomments=1' and would fail against a correct URL.
        $this->assertStringNotContainsString('&comments=1', $url, 'plain comments would override ratingcomments');
    }

    /**
     * #162's XML shape, kept to what the code actually reads: a <versions>
     * block whose items carry a <canonicalname> and language <link>s. The
     * real responses carry ~30 more fields per version; none are read.
     *
     * @param array<int, array{0: string, 1: string[]}> $versions [canonicalname, languages]
     */
    private function versionsXml(array $versions): string
    {
        $items = '';
        foreach ($versions as $i => [$canonical, $languages]) {
            $links = '';
            foreach ($languages as $language) {
                $links .= '<link type="language" value="' . $language . '"/>';
            }
            $items .= '<item type="boardgameversion" id="' . (900 + $i) . '">' .
                '<name type="primary" value="' . $canonical . ' edition"/>' .
                '<canonicalname value="' . $canonical . '"/>' .
                $links .
                '</item>';
        }

        return '<versions>' . $items . '</versions>';
    }

    private function germanAliasFor(int $bggId): ?string
    {
        $stmt = db()->prepare("SELECT name FROM game_aliases WHERE bgg_id = ? AND lang = 'de'");
        $stmt->execute([$bggId]);
        $row = $stmt->fetch();

        return $row === false ? null : (string) $row['name'];
    }

    public function testTheGermanTitleIsTakenFromTheVersionsCanonicalName(): void
    {
        // The exact case that motivated #162: "Arche Nova" carries no umlaut
        // and none of german_name_candidates()'s marker words, so the
        // heuristic scores it 0 and never tries it - amazon.de and
        // brettspiele-report were searched as "Ark Nova" and found nothing.
        // The version list states it outright. Probed live 2026-08-19: all 8
        // of Ark Nova's German versions give canonicalname="Arche Nova".
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="342942"><name type="primary" value="Ark Nova"/>' .
            $this->versionsXml([
                ['Ark Nova', ['English']],
                ['Arche Nova', ['German']],
                ['Archa Nova', ['Czech']],
            ]) .
            '</item>'
        ));

        $client->lookup(342942);

        $this->assertSame('Arche Nova', $this->germanAliasFor(342942));
    }

    public function testTheGermanTitleIsReadFromCanonicalNameNotTheEditionLabel(): void
    {
        // <name> on a version is the edition label ("German edition, first
        // printing"), not a title. Taking it would write pure noise into
        // game_aliases and then SEARCH amazon.de for that noise.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="342942"><name type="primary" value="Ark Nova"/>' .
            '<versions><item type="boardgameversion" id="571945">' .
            '<name type="primary" value="German edition, first printing"/>' .
            '<canonicalname value="Arche Nova"/>' .
            '<link type="language" value="German"/>' .
            '</item></versions></item>'
        ));

        $client->lookup(342942);

        $this->assertSame('Arche Nova', $this->germanAliasFor(342942));
    }

    public function testTheMostFrequentGermanTitleWinsOverARarerOne(): void
    {
        // Catan, live 2026-08-19: 12 German versions say "Die Siedler von
        // Catan" and 3 say "Catan: Das Spiel". Only the first resolves at the
        // secondary sources, and document order does not favour it - the
        // count is what picks correctly.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="13"><name type="primary" value="Catan"/>' .
            $this->versionsXml([
                ['Catan: Das Spiel', ['German']],
                ['Die Siedler von Catan', ['German']],
                ['Catan: Das Spiel', ['German']],
                ['Die Siedler von Catan', ['German']],
                ['Die Siedler von Catan', ['German']],
            ]) .
            '</item>'
        ));

        $client->lookup(13);

        $this->assertSame('Die Siedler von Catan', $this->germanAliasFor(13));
    }

    public function testAGermanEditionKeepingTheEnglishTitleYieldsNoAlias(): void
    {
        // Gloomhaven and Terraforming Mars both publish in German under their
        // English names (probed live 2026-08-19). Writing that as an "alias"
        // would be a falsehood in the table and a duplicate search term.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="174430"><name type="primary" value="Gloomhaven"/>' .
            $this->versionsXml([
                ['Gloomhaven', ['English']],
                ['Gloomhaven', ['German']],
            ]) .
            '</item>'
        ));

        $client->lookup(174430);

        $this->assertNull($this->germanAliasFor(174430));
    }

    public function testAGameWithNoGermanEditionYieldsNoAlias(): void
    {
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="7"><name type="primary" value="Azul"/>' .
            $this->versionsXml([['Azul', ['English']], ['Azul', ['French']]]) .
            '</item>'
        ));

        $client->lookup(7);

        $this->assertNull($this->germanAliasFor(7));
    }

    public function testACuratedAliasIsNotDisplacedByTheDerivedOne(): void
    {
        // DITO! and Die Insel der Mookies are Spiel-des-Jahres titles BGG's
        // version data cannot know. preferredName() takes the first row it
        // finds, so a second German row for one game would make the displayed
        // title arbitrary - the curated one has to stay alone.
        $this->seedAlias(400495, 'DITO!');

        $client = new BggClient(fn() => $this->thingXml(
            '<item id="400495"><name type="primary" value="JinxO"/>' .
            $this->versionsXml([['Jinx-O', ['German']]]) .
            '</item>'
        ));

        $client->lookup(400495);

        $stmt = db()->prepare("SELECT name FROM game_aliases WHERE bgg_id = ? AND lang = 'de'");
        $stmt->execute([400495]);
        $this->assertSame(['DITO!'], $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function testATitleAnotherGameAlreadyClaimsIsNotDuplicated(): void
    {
        // The `name` UNIQUE key exists because an alias must resolve to
        // exactly one bgg_id (#108). A derived title colliding with an
        // existing row has to be dropped, not error the whole lookup.
        $this->seedAlias(13, 'Die Siedler von Catan');

        $client = new BggClient(fn() => $this->thingXml(
            '<item id="99999"><name type="primary" value="Settlers Reprint"/>' .
            $this->versionsXml([['Die Siedler von Catan', ['German']]]) .
            '</item>'
        ));

        $client->lookup(99999);

        $this->assertNull($this->germanAliasFor(99999));
        $this->assertSame('Die Siedler von Catan', $this->germanAliasFor(13));
    }

    public function testVersionsAreRequestedOnTheFirstPageOnly(): void
    {
        // versions=1 costs no extra request but roughly quadruples the
        // response (Catan: 61 KB -> 260 KB, measured 2026-08-19). The comment
        // pages never read the block, so paying for it there is pure waste.
        $urls = [];
        $client = new BggClient(function (string $url) use (&$urls) {
            $urls[] = $url;
            $page = str_contains($url, 'page=2') ? 2 : 1;

            return $this->thingXml(
                '<item id="13"><name type="primary" value="Catan"/>' .
                '<comments totalitems="150" page="' . $page . '">' .
                '<comment username="a" rating="9" value="Good."/>' .
                '<comment username="b" rating="2" value="Bad."/>' .
                '</comments></item>'
            );
        });

        $client->lookup(13);

        $this->assertCount(2, $urls, 'a 150-comment game is fetched over two pages');
        $this->assertStringContainsString('versions=1', $urls[0]);
        $this->assertStringNotContainsString('versions', $urls[1]);
    }

    public function testTheCoverUrlsAreCarriedFromTheThingResponse(): void
    {
        // #135: no extra request - <thumbnail> and <image> ride along in the
        // response already fetched for description and rank.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="342942"><name type="primary" value="Ark Nova"/>' .
            '<thumbnail>https://cf.geekdo-images.com/x__small/img/y=/fit-in/200x150/pic6293412.jpg</thumbnail>' .
            '<image>https://cf.geekdo-images.com/x__original/img/z=/0x0/pic6293412.jpg</image>' .
            '</item>'
        ));

        $result = $client->lookup(342942);

        $this->assertSame(
            'https://cf.geekdo-images.com/x__small/img/y=/fit-in/200x150/pic6293412.jpg',
            $result['thumbnail']
        );
        $this->assertSame(
            'https://cf.geekdo-images.com/x__original/img/z=/0x0/pic6293412.jpg',
            $result['image']
        );
    }

    public function testAGameWithNoCoverYieldsNullRatherThanAnEmptyString(): void
    {
        // An empty string is a truthy-looking src that renders as a broken
        // image; null is what the card checks for to keep its placeholder.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="7"><name type="primary" value="Azul"/></item>'
        ));

        $result = $client->lookup(7);

        $this->assertNull($result['thumbnail']);
        $this->assertNull($result['image']);
    }

    public function testGoodSnippetComesFromTheLastCommentPage(): void
    {
        // BGG sorts rating comments ascending, so page 1 holds only the worst
        // ones - measured on Catan, all 29 usable page-1 comments rated 1 and
        // all 7 on the last page rated 10. Reading "the good" off page 1 puts
        // a 1-star rant under a green "The good" heading, which is worse than
        // showing nothing.
        $pages = [];
        $client = new BggClient(function (string $url) use (&$pages) {
            parse_str(parse_url($url, PHP_URL_QUERY) ?: '', $q);
            $pages[] = (int) $q['page'];
            $comments = (int) $q['page'] === 1
                ? '<comment username="a" rating="1" value="Roll a dice, get shafted."/>'
                . '<comment username="b" rating="1" value="Boring, no playtesting."/>'
                . '<comment username="c" rating="2" value="Too much luck."/>'
                : '<comment username="z" rating="10" value="The one everyone owns."/>'
                . '<comment username="y" rating="9" value="A gateway classic."/>'
                . '<comment username="x" rating="9" value="Still fun after decades."/>';

            return $this->thingXml(
                '<item id="13"><name type="primary" value="Catan"/>' .
                '<comments totalitems="250" page="' . $q['page'] . '">' . $comments . '</comments>' .
                '</item>'
            );
        });

        $result = $client->lookup(13);

        $this->assertSame([1, 3], $pages, 'the second request must ask for the last page: ceil(250/100)');
        $this->assertSame(
            ['The one everyone owns.', 'A gateway classic.', 'Still fun after decades.'],
            $result['good']
        );
        $this->assertSame(
            ['Roll a dice, get shafted.', 'Boring, no playtesting.', 'Too much luck.'],
            $result['bad']
        );
    }

    public function testLookupStillAnswersWhenTheLastCommentPageFails(): void
    {
        // The extra request buys a nicer snippet; it must never cost the game.
        $client = new BggClient(fn(string $url) => str_contains($url, 'page=3')
            ? null
            : $this->thingXml(
                '<item id="13"><name type="primary" value="Catan"/>' .
                '<comments totalitems="250" page="1">' .
                '<comment username="a" rating="4" value="Fine, dated."/>' .
                '</comments></item>'
            ));

        $result = $client->lookup(13);

        $this->assertSame('Catan', $result['name']);
        $this->assertNull($result['good'], 'page 1 holds the worst ratings - it cannot supply the best');
        $this->assertSame(['Fine, dated.'], $result['bad'], 'the worst still comes off the page we did get');
    }

    public function testWalksBackAPageWhenTheLastOneIsAllTextlessRatings(): void
    {
        // Ark Nova's real shape (id 342942, measured 2026-08-19): 62,710
        // comments, so page 628 is the last - and all 10 comments on it are
        // rated 10 with value="", ratings nobody wrote anything for. The
        // result was no praise at all next to three complaints. Page 627 does
        // carry written 10s, and it is still the same top-rating band, so it
        // is safe to read.
        $pages = [];
        $client = new BggClient(function (string $url) use (&$pages) {
            parse_str(parse_url($url, PHP_URL_QUERY) ?: '', $q);
            $page = (int) $q['page'];
            $pages[] = $page;
            $comments = match ($page) {
                628 => '<comment username="a" rating="10" value=""/><comment username="b" rating="10" value=""/>',
                627 => '<comment username="c" rating="10" value="Outstanding boardgame."/>',
                default => '<comment username="z" rating="1" value="Overrated and overhyped."/>',
            };
            return $this->thingXml(
                '<item id="342942"><name type="primary" value="Ark Nova"/>' .
                '<comments totalitems="62710" page="' . $page . '">' . $comments . '</comments></item>'
            );
        });

        $result = $client->lookup(342942);

        $this->assertSame([1, 628, 627], $pages, 'walks back from the last page, never forward towards page 1');
        $this->assertSame(['Outstanding boardgame.'], $result['good']);
    }

    public function testGivesUpRatherThanReachingPageOneWhenEveryHighPageIsTextless(): void
    {
        // The walk-back must stay in the top band. With only 3 pages, backing
        // up far enough would land on page 1 - the WORST comments - so it
        // stops instead and reports no praise. Comments are sorted ascending,
        // so the fixture keeps the 10s on the top pages and the 1s on page 1,
        // the way BGG actually returns them.
        $pages = [];
        $client = new BggClient(function (string $url) use (&$pages) {
            parse_str(parse_url($url, PHP_URL_QUERY) ?: '', $q);
            $page = (int) $q['page'];
            $pages[] = $page;
            $comments = $page === 1
                ? '<comment username="z" rating="1" value="Dreadful."/>'
                : '<comment username="a" rating="10" value=""/>'; // rated, never written
            return $this->thingXml(
                '<item id="13"><name type="primary" value="Catan"/>' .
                '<comments totalitems="250" page="' . $page . '">' . $comments . '</comments></item>'
            );
        });

        $result = $client->lookup(13);

        $this->assertNull($result['good'], 'no praise beats a one-star rant printed as praise');
        $this->assertSame(['Dreadful.'], $result['bad'], 'the complaint still comes off page 1, as always');
        $this->assertSame([1, 3, 2], $pages, 'stops at page 2 - page 1 is never read as a source of praise');
    }

    public function testAFailedBestPageNeverPrintsALowRatingAsThePraise(): void
    {
        // Rating comments arrive sorted ascending, so page 1 is nothing but
        // the lowest scores. Falling back to "the highest rating on page 1"
        // printed a one-star rant under the green heading in production
        // (id 266192, 2026-08-17) - the very defect the last-page fetch exists
        // to prevent, reinstated on every transient failure and then cached
        // for 14 days.
        $client = new BggClient(fn(string $url) => str_contains($url, 'page=3')
            ? null
            : $this->thingXml(
                '<item id="13"><name type="primary" value="Catan"/>' .
                '<comments totalitems="250" page="1">' .
                '<comment username="a" rating="1" value="Terrible, no playtesting."/>' .
                '<comment username="b" rating="1" value="Dull and slow."/>' .
                '</comments></item>'
            ));

        $result = $client->lookup(13);

        $this->assertSame('Catan', $result['name'], 'a missing snippet must never cost the game');
        $this->assertNull($result['good'], 'no praise beats a one-star rant labelled as praise');
        $this->assertNotNull($result['bad'], 'the bad snippet is exactly what page 1 can supply');
    }

    // Under one comment page, bestComments() hands back the exact same page
    // as $worstPage - a game with only a handful of comments can have its
    // top-3-best and bottom-3-worst genuinely overlap, and a comment must
    // never be printed under both headings.
    public function testNeverShowsTheSameCommentUnderBothGoodAndBad(): void
    {
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="7"><name type="primary" value="Azul"/>' .
            '<comments totalitems="4" page="1">' .
            '<comment username="a" rating="9" value="Lovely tiles."/>' .
            '<comment username="b" rating="8" value="Solid abstract."/>' .
            '<comment username="c" rating="5" value="Middle of the road."/>' .
            '<comment username="d" rating="4" value="Once was enough."/>' .
            '</comments></item>'
        ));

        $result = $client->lookup(7);

        $this->assertSame(['Lovely tiles.', 'Solid abstract.', 'Middle of the road.'], $result['good']);
        // "Middle of the road." already used above - the bottom 3 of 4 would
        // otherwise repeat it here.
        $this->assertSame(['Once was enough.'], $result['bad']);
    }

    public function testLookupSurfacesTheStrategyAndFamilyGameRanks(): void
    {
        // Real shape from BGG's live thing response (id 13, probed
        // 2026-08-18): the overall rank sits alongside two "family" league
        // tables this project did not read before.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="13"><name type="primary" value="Catan"/>' .
            '<statistics><ratings><ranks>' .
            '<rank type="subtype" name="boardgame" value="627"/>' .
            '<rank type="family" name="strategygames" value="592"/>' .
            '<rank type="family" name="familygames" value="206"/>' .
            '</ranks></ratings></statistics>' .
            '</item>'
        ));

        $result = $client->lookup(13);

        $this->assertSame(592, $result['strategyRank']);
        $this->assertSame(206, $result['familyRank']);
    }

    public function testLookupSurfacesTheThematicRank(): void
    {
        // A third "family" league table, same shape as strategy/family games -
        // probed live on Pandemic Legacy: Season 1 (id 161936, 2026-08-18):
        // #1 thematic and #3 strategy at once.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="161936"><name type="primary" value="Pandemic Legacy: Season 1"/>' .
            '<statistics><ratings><ranks>' .
            '<rank type="subtype" name="boardgame" value="3"/>' .
            '<rank type="family" name="thematic" value="1"/>' .
            '<rank type="family" name="strategygames" value="3"/>' .
            '</ranks></ratings></statistics>' .
            '</item>'
        ));

        $result = $client->lookup(161936);

        $this->assertSame(1, $result['thematicRank']);
        $this->assertSame(3, $result['strategyRank']);
    }

    public function testStrategyAndFamilyRanksAreNullWhenBggHasNoSuchLeagueTable(): void
    {
        // Most of BGG's catalog carries no family rank at all (party games,
        // abstracts with too few ratings, ...) - absence, not "Not Ranked".
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="13"><name type="primary" value="Catan"/>' .
            '<statistics><ratings><ranks>' .
            '<rank type="subtype" name="boardgame" value="627"/>' .
            '</ranks></ratings></statistics>' .
            '</item>'
        ));

        $result = $client->lookup(13);

        $this->assertNull($result['strategyRank']);
        $this->assertNull($result['familyRank']);
        $this->assertNull($result['thematicRank']);
    }

    public function testLookupSurfacesPlayerCountDurationAndAgeFromBgg(): void
    {
        // Real shape from BGG's live thing response (id 161936, probed
        // 2026-08-18) - fields this project fetched but never read, left
        // null on every game the German H@LL9000 site has no listing for.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="161936"><name type="primary" value="Pandemic Legacy: Season 1"/>' .
            '<minplayers value="2"/><maxplayers value="4"/>' .
            '<minplaytime value="60"/><maxplaytime value="60"/>' .
            '<minage value="13"/>' .
            '</item>'
        ));

        $result = $client->lookup(161936);

        $this->assertSame('2 - 4', $result['players']);
        // German phrasing, matching H@LL9000's own exactly - this is a
        // fallback for the same card, not a different language for it.
        $this->assertSame('60 Minuten', $result['duration']);
        $this->assertSame('ab 13 Jahren', $result['age']);
    }

    public function testPlayerCountAndDurationCollapseToASingleNumberWhenMinEqualsMax(): void
    {
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="13"><name type="primary" value="Catan"/>' .
            '<minplayers value="4"/><maxplayers value="4"/>' .
            '<minplaytime value="90"/><maxplaytime value="90"/>' .
            '</item>'
        ));

        $result = $client->lookup(13);

        $this->assertSame('4', $result['players'], 'a range with the same min and max reads worse than a single number');
        $this->assertSame('90 Minuten', $result['duration']);
    }

    public function testLookupSurfacesComplexityFromBggsAverageweight(): void
    {
        // brettspiele-report wins in lookup.php when it has an entry; this
        // is the fallback BggClient itself supplies for when it doesn't -
        // same 1-5 scale, BGG's own community weight poll.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="161936"><name type="primary" value="Pandemic Legacy: Season 1"/>' .
            '<statistics><ratings><averageweight value="2.8283"/></ratings></statistics>' .
            '</item>'
        ));

        $result = $client->lookup(161936);

        $this->assertSame(['value' => 2.83, 'max' => 5, 'source' => 'BoardGameGeek'], $result['complexity']);
    }

    public function testComplexityIsNullWhenBggHasNoWeightVotesYet(): void
    {
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="13"><name type="primary" value="Catan"/>' .
            '<statistics><ratings><averageweight value="0"/></ratings></statistics>' .
            '</item>'
        ));

        $result = $client->lookup(13);

        $this->assertNull($result['complexity']);
    }

    public function testPlayerCountDurationAndAgeAreNullWhenBggHasNoSuchData(): void
    {
        // BGG uses 0, not an absent tag, for "not set" - 0 must not render
        // as "0 - 0" or "Age: 0+".
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="13"><name type="primary" value="Catan"/>' .
            '<minplayers value="0"/><maxplayers value="0"/>' .
            '</item>'
        ));

        $result = $client->lookup(13);

        $this->assertNull($result['players']);
        $this->assertNull($result['duration']);
        $this->assertNull($result['age']);
    }

    public function testLookupSurfacesMechanicAndCategoryLabels(): void
    {
        // #131: BGG carries mechanics and categories (the theme) as <link>
        // children on the thing - already fetched, now read. Other link types
        // (designer, publisher, ...) are left out of these two lists. Each
        // carries BGG's own id (needed to link to BGG's page for the tag).
        $client = new BggClient(fn(string $url) => $this->thingXml(
            '<item id="13"><name type="primary" value="Catan"/>' .
            '<link type="boardgamecategory" id="1021" value="Negotiation"/>' .
            '<link type="boardgamemechanic" id="2072" value="Dice Rolling"/>' .
            '<link type="boardgamemechanic" id="2008" value="Trading"/>' .
            '<link type="boardgamedesigner" id="9" value="Klaus Teuber"/>' .
            '</item>'
        ));

        $result = $client->lookup(13);

        $this->assertSame([['id' => 1021, 'name' => 'Negotiation']], $result['categories']);
        $this->assertSame(
            [['id' => 2072, 'name' => 'Dice Rolling'], ['id' => 2008, 'name' => 'Trading']],
            $result['mechanics'],
            'BGG order, designer link ignored'
        );
    }

    public function testInteractionTypeIsCooperativeWhenTheMechanicIsPresent(): void
    {
        // Chronicles of Crime's real shape (id 239188, probed 2026-08-19).
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="239188"><name type="primary" value="Chronicles of Crime"/>' .
            '<link type="boardgamemechanic" id="2023" value="Cooperative Game"/>' .
            '<link type="boardgamemechanic" id="2027" value="Storytelling"/>' .
            '</item>'
        ));

        $this->assertSame('cooperative', $client->lookup(239188)['interaction']);
    }

    public function testInteractionTypeIsOneVsAllWhenTraitorOutranksCooperative(): void
    {
        // Mansions of Madness 2E's real shape (id 205059, probed 2026-08-19):
        // carries BOTH Cooperative Game and Traitor Game - the hidden-enemy
        // twist is the more honest read of "who is actually playing against
        // whom" than plain cooperative would be.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="205059"><name type="primary" value="Mansions of Madness: Second Edition"/>' .
            '<link type="boardgamemechanic" id="2023" value="Cooperative Game"/>' .
            '<link type="boardgamemechanic" id="2814" value="Traitor Game"/>' .
            '</item>'
        ));

        $this->assertSame('one-vs-all', $client->lookup(205059)['interaction']);
    }

    public function testInteractionTypeIsCompetitiveWhenNeitherMarkerIsPresent(): void
    {
        // Wingspan's real shape (id 266192, probed 2026-08-19): mechanics are
        // present but carry none of the coop/traitor markers - a real
        // negative signal, not a guess, since BGG does tag cooperative games.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="266192"><name type="primary" value="Wingspan"/>' .
            '<link type="boardgamemechanic" id="2004" value="Set Collection"/>' .
            '</item>'
        ));

        $this->assertSame('competitive', $client->lookup(266192)['interaction']);
    }

    public function testInteractionTypeIsNullRatherThanAGuessWhenThereAreNoMechanicsAtAll(): void
    {
        $client = new BggClient(fn() => $this->thingXml('<item id="13"><name type="primary" value="Catan"/></item>'));

        $this->assertNull($client->lookup(13)['interaction']);
    }

    public function testASingleCommentPageStillSuppliesBothSnippets(): void
    {
        // Under one page there is no last page to fetch: everything BGG holds
        // is already in hand, so both extremes come off it. Distinct from a
        // failed fetch, which must yield no praise at all.
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="7"><name type="primary" value="Azul"/>' .
            '<comments totalitems="6" page="1">' .
            '<comment username="a" rating="9" value="Beautiful and tight."/>' .
            '<comment username="b" rating="9" value="A great gateway game."/>' .
            '<comment username="c" rating="8" value="Gorgeous components."/>' .
            '<comment username="d" rating="3" value="Repetitive."/>' .
            '<comment username="e" rating="2" value="No real interaction."/>' .
            '<comment username="f" rating="1" value="Solitaire with extra steps."/>' .
            '</comments></item>'
        ));

        $result = $client->lookup(7);

        $this->assertSame(
            ['Beautiful and tight.', 'A great gateway game.', 'Gorgeous components.'],
            $result['good']
        );
        $this->assertSame(
            ['Solitaire with extra steps.', 'No real interaction.', 'Repetitive.'],
            $result['bad']
        );
    }

    public function testLookupCacheHitDoesNotCallFetcherAgain(): void
    {
        $calls = 0;
        $fetcher = function () use (&$calls) {
            $calls++;
            return $this->thingXml('<item id="42"><name type="primary" value="Wingspan"/><description>Birds.</description></item>');
        };

        (new BggClient($fetcher))->lookup(42);
        (new BggClient($fetcher))->lookup(42);

        $this->assertSame(1, $calls, 'second lookup within the TTL should be served from bgg_lookup_cache');
    }

    public function testLookupExpiredCacheEntryTriggersRefetch(): void
    {
        $calls = 0;
        $fetcher = function () use (&$calls) {
            $calls++;
            return $this->thingXml('<item id="7"><name type="primary" value="Azul"/><description>Tiles.</description></item>');
        };

        (new BggClient($fetcher))->lookup(7);
        db()->exec("UPDATE bgg_lookup_cache SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE bgg_id = 7");
        (new BggClient($fetcher))->lookup(7);

        $this->assertSame(2, $calls, 'an expired cache row must not be served');
    }

    public function testLookupReturnsNullWhenBggHasNoSuchGame(): void
    {
        // BGG answers a real "no such id" with a 200 and an empty <items/>,
        // which is data, not a failure - a genuine 404 for the caller.
        $client = new BggClient(fn() => $this->thingXml(''));

        $this->assertNull($client->lookup(999999));
    }

    public function testLookupThrowsWhenTheBggCallFailsAndNoLocalDataExists(): void
    {
        // A null fetch means the HTTP call itself failed (timeout, 401, 5xx).
        // That must not be reported as "game not found" - the endpoint turns
        // a throw into a 502, which is the honest answer.
        $client = new BggClient(fn() => null);

        $this->expectException(RuntimeException::class);
        $client->lookup(999999);
    }

    public function testResolveSearchThrowsWhenTheBggCallFailsAndNoLocalDataExists(): void
    {
        $client = new BggClient(fn() => null);

        $this->expectException(RuntimeException::class);
        $client->resolveSearch('catan');
    }

    public function testLookupFallsBackToTheLocalRanksTableWhenBggIsUnreachable(): void
    {
        $this->seedRanks();
        $client = new BggClient(fn() => null);

        $result = $client->lookup(13);

        $this->assertSame('Catan', $result['name']);
        $this->assertSame(7.1, $result['rating']);
        $this->assertSame(143738, $result['numRatings']);
        $this->assertTrue($result['partial'], 'a ranks-backed answer carries no description or comments');
        $this->assertSame('', $result['description']);
        $this->assertNull($result['good']);
        $this->assertNull($result['bad']);
        $this->assertSame('https://boardgamegeek.com/boardgame/13', $result['source']['url']);
    }

    public function testFallbackLookupReportsWhetherTheGameIsAnExpansion(): void
    {
        $this->seedRanks();
        $client = new BggClient(fn() => null);

        $this->assertTrue($client->lookup(926)['isExpansion'], 'Cities & Knights needs a base game');
        $this->assertFalse($client->lookup(13)['isExpansion']);
    }

    public function testLookupReadsTheExpansionFlagFromTheThingType(): void
    {
        // The live answer carries it on the item itself, so the flag survives
        // BGG coming back - it is not a fallback-only field.
        $expansion = new BggClient(fn() => $this->thingXml(
            '<item type="boardgameexpansion" id="926"><name type="primary" value="Catan: Cities &amp; Knights"/></item>'
        ));
        $this->assertTrue($expansion->lookup(926)['isExpansion']);

        $base = new BggClient(fn() => $this->thingXml(
            '<item type="boardgame" id="13"><name type="primary" value="Catan"/></item>'
        ));
        $this->assertFalse($base->lookup(13)['isExpansion']);
    }

    public function testLookupCarriesTheDumpsRankOnBothPaths(): void
    {
        $this->seedRanks();

        // Served from the dump…
        $this->assertSame(566, (new BggClient(fn() => null))->lookup(13)['rank']);

        // …and from the live API, which does not carry the dump's rank
        // itself. Without this the field would vanish the moment #40 clears.
        $live = new BggClient(fn() => $this->thingXml(
            '<item type="boardgame" id="13"><name type="primary" value="Catan"/></item>'
        ));
        $this->assertSame(566, $live->lookup(13)['rank']);
    }

    public function testALiveLookupRefreshesTheDumpsRankFromBggsOwnStats(): void
    {
        // The rank travels in the stats block the lookup already fetches, so
        // keeping the dump current costs no extra request - and it happens on
        // a cache miss only, once per game per TTL.
        $this->seedRanks(); // Catan seeded at 566
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="13"><name type="primary" value="Catan"/>' .
            '<statistics><ratings><ranks>' .
            '<rank type="subtype" name="boardgame" value="627"/>' .
            '<rank type="family" name="strategygames" value="49"/>' .
            '</ranks></ratings></statistics></item>'
        ));

        $this->assertSame(627, $client->lookup(13)['rank'], 'the served rank is the refreshed one');
        $this->assertSame(
            '627',
            (string) db()->query('SELECT bgg_rank FROM bgg_ranks WHERE bgg_id = 13')->fetchColumn(),
            'and it is persisted, so every later reader sees it'
        );
    }

    public function testTheFamilyRankIsNeverMistakenForTheOverallOne(): void
    {
        $this->seedRanks();
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="13"><name type="primary" value="Catan"/>' .
            '<statistics><ratings><ranks>' .
            '<rank type="family" name="strategygames" value="49"/>' .
            '</ranks></ratings></statistics></item>'
        ));

        $client->lookup(13);

        $this->assertSame(
            '566',
            (string) db()->query('SELECT bgg_rank FROM bgg_ranks WHERE bgg_id = 13')->fetchColumn(),
            'a family rank is a different league table, not an overall position'
        );
    }

    public function testAnUnrankedGameDoesNotOverwriteTheDumpsRank(): void
    {
        // BGG writes "Not Ranked" for the four fifths of its catalog it does
        // not rank. Writing that through would blank a rank we already have.
        $this->seedRanks();
        $client = new BggClient(fn() => $this->thingXml(
            '<item id="13"><name type="primary" value="Catan"/>' .
            '<statistics><ratings><ranks>' .
            '<rank type="subtype" name="boardgame" value="Not Ranked"/>' .
            '</ranks></ratings></statistics></item>'
        ));

        $client->lookup(13);

        $this->assertSame(
            '566',
            (string) db()->query('SELECT bgg_rank FROM bgg_ranks WHERE bgg_id = 13')->fetchColumn()
        );
    }

    public function testAGameBggDoesNotHaveIsRememberedRatherThanReAsked(): void
    {
        // #72: an id the source has no entry for used to cost a full throttled
        // request on every single page load. BGG's empty <items/> is an
        // answer, not a failure - failures still throw and stay uncached.
        $calls = 0;
        $fetcher = function () use (&$calls) {
            $calls++;
            return $this->thingXml('');
        };

        $this->assertNull((new BggClient($fetcher))->lookup(999999));
        $this->assertNull((new BggClient($fetcher))->lookup(999999));

        $this->assertSame(1, $calls, '"no such game" belongs in the cache too');
    }

    public function testAnUnrankedGameReportsNoRankRatherThanZero(): void
    {
        $this->seedRanks();

        // BGG ranks only games past a ratings threshold; 0 in the dump means
        // "unranked", and rendering it as rank 0 would be a wrong answer.
        $this->assertNull((new BggClient(fn() => null))->lookup(266192)['rank']);
    }

    public function testLookupReportsNoRankWhenTheDumpHasNotBeenImported(): void
    {
        $client = new BggClient(fn() => $this->thingXml(
            '<item type="boardgame" id="13"><name type="primary" value="Catan"/></item>'
        ));

        $this->assertNull($client->lookup(13)['rank'], 'an empty bgg_ranks must not break a live answer');
    }

    public function testFallbackLookupIsNotCached(): void
    {
        $this->seedRanks();
        (new BggClient(fn() => null))->lookup(13);

        $this->assertSame(
            0,
            (int) db()->query('SELECT COUNT(*) FROM bgg_lookup_cache WHERE bgg_id = 13')->fetchColumn(),
            'dump-derived data must not occupy the 14-day cache - it would outlive the outage that caused it'
        );
    }

    public function testResolveSearchFallsBackToAnExactLocalNameMatch(): void
    {
        $this->seedRanks();

        $this->assertSame(
            ['status' => 'ok', 'bggId' => 13],
            (new BggClient(fn() => null))->resolveSearch('  CATAN ')
        );
    }

    public function testResolveSearchFallbackOffersLocalPrefixMatchesForDisambiguation(): void
    {
        $this->seedRanks();

        $result = (new BggClient(fn() => null))->resolveSearch('cat');

        $this->assertSame('disambiguation', $result['status']);
        $this->assertCount(2, $result['candidates']);
        // Most-rated first, so the game people actually meant leads.
        $this->assertSame(13, $result['candidates'][0]['bggId']);
        $this->assertSame(1995, $result['candidates'][0]['yearPublished']);
    }

    public function testResolveSearchFallbackMatchesLocalNameWithPunctuationStripped(): void
    {
        // #73: the dump stores "Brass: Birmingham" but a user has no reason
        // to type the colon. Exact and prefix passes both miss it verbatim,
        // so a third, punctuation-insensitive pass must catch it instead of
        // falling through to the "can't confirm" error.
        db()->exec(
            "INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES
             (224517, 'Brass: Birmingham', 2018, 8.6, 50000, 0, 5)"
        );

        $this->assertSame(
            ['status' => 'ok', 'bggId' => 224517],
            (new BggClient(fn() => null))->resolveSearch('Brass Birmingham')
        );
    }

    public function testResolveSearchFallbackResolvesAGermanAliasToItsGame(): void
    {
        // #132: the local/instant path had zero German-name knowledge before
        // this - only bgg_ranks.name (BGG's primary name), which is why the
        // live BGG search resolving a German title was not "enough".
        $this->seedRanks();
        $this->seedAlias(13, 'Die Siedler von Catan');

        $this->assertSame(
            ['status' => 'ok', 'bggId' => 13],
            (new BggClient(fn() => null))->resolveSearch('Die Siedler von Catan')
        );
    }

    public function testSuggestOffersAGameByItsGermanAlias(): void
    {
        $this->seedRanks();
        $this->seedAlias(266192, 'Flügelschlag');

        $suggestions = (new BggClient(fn() => null))->suggest('Flügel');

        $this->assertSame([266192], array_column($suggestions, 'bggId'));
        $this->assertSame('Flügelschlag', $suggestions[0]['name'], 'shows the name the query actually matched, not the primary');
    }

    public function testAnAliasCollidingWithAnUnrelatedGamesRealNameIsDisambiguationNotAGuess(): void
    {
        // #108's own requirement: an alias must never silently shadow a real
        // BGG title for a different game.
        $this->seedRanks();
        db()->exec(
            "INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES
             (999, 'Catan Legacy', 2024, 8.0, 5000, 0, 100)"
        );
        $this->seedAlias(13, 'Catan Legacy');

        $result = (new BggClient(fn() => null))->resolveSearch('Catan Legacy');

        $this->assertSame('disambiguation', $result['status']);
        $this->assertEqualsCanonicalizing([999, 13], array_column($result['candidates'], 'bggId'));
    }

    public function testAnAliasIdenticalToItsOwnGamesPrimaryNameDoesNotDuplicateIt(): void
    {
        $this->seedRanks();
        $this->seedAlias(13, 'Catan');

        $result = (new BggClient(fn() => null))->resolveSearch('Catan');

        $this->assertSame(['status' => 'ok', 'bggId' => 13], $result, 'UNION must collapse the identical row, not offer a false disambiguation');
    }

    public function testSuggestPrefersTheGermanAliasEvenWhenTheQueryMatchedThePrimaryName(): void
    {
        // #130: typing "Catan" (matches the primary name, not the alias)
        // with DE active must still show "Die Siedler von Catan" - display
        // preference is a separate concern from what the query matched.
        $this->seedRanks();
        $this->seedAlias(13, 'Die Siedler von Catan');

        $suggestions = (new BggClient(fn() => null))->suggest('Catan', 3, 'de');

        $this->assertSame('Die Siedler von Catan', $suggestions[0]['name']);
    }

    public function testSuggestIgnoresLangWhenNoAliasExistsInThatLanguage(): void
    {
        $this->seedRanks();

        $suggestions = (new BggClient(fn() => null))->suggest('Catan', 3, 'de');

        $this->assertSame('Catan', $suggestions[0]['name'], 'falls back to the primary name, not blank or an error');
    }

    public function testSuggestUsesThePrimaryNameWhenLangIsNull(): void
    {
        $this->seedRanks();
        $this->seedAlias(13, 'Die Siedler von Catan');

        $suggestions = (new BggClient(fn() => null))->suggest('Catan');

        $this->assertSame('Catan', $suggestions[0]['name'], "today's behaviour, unchanged when lang is not requested");
    }

    public function testDidYouMeanAlsoPrefersTheGermanAlias(): void
    {
        $this->seedRanks();
        $this->seedAlias(13, 'Die Siedler von Catan');

        // A typo close enough to "Catan" to surface it as a suggestion.
        $suggestions = (new BggClient(fn() => null))->didYouMean('Catn', 5, 'de');

        $this->assertSame('Die Siedler von Catan', $suggestions[0]['name']);
    }

    public function testLocalLookupTitlePrefersTheGermanAlias(): void
    {
        $this->seedRanks();
        $this->seedAlias(13, 'Die Siedler von Catan');

        $result = (new BggClient(fn() => null))->lookupLocal('Catan', 'de');

        $this->assertSame('Die Siedler von Catan', $result['game']['name']);
    }

    public function testLocalLookupByIdTitlePrefersTheGermanAlias(): void
    {
        $this->seedRanks();
        $this->seedAlias(266192, 'Flügelschlag');

        $result = (new BggClient(fn() => null))->lookupLocalById(266192, 'de');

        $this->assertSame('Flügelschlag', $result['game']['name']);
    }

    public function testPreferredNameIsNullWhenNoAliasExistsInThatLanguage(): void
    {
        $this->seedRanks();

        $this->assertNull((new BggClient(fn() => null))->preferredName(13, 'de'));
    }

    public function testAliasNamesFeedTheSecondarySourceSearch(): void
    {
        // lookup.php searches amazon.de / brettspiele-report / H@LL9000 under
        // these as well as BGG's primary name. german_name_candidates() only
        // recognises a title carrying a German marker, so "Arche Nova" (no
        // umlaut, no die/der/von/spiel) scores 0 and never gets tried - which
        // is why Ark Nova had no price. A curated alias is the exact answer
        // where the heuristic is a guess.
        $this->seedAlias(342942, 'Arche Nova');
        $this->seedAlias(13, 'Die Siedler von Catan');

        $this->assertSame(['Arche Nova'], (new BggClient(fn() => null))->aliasNames(342942));
        $this->assertSame([], (new BggClient(fn() => null))->aliasNames(999), 'a game with no alias adds no search terms');
    }

    public function testResolveSearchFallbackAnswersNotFoundRatherThanThrowingWhenTheDumpIsPopulated(): void
    {
        // This test asserted a throw until #92. The dump is BGG's whole
        // catalogue, so with rows present and nothing matching, "no such
        // game" is a supportable answer - and reporting it as a 502 was the
        // bug. The genuine can't-see case is covered by
        // testResolveSearchStillThrowsWhenTheDumpIsEmpty below.
        $this->seedRanks();

        $this->assertSame(
            ['status' => 'not_found'],
            (new BggClient(fn() => null))->resolveSearch('zzzznonexistentgamezzzz')
        );
    }

    public function testConfiguredTokenIsSentAsAnAuthorizationHeader(): void
    {
        $seen = null;
        $client = new BggClient(function ($url, $timeout = 10, array $headers = []) use (&$seen) {
            $seen = $headers;
            return $this->thingXml('<item id="7"><name type="primary" value="Azul"/></item>');
        }, 'test-token-123');

        $client->lookup(7);

        $this->assertContains('Authorization: Bearer test-token-123', $seen);
    }

    public function testNoAuthorizationHeaderIsSentWhenNoTokenIsConfigured(): void
    {
        $seen = null;
        $client = new BggClient(function ($url, $timeout = 10, array $headers = []) use (&$seen) {
            $seen = $headers;
            return $this->thingXml('<item id="7"><name type="primary" value="Azul"/></item>');
        }, '');

        $client->lookup(7);

        $this->assertSame([], $seen, 'an empty token must not produce a header at all');
    }

    private function searchXml(string $inner): SimpleXMLElement
    {
        return new SimpleXMLElement('<items>' . $inner . '</items>');
    }

    public function testResolveSearchSingleMatchResolvesAndCaches(): void
    {
        $calls = 0;
        $fetcher = function () use (&$calls) {
            $calls++;
            return $this->searchXml('<item id="13" type="boardgame"><name type="primary" value="Catan"/><yearpublished value="1995"/></item>');
        };

        $result = (new BggClient($fetcher))->resolveSearch('catan');
        $this->assertSame(['status' => 'ok', 'bggId' => 13], $result);

        // Second call for the same (normalized) query must hit
        // bgg_search_cache, not the fetcher again.
        $second = (new BggClient($fetcher))->resolveSearch('  Catan ');
        $this->assertSame(['status' => 'ok', 'bggId' => 13], $second);
        $this->assertSame(1, $calls, 'resolved query should be served from bgg_search_cache on repeat, case/whitespace-insensitive');
    }

    public function testResolveSearchMultipleMatchesReturnsDisambiguationWithoutCaching(): void
    {
        $calls = 0;
        $fetcher = function () use (&$calls) {
            $calls++;
            return $this->searchXml(
                '<item id="13" type="boardgame"><name type="primary" value="Catan"/><yearpublished value="1995"/></item>' .
                '<item id="1234" type="boardgame"><name type="primary" value="Catan: Cities and Knights"/><yearpublished value="1998"/></item>'
            );
        };

        $result = (new BggClient($fetcher))->resolveSearch('catan');

        $this->assertSame('disambiguation', $result['status']);
        $this->assertCount(2, $result['candidates']);
        $this->assertSame(['bggId' => 13, 'name' => 'Catan', 'yearPublished' => 1995], $result['candidates'][0]);

        (new BggClient($fetcher))->resolveSearch('catan');
        $this->assertSame(2, $calls, 'an ambiguous query must not be cached - it should re-search every time until resolved');
    }

    public function testResolveSearchSortsTheBaseGameAboveItsOwnExpansion(): void
    {
        // #108: BGG's own search order is not trustworthy - put the
        // expansion first in the raw response and confirm the known base
        // game (bgg_ranks.is_expansion = 0) still sorts to the top.
        $this->seedRanks();
        $client = new BggClient(fn() => $this->searchXml(
            '<item id="926" type="boardgame"><name type="primary" value="Catan: Cities &amp; Knights"/><yearpublished value="1998"/></item>' .
            '<item id="13" type="boardgame"><name type="primary" value="Catan"/><yearpublished value="1995"/></item>'
        ));

        $result = $client->resolveSearch('catan');

        $this->assertSame([13, 926], array_column($result['candidates'], 'bggId'));
    }

    public function testResolveSearchSortsUnknownGamesLastKeepingBggsOrderAmongThem(): void
    {
        // Nothing here is in bgg_ranks - no known base game to prefer, so
        // BGG's own order should survive untouched.
        $client = new BggClient(fn() => $this->searchXml(
            '<item id="501" type="boardgame"><name type="primary" value="Obscure Edition A"/></item>' .
            '<item id="502" type="boardgame"><name type="primary" value="Obscure Edition B"/></item>'
        ));

        $result = $client->resolveSearch('obscure');

        $this->assertSame([501, 502], array_column($result['candidates'], 'bggId'));
    }

    public function testResolveSearchCapsTheCandidateListAtAScannableLength(): void
    {
        $items = '';
        for ($id = 1; $id <= 30; $id++) {
            $items .= '<item id="' . $id . '" type="boardgame"><name type="primary" value="Game ' . $id . '"/></item>';
        }
        $client = new BggClient(fn() => $this->searchXml($items));

        $result = $client->resolveSearch('game');

        $this->assertCount(20, $result['candidates'], 'BGG can return dozens of matches - the list must stay scannable');
    }

    public function testResolveSearchNoMatchesReturnsNotFound(): void
    {
        $client = new BggClient(fn() => $this->searchXml(''));

        $this->assertSame(['status' => 'not_found'], $client->resolveSearch('zzzznonexistentgamezzzz'));
    }

    public function testSuggestReturnsPrefixMatchesOrderedByUsersRated(): void
    {
        $this->seedRanks();

        $result = (new BggClient())->suggest('cat');

        $this->assertSame(
            [13, 926],
            array_column($result, 'bggId'),
            'most-rated first, same as the ranks fallback used for disambiguation'
        );
        $this->assertSame(['bggId' => 13, 'name' => 'Catan', 'yearPublished' => 1995], $result[0]);
    }

    public function testSuggestIsCappedAtThree(): void
    {
        db()->exec(
            "INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES
             (1, 'Ark Nova', 2021, 8.5, 400, 0, 3),
             (2, 'Arkham Horror', 2005, 7.5, 300, 0, 10),
             (3, 'Arkham Horror: The Card Game', 2016, 8.2, 200, 0, 20),
             (4, 'Architects of the West Kingdom', 2018, 8.0, 100, 0, 30)"
        );

        $this->assertCount(3, (new BggClient())->suggest('ar'));
    }

    public function testSuggestMatchesPunctuationStripped(): void
    {
        // Same rule #73 gave resolveFromRanks(): a user has no reason to type
        // the colon the dump still stores.
        db()->exec(
            "INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES
             (224517, 'Brass: Birmingham', 2018, 8.6, 50000, 0, 5)"
        );

        $result = (new BggClient())->suggest('Brass Birm');

        $this->assertSame([224517], array_column($result, 'bggId'));
    }

    public function testSuggestReturnsEmptyArrayWhenNothingMatches(): void
    {
        $this->seedRanks();

        $this->assertSame([], (new BggClient())->suggest('zzzznonexistentzzzz'));
    }

    public function testSuggestReturnsEmptyArrayWhenRanksTableIsEmpty(): void
    {
        // bgg_ranks is a hand-imported dump and may be empty in a fresh
        // database - suggestions must degrade silently, not error.
        $this->assertSame([], (new BggClient())->suggest('cat'));
    }

    public function testSuggestReturnsEmptyArrayForABlankQuery(): void
    {
        $this->seedRanks();

        $this->assertSame([], (new BggClient())->suggest('  '));
    }

    public function testSuggestTreatsLikeWildcardsAsLiteralCharacters(): void
    {
        // '%' and '_' are LIKE metacharacters. Unescaped, a single '%' turns
        // the indexed prefix scan into a match-everything scan of the whole
        // 180k-row dump - on an endpoint that fires per keystroke. They must
        // match themselves, and no game is called '%'.
        $this->seedRanks();

        $this->assertSame([], (new BggClient())->suggest('%'), '% must not match every row');
        $this->assertSame([], (new BggClient())->suggest('_atan'), '_ must not act as a single-character wildcard');
    }

    public function testResolveSearchReportsNotFoundWhenTheDumpIsPopulatedAndNothingMatches(): void
    {
        // #92: while #40 keeps BGG unreachable, every zero-match query threw
        // and surfaced as a 502 "something went wrong" - a server fault for
        // what is really "no such game". The dump IS BGG's whole catalogue,
        // so if it has rows and none of them match, that is an answer.
        $this->seedRanks();

        $this->assertSame(
            ['status' => 'not_found'],
            (new BggClient(fn() => null))->resolveSearch('teasd')
        );
    }

    public function testResolveSearchStillThrowsWhenTheDumpIsEmpty(): void
    {
        // No local catalogue and no live API means we genuinely cannot see
        // whether the game exists. That must stay an error, not "not found".
        $this->expectException(RuntimeException::class);
        (new BggClient(fn() => null))->resolveSearch('teasd');
    }

    public function testLookupLocalAnswersFromTheDumpWithoutTouchingTheNetwork(): void
    {
        // #91: the whole point is that this path costs no external call, so
        // the fetcher must never be reached. A cold full lookup measured
        // 4-5s in production; this is the part that can answer immediately.
        $this->seedRanks();
        $calls = 0;
        $client = new BggClient(function () use (&$calls) {
            $calls++;
            return null;
        });

        $result = $client->lookupLocal('catan');

        $this->assertSame(0, $calls, 'the local path must not call BGG at all');
        $this->assertSame('ok', $result['status']);
        $this->assertSame('Catan', $result['game']['name']);
        $this->assertTrue($result['game']['partial'], 'dump-derived data carries no description or comments');
        $this->assertSame(566, $result['game']['rank']);
    }

    public function testLookupLocalReturnsEveryFieldTheFullLookupDoes(): void
    {
        // The instant answer renders through the same component as the full
        // one, so a missing key is not "less data" - it is undefined.length
        // in the renderer, and with no error boundary that blanks the page.
        // Shipped exactly that way in #91: ratings was absent and every
        // successful search white-screened.
        $this->seedRanks();

        $game = (new BggClient(fn() => null))->lookupLocal('catan')['game'];

        foreach (['bggId', 'name', 'description', 'rating', 'numRatings', 'good', 'bad', 'partial',
                  'ratings', 'bgq', 'players', 'duration', 'age', 'complexity', 'isExpansion', 'rank',
                  'source'] as $field) {
            $this->assertArrayHasKey($field, $game, "$field is missing from the instant answer");
        }
        $this->assertSame([], $game['ratings'], 'no rating source has been consulted yet, but the key must exist');
    }

    public function testLookupLocalOffersTheSameDisambiguationTheFullLookupWould(): void
    {
        $this->seedRanks();

        $result = (new BggClient(fn() => null))->lookupLocal('cat');

        $this->assertSame('disambiguation', $result['status']);
        $this->assertSame([13, 926], array_column($result['candidates'], 'bggId'));
    }

    public function testLookupLocalReportsNothingKnownRatherThanGuessingWhenTheDumpIsEmpty(): void
    {
        // An empty dump is "we can't see", not "no such game" - the same
        // distinction resolveSearch() protects.
        $this->assertSame(['status' => 'unavailable'], (new BggClient(fn() => null))->lookupLocal('catan'));
    }

    public function testLookupLocalByIdAnswersFromTheDumpWithoutCallingBgg(): void
    {
        // #115: a shared link or a top-10 click arrives by id, and must get the
        // same instant, call-free answer the typed path gets - the whole point
        // is not to hold the page blank for the 4-5s cold lookup.
        $this->seedRanks();
        $calls = 0;
        $client = new BggClient(function () use (&$calls) {
            $calls++;
            return null;
        });

        $result = $client->lookupLocalById(13);

        $this->assertSame(0, $calls, 'the local-by-id path must not call BGG at all');
        $this->assertSame('ok', $result['status']);
        $this->assertSame('Catan', $result['game']['name']);
        $this->assertTrue($result['game']['partial'], 'dump-derived data carries no description or comments');
        $this->assertSame(566, $result['game']['rank']);
        // Same every-key guarantee as the name path: a missing key blanks the
        // shared component (see testLookupLocalReturnsEveryFieldTheFullLookupDoes).
        foreach (['bggId', 'name', 'description', 'rating', 'numRatings', 'good', 'bad', 'partial',
                  'ratings', 'bgq', 'players', 'duration', 'age', 'complexity', 'isExpansion', 'rank',
                  'source'] as $field) {
            $this->assertArrayHasKey($field, $result['game'], "$field is missing from the instant answer");
        }
    }

    public function testLookupLocalByIdReturnsNotFoundForAnIdTheDumpDoesNotHave(): void
    {
        $this->seedRanks();

        $this->assertSame(['status' => 'not_found'], (new BggClient(fn() => null))->lookupLocalById(99999999));
    }

    public function testLookupLocalByIdReportsUnavailableWhenTheDumpIsEmpty(): void
    {
        $this->assertSame(['status' => 'unavailable'], (new BggClient(fn() => null))->lookupLocalById(13));
    }

    public function testRandomBggIdOnlyDrawsGamesWorthBeingSurprisedBy(): void
    {
        // #120: the draw must exclude expansions (926 here) and never be null
        // when eligible games exist. seedRanks leaves 13 and 266192 eligible
        // (not expansions, both rated well above the floor). 25 draws is
        // enough that a filter that leaked 926 would almost certainly show it.
        $this->seedRanks();
        $client = new BggClient(fn() => null);

        for ($i = 0; $i < 25; $i++) {
            $id = $client->randomBggId();
            $this->assertContains($id, [13, 266192], 'drew an ineligible game (expansion or below the floor)');
        }
    }

    public function testRandomBggIdReturnsNullWhenNothingIsEligible(): void
    {
        // Only an expansion and a barely-rated game: neither should ever be
        // served, so the endpoint has nothing to return and the button hides.
        db()->exec(
            "INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES
             (500, 'Some Expansion', 2020, 8.0, 50000, 1, NULL),
             (501, 'Nobody Has Played This', 2021, 6.0, 12, 0, NULL)"
        );

        $this->assertNull((new BggClient(fn() => null))->randomBggId());
    }

    public function testTopRankedListsRankedGamesBestFirstAndSkipsUnrankedOnes(): void
    {
        $calls = 0;
        $this->seedRanks();

        $result = (new BggClient(function () use (&$calls) {
            $calls++;
            return null;
        }))->topRanked();

        $this->assertSame(0, $calls, 'the top list must not call BGG at all');
        $this->assertSame([926, 13], array_column($result, 'bggId'), 'rank 401 leads rank 566');
        $this->assertSame(
            ['bggId' => 926, 'name' => 'Catan: Cities & Knights', 'yearPublished' => 1998, 'rank' => 401, 'rating' => 7.4],
            $result[0]
        );
    }

    public function testTopRankedTreatsRankZeroAsUnrankedRatherThanFirst(): void
    {
        // 0 is how BGG's export says "unranked"; import_bgg_ranks.php
        // normalises it to NULL, but a stray 0 would otherwise sort ahead
        // of the actual number one.
        $this->seedRanks();
        db()->exec("INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank)
                    VALUES (999, 'Not Ranked At All', 2020, 9.9, 5, 0, 0)");

        $this->assertSame([926, 13], array_column((new BggClient())->topRanked(), 'bggId'));
    }

    public function testTopRankedReturnsNothingWhenTheDumpHasNotBeenImported(): void
    {
        $this->assertSame([], (new BggClient())->topRanked());
    }

    public function testTopRankedHonoursItsLimit(): void
    {
        $this->seedRanks();

        $this->assertCount(1, (new BggClient())->topRanked(1));
    }

    public function testDidYouMeanRanksATranspositionAsOneEdit(): void
    {
        // 'Ctaan' transposes the 'a' and 't' of 'Catan'. Plain Levenshtein
        // charges that 2 (delete + insert); Damerau-Levenshtein charges 1,
        // which matters because transposition is one of the commonest human
        // typos and a 2-cost would push longer titles past the threshold.
        $this->seedRanks();

        $result = (new BggClient())->didYouMean('Ctaan');

        $this->assertSame(13, $result[0]['bggId'], 'Catan should lead for a single transposition');
    }

    public function testDidYouMeanComparesAccentedNamesByCharacterNotByte(): void
    {
        // PHP's built-in levenshtein() is byte-based, so 'é' (2 bytes in
        // UTF-8) makes this look like distance 2 and drops out of a
        // threshold that should comfortably accept it.
        db()->exec(
            "INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES
             (555, 'Café International', 1989, 6.5, 3000, 0, 900)"
        );

        $result = (new BggClient())->didYouMean('Cafe International');

        $this->assertSame([555], array_column($result, 'bggId'));
    }

    public function testDidYouMeanFindsAGameDespiteAFirstCharacterTypo(): void
    {
        // A prefix shortlist cannot help here - the first letter is wrong -
        // so this exercises the popularity fallback.
        $this->seedRanks();

        $result = (new BggClient())->didYouMean('Watan');

        $this->assertSame(13, $result[0]['bggId']);
    }

    public function testDidYouMeanReturnsNothingForAQueryLikeNoGameAtAll(): void
    {
        $this->seedRanks();

        $this->assertSame([], (new BggClient())->didYouMean('zzzzqqqqxxxx'));
    }

    public function testDidYouMeanDegradesToEmptyWhenTheDumpIsEmpty(): void
    {
        $this->assertSame([], (new BggClient())->didYouMean('catan'));
    }

    public function testResolveSearchFallbackTreatsLikeWildcardsAsLiteral(): void
    {
        // Same metacharacter bug as suggest(): '%' here would scan the whole
        // dump and answer with an arbitrary disambiguation list rather than
        // the honest "can't see it".
        $this->seedRanks();

        // An unescaped '%' would match every row and answer with an
        // arbitrary disambiguation list; escaped, it matches nothing and the
        // honest "no such game" comes back instead.
        $this->assertSame(
            ['status' => 'not_found'],
            (new BggClient(fn() => null))->resolveSearch('%')
        );
    }
}
