# ADR-0005: Marketplace listing images

## Status
Superseded (2026-08-05) — the Marketplace feature was extracted to the
separate [kluge-boards-and-cards](https://github.com/Sheodred/kluge-boards-and-cards)
project as part of the PHP/MySQL migration (see `docs/adr/0009`) and put on
that project's roadmap, not rebuilt there or here yet. Kept for reference;
the reasoning below still applies whenever Marketplace actually gets built.

~~Accepted (open for revisit — see open question in ROADMAP/plan)~~

## Context
Listings need images. Building real upload/object-storage (S3, MinIO, or
disk-volume-serving) is meaningfully more infrastructure for a hobby
project's v1.

## Decision
`ListingImage.url` is an external URL field in v1 — no upload pipeline.
Sellers paste a hosted image URL (e.g. from a phone-upload-to-imgur-style
flow, or any existing image host).

## Consequences
- No storage service to stand up, secure, or pay for in v1.
- Listing creation UX is slightly rougher (paste a URL vs. drag-and-drop
  upload) — acceptable trade-off for a hobby project's launch.
- Revisit if/when real upload becomes worth the added infrastructure.
