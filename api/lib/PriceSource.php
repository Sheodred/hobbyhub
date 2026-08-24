<?php

// #176: a retail price, unlike a rating, is not staggered by scale - every
// source prices the same game in the same currency, so nothing here gets
// normalised. Multiple prices are shown side by side rather than picking one
// "best" source and dropping the rest: a game can genuinely be cheaper or
// in stock at one store and not another, and only the visitor gets to weigh
// that.
//
// Same Best-Effort contract as collect_ratings() (RatingSource.php,
// ADR-0011): one source that is slow, broken, or has no listing for this
// game must never cost the user the prices that do work. $sources is
// label => fetch rather than a shared interface, because the two price
// clients this project has take different arguments (a BGG id vs. a name to
// search for) - there is nothing in common to abstract behind an interface
// beyond "returns array{price,currency,title,url}|null", which the fetch
// closure already encodes.
function collect_prices(array $sources): array
{
    $prices = [];

    foreach ($sources as $label => $fetch) {
        try {
            $price = $fetch();
        } catch (Throwable $e) {
            error_log($label . ' price failed: ' . $e->getMessage());
            continue;
        }

        if ($price === null) {
            continue;
        }

        $prices[] = [
            'value' => $price['price'],
            'currency' => $price['currency'],
            'source' => $label,
            'url' => $price['url'],
        ];
    }

    return $prices;
}
