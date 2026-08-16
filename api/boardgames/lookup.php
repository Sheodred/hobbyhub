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
            error_response('No board game found for that name.', 404);
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

    $bgqClient = new BoardGameQuestClient();
    $hallClient = new Hall9000Client();
    $reportClient = new BrettspieleReportClient();

    // One list rather than four bespoke fields, and the shape of an entry now
    // lives behind the RatingSource seam rather than here. Each source keeps
    // its own max and label; they are never averaged - a mean across a retail
    // pool, a reviewer and two German sites would be a number nobody
    // published.
    $game['ratings'] = collect_ratings([
        new AmazonRatingClient(),
        $bgqClient,
        $hallClient,
        $reportClient,
    ], $game['name']);

    // Everything below is not a rating, so it does not travel through the
    // seam: Board Game Quest's prose and H@LL9000's player count. Both are
    // cache-aside'd, so asking a second time is a database read, not another
    // request to them.
    $bgq = optional_source('board game quest', fn() => $bgqClient->reviewFor($game['name']));
    $hall = optional_source('hall9000', fn() => $hallClient->ratingFor($game['name']));
    $report = optional_source('brettspiele-report', fn() => $reportClient->ratingFor($game['name']));

    // Board Game Quest's prose fills what BGG can't supply while #40 is open:
    // their Hits/Misses stand in for BGG's comments and their Gameplay
    // Overview for its description. Both defer to BGG - only nulls get filled.
    $game['bgq'] = $bgq;
    if ($bgq !== null) {
        $game['good'] ??= $bgq['hits'][0] ?? null;
        $game['bad'] ??= $bgq['misses'][0] ?? null;
    }

    // Player count, duration and minimum age are only ever known from
    // H@LL9000 today; when BGG's own fields come back (#40) they should win
    // here and these should fill the gaps, the way $game['good'] does above.
    $game['players'] = $hall['players'] ?? null;
    $game['duration'] = $hall['duration'] ?? null;
    $game['age'] = $hall['age'] ?? null;

    // Not a rating - see BrettspieleReportClient. Carries its own scale for
    // the same reason the ratings do.
    $game['complexity'] = isset($report['complexity'])
        ? ['value' => $report['complexity'], 'max' => $report['max'], 'url' => $report['url']]
        : null;

    json_response(['status' => 'ok', 'game' => $game]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
