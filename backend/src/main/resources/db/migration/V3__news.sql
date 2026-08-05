-- Cached homepage news items (Tagesschau, WotC/Magic) - populated by a
-- scheduled backend job, never fetched live per page view (see
-- NewsRefreshService). Each scheduled run replaces every row for its
-- source in one transaction, so this table only ever holds the latest
-- fetch, not a growing history.
CREATE TABLE news_items (
    id UUID PRIMARY KEY,
    source VARCHAR(20) NOT NULL,
    headline TEXT NOT NULL,
    teaser TEXT,
    url TEXT NOT NULL,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ NOT NULL,
    sort_order INT NOT NULL
);

CREATE INDEX idx_news_items_source ON news_items (source, sort_order);
