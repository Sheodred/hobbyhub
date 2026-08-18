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
    (2026, 'Spiel des Jahres', 'nominee', 'Cozy Sticker Ville', NULL, 1),
    (2026, 'Spiel des Jahres', 'nominee', 'Morty Sorty Magic Shop', NULL, 2),
    (2026, 'Spiel des Jahres', 'recommended', 'Hot Streak', NULL, 3),
    (2026, 'Spiel des Jahres', 'recommended', 'Meister Makatsu', NULL, 4),
    (2026, 'Spiel des Jahres', 'recommended', 'Take Time', NULL, 5),
    (2026, 'Spiel des Jahres', 'recommended', 'Toriki', NULL, 6),
    (2026, 'Spiel des Jahres', 'recommended', 'Toy Battle', NULL, 7),
    (2026, 'Spiel des Jahres', 'recommended', 'Wilmot''s Warehouse', NULL, 8),
    (2026, 'Kennerspiel des Jahres', 'winner', 'Rebirth', 417197, 10),
    (2026, 'Kennerspiel des Jahres', 'nominee', 'Boss Fighters: QR', NULL, 11),
    (2026, 'Kennerspiel des Jahres', 'nominee', 'Moon Colony Bloodbath', NULL, 12),
    (2026, 'Kennerspiel des Jahres', 'recommended', 'Artengarten', NULL, 13),
    (2026, 'Kennerspiel des Jahres', 'recommended', 'Frosted Blooms', NULL, 14),
    (2026, 'Kennerspiel des Jahres', 'recommended', 'Grundstein von Metropolis', NULL, 15),
    (2026, 'Kennerspiel des Jahres', 'recommended', 'Tag Team', NULL, 16),
    (2026, 'Kinderspiel des Jahres', 'winner', 'Die Insel der Mookies', 435346, 20),
    (2026, 'Kinderspiel des Jahres', 'nominee', 'Buh Party', NULL, 21),
    (2026, 'Kinderspiel des Jahres', 'nominee', 'Verflixt verzaubert', NULL, 22),
    (2026, 'Kinderspiel des Jahres', 'recommended', 'Kleiner Stinker', NULL, 23),
    (2026, 'Kinderspiel des Jahres', 'recommended', 'Magische Spiegel', NULL, 24),
    (2026, 'Kinderspiel des Jahres', 'recommended', 'Paleolino', NULL, 25);
