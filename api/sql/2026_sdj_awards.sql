-- One-time production migration for the Spiel-des-Jahres award panel (#105).
--
-- The local docker-compose MariaDB applies schema.sql automatically, but
-- production (IONOS) does not - schema.sql is applied by hand once, and this
-- table was added after that. Run this file against the production `hobbyhub`
-- database via phpMyAdmin (SQL tab) or the CLI:
--
--   mysql -u<user> -p <database> < api/sql/2026_sdj_awards.sql
--
-- Safe to re-run: the table is created only if missing, and the 2026 rows are
-- cleared before re-insert, so a second run neither errors nor duplicates.
-- Verify afterwards with:  SELECT COUNT(*) FROM sdj_awards;  -- expect 22.

CREATE TABLE IF NOT EXISTS sdj_awards (
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

DELETE FROM sdj_awards WHERE award_year = 2026;

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
