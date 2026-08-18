-- Auto-applied in local docker-compose (mounted into MariaDB's
-- /docker-entrypoint-initdb.d). Apply manually once via phpMyAdmin/CLI on
-- IONOS for production. Auto-increment INT ids throughout - none of the
-- API responses expose an id field, so UUIDs would add nothing.

CREATE TABLE news_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(20) NOT NULL,
    headline TEXT NOT NULL,
    teaser TEXT,
    url TEXT NOT NULL,
    published_at DATETIME NULL,
    -- Only populated for FLEAMARKET rows (geocoded venue location), NULL for
    -- every other source. See geocode_cache below.
    latitude DECIMAL(9, 6) NULL,
    longitude DECIMAL(9, 6) NULL,
    fetched_at DATETIME NOT NULL,
    sort_order INT NOT NULL,
    INDEX idx_news_items_source (source, sort_order)
);

-- Cache-aside table for NominatimGeocodeClient, shaped like scryfall_cache
-- (see Cache.php's cache_aside()). Keyed by the lowercased venue location
-- text scraped from the flea market sources - those repeat week over week,
-- so a long TTL avoids re-geocoding the same handful of Dortmund venues on
-- every cron run and keeps well within Nominatim's usage policy.
CREATE TABLE geocode_cache (
    location_key VARCHAR(255) PRIMARY KEY,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Manual fallback for the WotC news panel when the scraper finds nothing -
-- edit directly via phpMyAdmin. Seed with at least one row so the panel
-- never shows a truly empty state (see docs for the seed content used).
CREATE TABLE wotc_news_fallback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    headline TEXT NOT NULL,
    url TEXT NOT NULL,
    sort_order INT NOT NULL
);

CREATE TABLE mtg_meta_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(30) NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    num_decks INT NULL,
    sort_order INT NOT NULL,
    fetched_at DATETIME NOT NULL,
    INDEX idx_mtg_meta_entries_category (category, sort_order)
);

