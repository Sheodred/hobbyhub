-- Cached MTG "Meta & Stats" widgets (section 4.5) - most-played cards and
-- popular Commander decks from EDHREC's JSON API, Standard/Commander tier
-- lists scraped from MTGGoldfish's metagame pages. Populated by a scheduled
-- job (MtgMetaRefreshService), same replace-all-rows-per-category shape as
-- news_items.
CREATE TABLE mtg_meta_entries (
    id UUID PRIMARY KEY,
    category VARCHAR(30) NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    num_decks INTEGER,
    sort_order INT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_mtg_meta_entries_category ON mtg_meta_entries (category, sort_order);
