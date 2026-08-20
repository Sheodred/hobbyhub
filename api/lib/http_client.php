<?php
// Outbound-request helpers shared by every *Client class below - one place
// for the timeout/redirect/user-agent settings all of them need.

function http_get_json(string $url, int $timeoutSeconds = 10, array $headers = []): ?array
{
    $body = http_get_raw($url, $timeoutSeconds, array_merge(['Accept: application/json'], $headers));
    return $body === null ? null : json_decode($body, true);
}

// BGG's XML API2 returns XML rather than the JSON every other client here
// consumes - one new primitive next to the existing helpers, not a separate
// HTTP layer.
function http_get_xml(string $url, int $timeoutSeconds = 10, array $headers = []): ?SimpleXMLElement
{
    $body = http_get_raw($url, $timeoutSeconds, array_merge(['Accept: application/xml', 'User-Agent: ' . SCRYFALL_USER_AGENT], $headers));
    if ($body === null) {
        return null;
    }
    $xml = @simplexml_load_string($body);
    return $xml === false ? null : $xml;
}

// $headers is for content negotiation (Accept, Accept-Language) that some
// hosts require before they'll serve a normal page - the User-Agent stays
// this project's real one, callers don't get to impersonate a browser.
function http_get_html(string $url, int $timeoutSeconds = 10, array $headers = []): ?string
{
    return http_get_raw($url, $timeoutSeconds, array_merge(['User-Agent: ' . SCRYFALL_USER_AGENT], $headers));
}

// Everything the call revealed: body, HTTP status, and curl's own error
// string. Callers that only want the body keep using http_get_raw(); this
// exists because "it failed" and "it failed with a 403" are different facts,
// and collapsing them cost three deploys to diagnose a block that was saying
// so on every request (see docs/architecture-review-2026-08-15.md).
//
// @return array{body:?string,status:int,error:?string}
function http_get_result(string $url, int $timeoutSeconds, array $headers): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        // Without this, a 3xx response (e.g. Tagesschau's own API
        // 308-redirecting "/api2u/homepage/" to "/api2u/homepage") returns
        // an empty/redirect body instead of the real content - a real bug
        // hit once already in the Java version of this client, ported
        // here as "don't repeat that."
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => $timeoutSeconds,
        CURLOPT_HTTPHEADER => $headers,
        // #165: without this, curl sends no Accept-Encoding at all, yet on
        // IONOS amazon.de still answered with a gzip body - every caller then
        // read raw gzip bytes as HTML and every marker search failed, which
        // looked exactly like a block. '' makes curl advertise every
        // encoding it supports and decompress the response itself, so every
        // caller keeps receiving plain text regardless of what a given host
        // decides to send.
        CURLOPT_ENCODING => '',
    ]);
    $body = curl_exec($ch);
    $result = [
        'body' => $body === false ? null : $body,
        'status' => (int) curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'error' => curl_error($ch) ?: null,
    ];
    curl_close($ch);

    return $result;
}

function http_get_raw(string $url, int $timeoutSeconds, array $headers): ?string
{
    $result = http_get_result($url, $timeoutSeconds, $headers);

    if ($result['body'] === null || $result['status'] >= 400) {
        return null;
    }
    return $result['body'];
}
