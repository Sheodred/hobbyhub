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
    fetched_at DATETIME NOT NULL,
    sort_order INT NOT NULL,
    INDEX idx_news_items_source (source, sort_order)
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

INSERT INTO wotc_news_fallback (headline, url, sort_order) VALUES
    ('Magic: The Gathering news', 'https://magic.wizards.com/en/news', 0);
