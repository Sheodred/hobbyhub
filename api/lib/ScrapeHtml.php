<?php
require_once __DIR__ . '/http_client.php';

// Fetch + parse + extract, degrading to $default on any failure (network,
// missing markup, or an $extract that throws) - the "may break" scrape
// pattern shared by WotcNewsClient and MtgGoldfishClient. $httpGetHtml is
// injectable the same way ScryfallClient's HTTP calls are, so tests don't
// hit the network.
function scrape_html(string $url, callable $httpGetHtml, callable $extract, $default, string $context)
{
    try {
        $html = $httpGetHtml($url);
        if ($html === null) {
            return $default;
        }

        $doc = new DOMDocument();
        libxml_use_internal_errors(true); // real-world HTML trips DOMDocument's stricter parser otherwise
        $doc->loadHTML($html);
        libxml_use_internal_errors(false);

        return $extract(new DOMXPath($doc));
    } catch (Throwable $e) {
        error_log("$context scrape failed for $url: " . $e->getMessage());
        return $default;
    }
}
