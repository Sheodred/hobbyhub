<?php
// Outbound-request helpers shared by every *Client class below - one place
// for the timeout/redirect/user-agent settings all of them need.

function http_get_json(string $url, int $timeoutSeconds = 10, array $headers = []): ?array
{
    $body = http_get_raw($url, $timeoutSeconds, array_merge(['Accept: application/json'], $headers));
    return $body === null ? null : json_decode($body, true);
}

function http_get_html(string $url, int $timeoutSeconds = 10): ?string
{
    return http_get_raw($url, $timeoutSeconds, ['User-Agent: ' . SCRYFALL_USER_AGENT]);
}

function http_get_raw(string $url, int $timeoutSeconds, array $headers): ?string
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
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $status >= 400) {
        return null;
    }
    return $body;
}
