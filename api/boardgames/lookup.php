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

// Every extra source is best-effort: one that is slow, broken or simply has
// no entry for this game must never cost the user the BGG answer they asked
// for, and must never take the others down with it.
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

    $amazon = optional_source('amazon', fn() => (new AmazonRatingClient())->ratingFor($game['name']));
    $bgq = optional_source('board game quest', fn() => (new BoardGameQuestClient())->reviewFor($game['name']));
    $hall = optional_source('hall9000', fn() => (new Hall9000Client())->ratingFor($game['name']));
    $report = optional_source('brettspiele-report', fn() => (new BrettspieleReportClient())->ratingFor($game['name']));

    // One list rather than four bespoke fields: each source publishes on its
    // own scale (Amazon /5, BGQ /5, H@LL9000 /6, brettspiele-report /20), so
    // every entry carries its own max and is labelled by source. They are
    // never averaged - a mean across a retail pool, a reviewer and two German
    // sites would be a number nobody published.
    $game['ratings'] = array_values(array_filter([
        $amazon === null ? null : [
            'source' => 'Amazon.de',
            'value' => $amazon['rating'],
            'max' => 5,
            'count' => $amazon['count'],
            'title' => $amazon['title'],
            'url' => $amazon['url'],
        ],
        $bgq === null ? null : [
            'source' => 'Board Game Quest',
            'value' => $bgq['score'],
            'max' => 5,
            'count' => null,
            'title' => $bgq['title'],
            'url' => $bgq['url'],
        ],
        $hall === null ? null : [
            'source' => 'H@LL9000',
            'value' => $hall['rating'],
            'max' => $hall['max'],
            'count' => $hall['count'],
            'title' => null,
            'url' => $hall['url'],
        ],
        $report === null ? null : [
            'source' => 'brettspiele-report',
            'value' => $report['rating'],
            'max' => $report['max'],
            'count' => null,
            'title' => $report['title'],
            'url' => $report['url'],
        ],
    ]));

    // Board Game Quest's prose fills what BGG can't supply while #40 is open:
    // their Hits/Misses stand in for BGG's comments and their Gameplay
    // Overview for its description. Both defer to BGG - only nulls get filled.
    $game['bgq'] = $bgq;
    if ($bgq !== null) {
        $game['good'] ??= $bgq['hits'][0] ?? null;
        $game['bad'] ??= $bgq['misses'][0] ?? null;
    }

    // Player count and duration are only ever known from H@LL9000 today.
    $game['players'] = $hall['players'] ?? null;
    $game['duration'] = $hall['duration'] ?? null;

    json_response(['status' => 'ok', 'game' => $game]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
