# ADR-0004: Chess game persistence

## Status
Accepted

## Context
The spec explicitly says the chess page needs no backend involvement — the
AI opponent (Stockfish) runs entirely client-side.

## Decision
No backend entity for chess games. In-progress game state (FEN, move list,
selected difficulty) persists to `localStorage` only, so a page refresh
doesn't lose the current game.

## Consequences
- No cross-device game sync, no game history beyond the current browser.
- Zero backend surface area for this feature — nothing to secure, migrate,
  or test server-side.
- The localStorage persistence is a small addition beyond the literal spec
  (which doesn't mention surviving a refresh) — cheap to add, meaningfully
  better UX, flagged here rather than silently assumed.
