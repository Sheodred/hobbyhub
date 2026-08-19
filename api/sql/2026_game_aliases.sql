-- One-time production migration for curated game aliases (#132).
--
-- The local docker-compose MariaDB applies schema.sql automatically, but
-- production (IONOS) does not - schema.sql is applied by hand once, and this
-- table was added after that. Run this file against the production
-- `hobbyhub` database via phpMyAdmin (SQL tab) or the CLI:
--
--   mysql -u<user> -p <database> < api/sql/2026_game_aliases.sql
--
-- Safe to re-run: the table is created only if missing, and INSERT IGNORE
-- skips rows whose `name` already exists (the UNIQUE key) rather than
-- erroring or duplicating.
-- Verify afterwards with:  SELECT COUNT(*) FROM game_aliases;  -- expect >= 6.

CREATE TABLE IF NOT EXISTS game_aliases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bgg_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    lang VARCHAR(8) NULL,
    UNIQUE KEY uniq_game_aliases_name (name),
    INDEX idx_game_aliases_bgg_id (bgg_id)
);

-- Every name below was read live off BGG's own thing() response
-- (<name type="alternate">) on 2026-08-19, not typed from memory - a wrong
-- alias here would misdirect a real search, not just fail to find anything
-- (contrast german_name_candidates(), a best-effort guess only ever tried
-- as a throttled search term against a secondary source).
INSERT IGNORE INTO game_aliases (bgg_id, name, lang) VALUES
    (13, 'Die Siedler von Catan', 'de'),
    (13, 'Siedler von Catan', 'de'),
    (266192, 'Flügelschlag', 'de'),
    (9209, 'Zug um Zug', 'de'),
    -- The next two are already-curated German award titles from
    -- sdj_awards (2026 Spiel des Jahres / Kinderspiel des Jahres winners)
    -- that differ from BGG's own primary name - JinxO and Mooki Island
    -- respectively. Rebirth (417197) is not included: its sdj_awards name
    -- and BGG primary name are identical, so it would add nothing.
    (400495, 'DITO!', 'de'),
    (435346, 'Die Insel der Mookies', 'de'),
    -- Ark Nova: the case that showed why the alias table has to feed the
    -- SEARCH and not just the displayed title. "Arche Nova" carries no
    -- umlaut and none of the marker words german_name_candidates() looks
    -- for, so it scored 0 and was never tried - amazon.de and
    -- brettspiele-report were asked for "Ark Nova" and found nothing.
    -- Verified 2026-08-19: amazon.de returns the real Feuerland listing for
    -- "Arche Nova" immediately.
    (342942, 'Arche Nova', 'de');