CREATE TABLE scryfall_cache (
    cache_key VARCHAR(500) PRIMARY KEY,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Combos per card. Name predates the switch to EDHREC as the source, and is
-- kept because renaming it costs a hand-run production migration for nothing
-- (docs/adr/0016).
CREATE TABLE commander_spellbook_cache (
    card_name VARCHAR(255) PRIMARY KEY,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Single row, used to space outbound Scryfall requests ~100ms apart per
-- Scryfall's API guidelines (see ScryfallClient::throttle()).
CREATE TABLE scryfall_throttle (
    id TINYINT PRIMARY KEY DEFAULT 1,
    last_call_at DOUBLE NOT NULL
);

-- Cache-aside table for BggClient::lookup(), shaped like scryfall_cache.
-- Long TTL (see BggClient::LOOKUP_CACHE_TTL_SECONDS) - board game ratings
-- and descriptions change far more slowly than MTG Standard metagame data.
CREATE TABLE bgg_lookup_cache (
    bgg_id INT PRIMARY KEY,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Caches the free-text search -> resolved bgg_id mapping, so a repeat
-- search of the same query skips even the BGG /search call. Only the
-- single chosen id is cached here, never the full candidate list from a
-- disambiguation response.
CREATE TABLE bgg_search_cache (
    query_key VARCHAR(255) PRIMARY KEY,
    bgg_id INT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- BGG's own published boardgames_ranks.csv export, imported by
-- api/sql/import_bgg_ranks.php. Stands in for the live XML API while that
-- is unavailable (#40): it carries ratings and names for the whole catalog
-- but no descriptions or comments, so a lookup served from here is
-- deliberately partial. Not refreshed automatically - re-run the importer
-- against a newer dump when one is downloaded.
CREATE TABLE bgg_ranks (
    bgg_id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    year_published INT NULL,
    average DOUBLE NULL,
    users_rated INT NULL,
    is_expansion TINYINT NOT NULL DEFAULT 0,
    -- BGG's overall rank. NULL for the ~83% of the dump BGG doesn't rank at
    -- all (it needs a minimum number of ratings); the export writes those as
    -- 0, which the importer converts. Not called `rank` because that is a
    -- reserved word in MySQL 8 and MariaDB 10.2+.
    bgg_rank INT NULL,
    INDEX idx_bgg_ranks_name (name)
);

-- Single row, mirrors scryfall_throttle - spaces outbound BGG requests
-- per the ~2 req/sec community-observed convention (BggClient::throttle()).
CREATE TABLE bgg_throttle (
    id TINYINT PRIMARY KEY DEFAULT 1,
    last_call_at DOUBLE NOT NULL
);

-- This year's Spiel-des-Jahres results, shown as pre-search entry points on
-- the boardgame lookup (#105). Hand-maintained (three winners a year), same
-- as wotc_news_fallback: three "pots" (Spiel / Kennerspiel / Kinderspiel des
-- Jahres), each with one winner plus its nominees and recommendation list.
-- Winners carry BGG's id so a click resolves the game; nominees and
-- recommendations store a name only (no id seeded, so a click runs a name
-- search). SdjAwards::current() serves the latest award_year present, so
-- seeding next year's rows switches the panel over with no code change.
CREATE TABLE sdj_awards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    award_year SMALLINT NOT NULL,
    -- The full German award title, used verbatim as the card label.
    category VARCHAR(64) NOT NULL,
    -- 'winner' | 'nominee' | 'recommended'.
    kind VARCHAR(12) NOT NULL,
    name VARCHAR(255) NOT NULL,
    -- Only winners have one; NULL for nominees and recommendations.
    bgg_id INT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    INDEX idx_sdj_awards_year (award_year, sort_order)
);

-- Board Game Quest review verdict per game name, read from their public
-- WordPress REST API by BoardGameQuestClient (docs/adr/0013). Long TTL - a
-- published review doesn't change.
CREATE TABLE bgq_review_cache (
    query_key VARCHAR(255) PRIMARY KEY,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

CREATE TABLE bgq_throttle (
    id TINYINT PRIMARY KEY DEFAULT 1,
    last_call_at DOUBLE NOT NULL
);

-- Aggregate customer rating per game name, read from amazon.de search
-- results by AmazonRatingClient (docs/adr/0012). Stores the star average and
-- rating count only - a fact, never review text. Cache-aside shape, keyed by
-- the lowercased game name.
CREATE TABLE amazon_rating_cache (
    query_key VARCHAR(255) PRIMARY KEY,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Single row, mirrors scryfall_throttle. Interval is deliberately slower
-- than the others (AmazonRatingClient::THROTTLE_MIN_INTERVAL_MS).
CREATE TABLE amazon_throttle (
    id TINYINT PRIMARY KEY DEFAULT 1,
    last_call_at DOUBLE NOT NULL
);

-- H@LL9000 aggregate rating per game slug (docs/adr/0014).
CREATE TABLE hall9000_cache (
    query_key VARCHAR(255) PRIMARY KEY,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

CREATE TABLE hall9000_throttle (
    id TINYINT PRIMARY KEY DEFAULT 1,
    last_call_at DOUBLE NOT NULL
);

-- brettspiele-report.de overall score per game name (docs/adr/0014).
CREATE TABLE brettspiele_report_cache (
    query_key VARCHAR(255) PRIMARY KEY,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

CREATE TABLE brettspiele_report_throttle (
    id TINYINT PRIMARY KEY DEFAULT 1,
    last_call_at DOUBLE NOT NULL
);

-- Decks are imported as a snapshot, not fetched per request: the upstream is
-- a metered third-party wrapper (200 calls/month on the free tier), and a
-- published tournament deck never changes once it exists. The site only ever
-- reads these tables - nothing in a request path calls out.
CREATE TABLE mtg_decks (
    deck_id VARCHAR(30) PRIMARY KEY,
    name TEXT NOT NULL,
    pilot TEXT NULL,
    event TEXT NULL,
    url TEXT NULL,
    format VARCHAR(30) NOT NULL,
    archetype_name TEXT NOT NULL,
    archetype_path VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL,
    fetched_at DATETIME NOT NULL,
    INDEX idx_mtg_decks_archetype (archetype_path, sort_order)
);

CREATE TABLE mtg_deck_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deck_id VARCHAR(30) NOT NULL,
    section VARCHAR(30) NOT NULL,
    name TEXT NOT NULL,
    count INT NOT NULL,
    sort_order INT NOT NULL,
    INDEX idx_mtg_deck_cards_deck (deck_id, sort_order)
);

INSERT INTO wotc_news_fallback (headline, url, sort_order) VALUES
    ('Magic: The Gathering news', 'https://magic.wizards.com/en/news', 0);

-- Spiel des Jahres 2026 (facts from spiel-des-jahres.de/preistraeger2026 -
-- award results are not copyrightable, no prose or images are copied). Refresh
-- once a year: add the next year's rows (three pots, winner + nominees +
-- recommendations), and the panel switches to it automatically. Only winners
-- need a bgg_id looked up; nominees and recommendations are names only.
INSERT INTO sdj_awards (award_year, category, kind, name, bgg_id, sort_order) VALUES
    (2026, 'Spiel des Jahres', 'winner', 'DITO!', 400495, 0),
    (2026, 'Spiel des Jahres', 'nominee', 'Cozy Sticker Ville', 456440, 1),
    (2026, 'Spiel des Jahres', 'nominee', 'Morty Sorty Magic Shop', 462742, 2),
    (2026, 'Spiel des Jahres', 'recommended', 'Hot Streak', 446497, 3),
    (2026, 'Spiel des Jahres', 'recommended', 'Meister Makatsu', 447384, 4),
    (2026, 'Spiel des Jahres', 'recommended', 'Take Time', 440540, 5),
    (2026, 'Spiel des Jahres', 'recommended', 'Toriki', 417403, 6),
    (2026, 'Spiel des Jahres', 'recommended', 'Toy Battle', 434654, 7),
    (2026, 'Spiel des Jahres', 'recommended', 'Wilmot''s Warehouse', 424975, 8),
    (2026, 'Kennerspiel des Jahres', 'winner', 'Rebirth', 417197, 10),
    (2026, 'Kennerspiel des Jahres', 'nominee', 'Boss Fighters: QR', 454672, 11),
    (2026, 'Kennerspiel des Jahres', 'nominee', 'Moon Colony Bloodbath', 425549, 12),
    (2026, 'Kennerspiel des Jahres', 'recommended', 'Artengarten', 441696, 13),
    (2026, 'Kennerspiel des Jahres', 'recommended', 'Frosted Blooms', 449853, 14),
    (2026, 'Kennerspiel des Jahres', 'recommended', 'Grundstein von Metropolis', 412865, 15),
    (2026, 'Kennerspiel des Jahres', 'recommended', 'Tag Team', 434906, 16),
    (2026, 'Kinderspiel des Jahres', 'winner', 'Die Insel der Mookies', 435346, 20),
    (2026, 'Kinderspiel des Jahres', 'nominee', 'Buh Party', 454722, 21),
    (2026, 'Kinderspiel des Jahres', 'nominee', 'Verflixt verzaubert', 420360, 22),
    (2026, 'Kinderspiel des Jahres', 'recommended', 'Kleiner Stinker', 425078, 23),
    (2026, 'Kinderspiel des Jahres', 'recommended', 'Magische Spiegel', 424581, 24),
    (2026, 'Kinderspiel des Jahres', 'recommended', 'Paleolino', 464279, 25);
