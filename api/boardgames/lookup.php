<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/AmazonRatingClient.php';
require_once __DIR__ . '/../lib/BoardGameQuestClient.php';
require_once __DIR__ . '/../lib/Hall9000Client.php';
require_once __DIR__ . '/../lib/BrettspieleReportClient.php';

$q = trim($_GET['q'] ?? '');
$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;

if ($q === '' && $bggId === null) {
    error_response('q or bgg_id is required', 400);
}
// #130: only 'de' is ever meaningful today - anything else (missing, 'en',
// garbage) is today's existing behaviour, BGG's own primary name.
$lang = ($_GET['lang'] ?? '') === 'de' ? 'de' : null;

// Best-Effort applies to the prose and player counts too, not just to
// ratings - collect_ratings() covers the rating half.
function optional_source(string $label, callable $fetch)
{
    try {
        return $fetch();
    } catch (Throwable $e) {
        error_log($label . ' lookup failed: ' . $e->getMessage());
        return null;
    }
}

try {
    $client = new BggClient();

    if ($bggId === null) {
        $resolved = $client->resolveSearch($q);
        if ($resolved['status'] === 'not_found') {
            // #92: a search that ran and found nothing is a successful
            // search with zero results, not a failure - so 200, and carry
            // the near misses so a typo has somewhere to go. A non-2xx here
            // would strand them: apiFetch() throws away the body.
            json_response([
                'status' => 'not_found',
                'query' => $q,
                'suggestions' => $client->didYouMean($q, 5, $lang),
            ]);
        }
        if ($resolved['status'] === 'disambiguation') {
            json_response(['status' => 'disambiguation', 'candidates' => $resolved['candidates']]);
        }
        $bggId = $resolved['bggId'];
    }

    $game = $client->lookup($bggId);
    if ($game === null) {
        error_response('That board game could not be found on BoardGameGeek.', 404);
    }
    // #130: the result-card title.
    if ($lang !== null) {
        $game['name'] = $client->preferredName($bggId, $lang) ?? $game['name'];
    }

    $amazonClient = new AmazonRatingClient();
    $bgqClient = new BoardGameQuestClient();
    $hallClient = new Hall9000Client();
    $reportClient = new BrettspieleReportClient();

    // One list rather than four bespoke fields, and the shape of an entry now
    // lives behind the RatingSource seam rather than here. Each source keeps
    // its own max and label; they are never averaged - a mean across a retail
    // pool, a reviewer and two German sites would be a number nobody
    // published.
    // Three of the four sources are German sites and BGG's primary name is
    // English, so Catan was searched for as "Catan" and found on none of them
    // (#122). Every source is now asked under the English name first and then
    // under whatever alternates look German, first answer wins. Board Game
    // Quest is English and will never match a German title - it just spends
    // the same cached miss as the others, which is cheaper than teaching this
    // call site which sources speak which language.
    $searchNames = array_merge([$game['name']], $game['germanNames'] ?? []);
    // Search-only, and cached inside bgg_lookup_cache under BggClient's own
    // key - not a field this API has ever published, so it does not start now.
    unset($game['germanNames']);

    $game['ratings'] = collect_ratings([
        $amazonClient,
        $bgqClient,
        $hallClient,
        $reportClient,
    ], $searchNames);

    // Everything below is not a rating, so it does not travel through the
    // seam: Board Game Quest's prose and H@LL9000's player count. Both are
    // cache-aside'd, so asking a second time is a database read, not another
    // request to them.
    $bgq = optional_source('board game quest', fn() => first_hit($searchNames, fn(string $n) => $bgqClient->reviewFor($n)));
    $hall = optional_source('hall9000', fn() => first_hit($searchNames, fn(string $n) => $hallClient->ratingFor($n)));
    $report = optional_source('brettspiele-report', fn() => first_hit($searchNames, fn(string $n) => $reportClient->ratingFor($n)));

    // Board Game Quest's prose fills what BGG can't supply while #40 is open:
    // their Hits/Misses stand in for BGG's comments and their Gameplay
    // Overview for its description. Both defer to BGG - only nulls get filled.
    $game['bgq'] = $bgq;
    if ($bgq !== null) {
        // good/bad are string lists now (top/bottom 3 BGG comments) - Board
        // Game Quest's whole Hits/Misses list fills the gap the same way a
        // single hit used to, not just its first entry.
        $game['good'] ??= $bgq['hits'] === [] ? null : $bgq['hits'];
        $game['bad'] ??= $bgq['misses'] === [] ? null : $bgq['misses'];
    }

    // H@LL9000's German phrasing ("75 Minuten", "ab 10 Jahren") wins when it
    // has an entry; BGG's own minplayers/maxplayers/playingtime/minage
    // (already set on $game by BggClient::mapThing()) fill the gap for the
    // many games this small German site has no listing for at all.
    $game['players'] = $hall['players'] ?? $game['players'] ?? null;
    $game['duration'] = $hall['duration'] ?? $game['duration'] ?? null;
    $game['age'] = $hall['age'] ?? $game['age'] ?? null;

    // Not a rating - see BrettspieleReportClient. Carries its own scale for
    // the same reason the ratings do. brettspiele-report wins when it has an
    // entry; BGG's own community weight rating (already set on $game by
    // BggClient::mapThing()) fills the gap otherwise, same fallback pattern
    // as players/duration/age above.
    $game['complexity'] = isset($report['complexity'])
        ? ['value' => $report['complexity'], 'max' => $report['max'], 'source' => 'brettspiele-report']
        : ($game['complexity'] ?? null);

    // #90: retail (new) price, not the used market this issue also asked
    // about - see docs/adr/0018 for why used-market pricing (eBay,
    // Kleinanzeigen) is a link-out on the frontend rather than a fetched
    // number. A listing with a price but not yet a customer rating still
    // answers this - see AmazonRatingClient::priceFor().
    $amazonPrice = optional_source('amazon.de price', fn() => first_hit($searchNames, fn(string $n) => $amazonClient->priceFor($n)));
    $game['price'] = $amazonPrice === null ? null : [
        'value' => $amazonPrice['price'],
        'currency' => $amazonPrice['currency'],
        'source' => 'Amazon.de',
        'url' => $amazonPrice['url'],
    ];

    json_response(['status' => 'ok', 'game' => $game]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
