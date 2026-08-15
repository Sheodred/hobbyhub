<?php
// Local dev (docker-compose) reads these from container environment
// variables. Production (IONOS shared hosting has no env-var UI) instead
// defines a gitignored config.local.php with real values - see
// config.example.php. Whichever source runs first "wins" via the
// already-defined() check below, so config.local.php (if present) always
// takes priority over an environment variable of the same name.
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

function env_or(string $constant, string $default): void
{
    if (defined($constant)) {
        return;
    }
    $value = getenv($constant);
    define($constant, $value !== false ? $value : $default);
}

env_or('DB_HOST', 'mariadb');
env_or('DB_NAME', 'hobbyhub');
env_or('DB_USER', 'hobbyhub');
env_or('DB_PASSWORD', 'hobbyhub');

env_or('SCRYFALL_BASE_URL', 'https://api.scryfall.com');
// Scryfall asks every client to identify itself (see their API guidelines).
define('SCRYFALL_USER_AGENT', 'HobbyHub/0.1 (+https://github.com/Sheodred/hobbyhub)');
// BGG requires a registered application token since it started rejecting
// unauthenticated XML API calls with 401 (#40). Empty means "no token yet" -
// BggClient then sends no Authorization header and falls back to the
// imported bgg_ranks dump. Real value goes in config.local.php.
env_or('BGG_API_TOKEN', '');
env_or('COMMANDER_SPELLBOOK_BASE_URL', 'https://backend.commanderspellbook.com');
env_or('TAGESSCHAU_BASE_URL', 'https://www.tagesschau.de');
env_or('WOTC_NEWS_URL', 'https://magic.wizards.com/en/news');
env_or('EDHREC_JSON_BASE_URL', 'https://json.edhrec.com');
env_or('MTGGOLDFISH_STANDARD_URL', 'https://www.mtggoldfish.com/metagame/standard');
env_or('MTGGOLDFISH_COMMANDER_URL', 'https://www.mtggoldfish.com/metagame/commander');
env_or('RADIO912_NEWS_URL', 'https://www.radio912.de/nachrichten/dortmund');
env_or('KINDERFLOHMARKT_COM_URL', 'https://kinderflohmarkt.com/de/dortmund/');
env_or('KINDERBASAR_ONLINE_URL', 'https://www.kinderbasar-online.de/Kinderbasar/Termine/Liste/l-Dortmund/r-50');
env_or('NOMINATIM_BASE_URL', 'https://nominatim.openstreetmap.org');
