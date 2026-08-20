-- One-time production migration for BrettspielpreiseClient (docs/adr/0020, #172).
--
-- The local docker-compose MariaDB applies schema.sql automatically, but
-- production (IONOS) does not - schema.sql is applied by hand once, and
-- these two tables were added after that. Run this file against the
-- production `hobbyhub` database via phpMyAdmin (SQL tab) or the CLI:
--
--   mysql -u<user> -p <database> < api/sql/2026_brettspielpreise_cache.sql
--
-- Safe to re-run: both tables are created only if missing.
-- Verify afterwards with:
--   SHOW TABLES LIKE 'brettspielpreise%';  -- expect 2 rows.

CREATE TABLE IF NOT EXISTS brettspielpreise_cache (
    query_key VARCHAR(255) PRIMARY KEY,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS brettspielpreise_throttle (
    id TINYINT PRIMARY KEY DEFAULT 1,
    last_call_at DOUBLE NOT NULL
);
