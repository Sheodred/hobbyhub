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
    INDEX idx_bgg_ranks_name (name)
);

-- Single row, mirrors scryfall_throttle - spaces outbound BGG requests
-- per the ~2 req/sec community-observed convention (BggClient::throttle()).
CREATE TABLE bgg_throttle (
    id TINYINT PRIMARY KEY DEFAULT 1,
    last_call_at DOUBLE NOT NULL
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

INSERT INTO wotc_news_fallback (headline, url, sort_order) VALUES
    ('Magic: The Gathering news', 'https://magic.wizards.com/en/news', 0);
