CREATE TABLE listings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    category     VARCHAR(20) NOT NULL,
    price        NUMERIC(10, 2) NOT NULL,
    condition    VARCHAR(50) NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_seller_id ON listings (seller_id);
CREATE INDEX idx_listings_status ON listings (status);
CREATE INDEX idx_listings_category ON listings (category);

-- URL-only images in v1 (see docs/adr/0005) - a plain child table keyed by
-- sort order, no separate entity/id needed for something this simple.
CREATE TABLE listing_images (
    listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    url        VARCHAR(2048) NOT NULL,
    PRIMARY KEY (listing_id, sort_order)
);
