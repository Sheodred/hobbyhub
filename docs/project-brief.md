# Project Brief: Full-Stack Hobby Web App

Original brief as given, with the Master Task Checklist (section 8)
annotated against actual verified repo/CI state as of 2026-08-05 -
`[x]` done, `[~]` partially done / done differently than specced (see
note), `[ ]` not started. Everything above section 8 is the unmodified
original spec, kept for reference.

**Status notes that apply throughout, not repeated per line:**
- Graphify (section 0) was explicitly declined - not installed, per an
  explicit user decision (unverified third-party pip package). Codebase
  navigation instead uses this session's own Grep/Glob/Explore-agent tools.
- The `architecture`/`system-design`/`testing-strategy`/`code-review`/
  `documentation`/`deploy-checklist` skills named in section 0 don't exist
  in this Claude Code environment - general engineering practice was used
  in their place at the relevant points (ADRs in `docs/adr/` instead of an
  `architecture` skill, `docs/deploy-checklist.md` instead of a
  `deploy-checklist` skill run, etc).

---

> Paste everything below this line as your first message to Claude Code. It has everything needed to scaffold and build the app end to end.

---

## 0. Setup: use Graphify for codebase understanding

Before starting, install and initialize **Graphify**, an open-source knowledge-graph skill for AI coding assistants (MIT license, works with Claude Code out of the box):

```bash
pip install graphifyy && graphify install
```

Once the repo has some structure, run `/graphify ./` after major milestones (e.g., after scaffolding, after backend is up, after frontend is up) to rebuild the knowledge graph. Use `/graphify query`, `/graphify path`, and `/graphify explain` to navigate the codebase instead of re-reading everything from scratch as the project grows. This keeps context cheap and traceable across the whole build.

Also use these built-in engineering skills at the right moments:
- **architecture** — before locking in the stack/auth/library choices below, write a short ADR.
- **system-design** — before implementing the backend, design the API and data model (users, MTG cards/collections, marketplace listings, chess games).
- **testing-strategy** — define the test plan before writing tests (auth flows, marketplace CRUD, chess move validation).
- **code-review** — run before merging each feature.
- **documentation** — generate the README and setup docs once the app runs.
- **deploy-checklist** — run before the first production deploy.

---

## 1. Goal

Build a complete, production-quality web application, **entirely in English** (no other languages in the UI), for a personal hobby project covering: a members/login area, legal/compliance pages, an "About Me" page, a fancy but flexible homepage, a Magic: The Gathering subpage, a marketplace page for board games and cards currently for sale, and a page to play chess against an AI opponent. The UI should feel polished and include animation throughout, with a persistent banner (header) and a resizable sidebar as the app shell.

## 2. Tech Stack

**Frontend:** React 18 + TypeScript + Vite
- Styling: Tailwind CSS
- Animation: Framer Motion (page transitions, micro-interactions, hero animations)
- Resizable sidebar: `react-resizable-panels` (or `allotment`) with a drag handle; persist width in `localStorage`
- Routing: React Router
- State/data fetching: TanStack Query

**Backend:** Java 21 + Spring Boot 3
- Spring Web (REST API)
- Spring Security + JWT for authentication/sessions
- Spring Data JPA + PostgreSQL
- Bean Validation for request validation
- Flyway for DB migrations

**Chess AI:** `chess.js` for rules/move validation in the frontend, `stockfish.js` (WASM) running client-side as the AI opponent, with adjustable difficulty (search depth/skill level). No backend involvement needed for this unless you want server-authoritative games later.

**Magic: The Gathering data:** Scryfall REST API (free, public, no key required) for card search, images, and metadata.

**Infra:** Docker Compose (frontend, backend, Postgres) for local dev; GitHub Actions for CI (lint, test, build). Postgres also runs the `pgvector` extension (used by the lore chatbot, section 6) so there's no extra database to operate.

## 3. App Shell (applies to every page)

- **Banner/header:** logo, primary nav, login/account menu (avatar + dropdown when logged in, "Log in / Sign up" buttons when not).
- **Sidebar:** collapsible and resizable via drag handle; remembers width and collapsed state between visits; becomes a slide-out drawer on mobile.
- Fully responsive down to mobile widths.
- Animated route transitions and hover/press micro-interactions throughout (Framer Motion). Keep animations subtle and performant — no motion that blocks usability, and respect `prefers-reduced-motion`.

### 3.1 Visual Direction

The design should look modern but must **not** default to the generic "AI-generated SaaS" look (centered hero, purple/blue gradient blob, Inter font, rounded white cards with soft shadows, generic 3-icon feature grid). Instead:
- Pick a distinct, opinionated visual identity early — e.g. a bold display typeface for headings, an unusual but readable color palette (not the default indigo/violet gradient), and a layout with some asymmetry rather than everything centered in a max-width column.
- Let content type drive style: the homepage can be more expressive/atmospheric, while the marketplace and chess pages should stay functional and information-dense.
- Before implementing, produce 2–3 quick visual directions (mood board or a couple of static mockups) and pick one, rather than styling page-by-page as you go — this is what keeps a hobby site from ending up looking like every other template.

## 4. Pages

### 4.1 Homepage
An open-ended, "fancy" landing page — hero section with animation (e.g., animated gradient, subtle particles, or motion graphics), short intro, highlight cards linking to the MTG page, marketplace, and chess page, and a clear call-to-action to sign up/log in. Content and exact layout are intentionally not fully specified — use good design judgment for a hobby site (not corporate/SaaS-styled).

**News & info panels (3, on the homepage):**
1. **Daily news (Tagesschau), 3–5 items.** Use the unofficial-but-documented Tagesschau API (`https://www.tagesschau.de/api2u/homepage/`, docs at `github.com/bundesAPI/tagesschau-api`). It's free and keyless but restricted to private/non-commercial use, capped at 60 requests/hour, and content beyond CC-licensed material may not be republished verbatim — show headline + short teaser + link out, don't reproduce full articles. Fetch on a backend schedule (e.g. every 15–30 min) and cache/serve from Postgres; never call it live per page view.
2. **3 latest Wizards of the Coast / Magic news items.** WotC discontinued their official RSS feed and there's no public news API, so this needs a small scheduled backend job that fetches `magic.wizards.com/en/news` (check their robots.txt/ToS first) and extracts headline + date + link only — not full article bodies. Flag this as a "may break" integration since it depends on WotC's page structure; keep a manual-curation fallback (a simple admin-editable list) in case the scraper breaks.
3. **Weather at the visitor's location.** Ask for browser geolocation permission (`navigator.geolocation.getCurrentPosition`), then call Open-Meteo's forecast API with the returned lat/long — it's free, keyless, no signup, and generous enough (10,000 calls/day non-commercial) for a hobby site. Handle permission-denied gracefully (fall back to a default city, or just hide the panel) rather than blocking the page on it.

All three panels should be small cards with a loading skeleton and a graceful empty/error state, and should fade/slide in on load to fit the animation requirement.

### 4.2 Member / Login Area
- Sign up, log in, log out, password reset flow.
- JWT-based sessions, passwords hashed with BCrypt.
- Protected routes/pages that require login (e.g., profile, MTG collection tracking if added later).
- Basic profile page (username, email, avatar placeholder).

### 4.3 About Me
Static personal bio page — photo, short bio, interests, contact links. Simple content page, no special logic.

### 4.4 Magic: The Gathering Subpage — Card Browser
- Search and browse Magic cards via the Scryfall API (by name, color, type, set).
- Card grid with images; click through to a detail view (oracle text, mana cost, set, price if available from Scryfall).
- **Related combos panel:** next to the card detail (right-hand side, like `edhrec.com/combos/lightning-bolt`), show up to 3 combos/combo-cards that use the searched card — however many fit, up to 3. Pull this from the **Commander Spellbook** API (`backend.commanderspellbook.com`, open, no key required; there's also an npm wrapper package `commander-spellbook`), which is the actual combo database behind EDHREC's combo pages — querying it directly is more reliable than scraping EDHREC's HTML. For each combo shown: the other card(s) in the combo, card count ("N card combo"), number of decks it appears in, what it produces (e.g. "Infinite damage"), and a link to the full combo detail. Cache responses server-side like the other MTG data sources.
- Optional stretch goal: let logged-in members save cards to a personal list.

### 4.5 Magic: The Gathering Subpage — Meta & Stats

A second, separate MTG page focused on the competitive/popularity meta rather than card lookup. Shows small "top 3" widgets for:
- Most played cards (overall)
- Most popular Commander decks
- Strongest Standard decks
- Strongest Commander decks

Data source notes (checked, as of Aug 2026):
- **EDHREC** exposes an open, key-free JSON API at `json.edhrec.com` (e.g. top commanders by week/month/year/all-time, per-card inclusion rates, synergy scores). This is the best fit for "most popular Commander decks" and "most played cards" — no auth needed, community Python wrapper `pyedhrec` exists as reference.
- **Moxfield** does *not* have a full public API for decks/collections — only a limited card-data API. Pulling specific decks from Moxfield would require contacting their team for an authorized `User-Agent` (scraping without permission violates their ToS). Treat Moxfield as a manual "link out to this deck" source rather than a live data feed, unless/until authorized access is granted.
- For "strongest Standard/Commander decks" (competitive tier lists, not just popularity), sites like MTGGoldfish publish metagame breakdowns but have no official public API either. Options: curate this section manually/periodically, or revisit once a proper data source/partnership is confirmed. Don't scrape sites whose ToS forbid it.
- Cache all external data server-side (e.g. refresh every few hours via a scheduled job) rather than calling out on every page load.

### 4.6 Marketplace — Board Games & Cards For Sale
- Listing page showing items currently for sale: image, title, price, condition, short description.
- Simple filtering/sorting (by category: board games vs. cards, price).
- **Image fallback for card listings:** when a listing is a Magic card (not a board game) and the seller hasn't uploaded their own photo, fall back to that card's image from the Scryfall API instead of showing a placeholder. Card listings should store the Scryfall card identifier (name + set, or the Scryfall `id`) at creation time so the right image can always be resolved; resolve and cache the image URL server-side (don't call Scryfall live on every page render). Board game listings have no such fallback source, so those still need an uploaded photo or a generic placeholder.
- No real payment processing in v1 — this is a listing/inquiry page, not a live checkout. If real payments are wanted later, integrate a provider like Stripe rather than building custom payment handling.

### 4.7 Chess vs. AI
- Use `react-chessboard` (pairs with `chess.js` for rules/state) for the board — it ships with a classic/Staunton-style default piece set, the same visual language as lichess/chess.com, and built-in drag-and-drop, so there's no need to hand-roll board rendering or drag logic.
- **Drag-and-drop must work** as the primary interaction; keep click-to-move (click origin square, click destination) available too as a fallback for accessibility/mobile/keyboard use.
- Play against a client-side Stockfish engine (`stockfish.js`, WASM) with a difficulty selector.
- Game state, move history, basic result detection (checkmate/stalemate/draw).

### 4.8 Magic: The Gathering Fan Game — Landing/Link Page

A page on the main site that showcases and links out to a separate MTG-themed fan game project (own repo, see section 5). Concept: exploring the planes of the Multiverse — could end up as a 2D exploration game (simplest to scope and ship); final form depends on how far the lore-collection work goes. On the main site this page just needs: a description, screenshots/GIFs once available, and a link to the game (hosted separately or embedded via iframe if it's a small web build). Keep this page's content flexible/placeholder-friendly since the game itself is a separate, longer-running project.

### 4.9 Legal Pages (required)
- **Impressum** (German legal notice, required under TMG §5 for operators based in or targeting Germany): operator name and address, contact details (email/phone), commercial register info and VAT ID if applicable, name of the person responsible for content per §18(2) MStV.
- **Privacy Policy / Datenschutzerklärung** (GDPR-compliant): what data is collected (accounts, cookies, contact forms), legal basis, hosting provider, data retention, user rights (access/deletion/export), contact for data protection questions.
- **Terms of Service / AGB**, especially since items are listed for sale.
- **Cookie consent banner** if any non-essential cookies or analytics are used.

> Note: this is not legal advice. Templates are a starting point — have the actual legal text reviewed before the site goes live, especially given the marketplace page involves selling goods.

## 5. Second Repo: MTG Fan Game (separate from the main web app)

This is a distinct, longer-running side project — do **not** build it inside the main web app repo. Keep it separate so the (free, non-commercial) fan game never gets tangled with the main site's commercial marketplace.

**Legal note (Wizards of the Coast Fan Content Policy, checked Aug 2026):** fan-made, non-commercial MTG content is allowed for personal use/sharing for free, provided it: stays completely free (no monetization, no ads tied to it), includes a visible disclaimer that it's unofficial Fan Content not endorsed by Wizards of the Coast, doesn't use Wizards' logos/trademarks, and doesn't infringe on others' IP. Verify the current wording at company.wizards.com/en/legal/fancontentpolicy before publishing, since policies can change. This is not legal advice.

**Step 1 — Lore corpus:** Before building the game, collect and summarize MTG lore as a structured text corpus (planes, major characters/storylines, timeline) stored in this repo (e.g. `/lore` as Markdown files, one per plane/arc). Where lore text is sourced from wikis (e.g. MTG Wiki / Fandom), respect that wiki's license (typically CC BY-SA) and attribute accordingly — don't just copy-paste large verbatim blocks; summarize in your own words.

**Step 2 — Game concept:** Once the lore is organized, decide the concrete format — most realistically a 2D top-down or side-scrolling exploration game where the player moves between a handful of iconic planes, with the summarized lore surfaced as in-game text/codex entries. Suggested stack for a first playable version: TypeScript + a lightweight 2D engine (e.g. Phaser or a Canvas/PixiJS setup) so it can run in the browser and be linked/embedded from the main site's fan-game page (4.8).

**Step 3 — Populate:** Use the structured lore corpus as the content source for both the game (level/plane descriptions, NPC dialogue) and the main site's fan-game page.

## 6. Magic Lore Chatbot

A chat feature on the main web app that answers questions about Magic: The Gathering lore (planes, characters, storylines) in natural language. Concept: retrieval-augmented generation (RAG) over the same lore corpus from the fan-game repo (section 5), not a fine-tuned model — cheaper, easier to keep accurate/up to date, and avoids training-data licensing questions entirely.

**Where the data lives:**
- Canonical source stays the `/lore` Markdown corpus in the MTG Fan Game repo (single source of truth — no duplicating/diverging content between the game and the chatbot).
- An ingestion step chunks each lore file into ~500–800 token passages (with slight overlap so context isn't cut mid-thought), embeds each chunk, and stores them in a `lore_chunks` table in the main app's existing Postgres via the **pgvector** extension: `(id, source_file, heading, content, embedding vector, updated_at)`. Reusing Postgres avoids standing up a separate vector database for a hobby project.
- Re-run ingestion whenever `/lore` changes — simplest approach is a small CLI/script (Java command-line runner in the backend, or a script in the fan-game repo that pushes an updated export) triggered manually or on a schedule; no need for real-time sync at this scale.

**Where the LLM runs:**
- Don't self-host a model — running a capable LLM needs GPU infrastructure that's unnecessary cost/complexity for a hobby project's traffic level.
- Use a hosted LLM API called **server-side from the Spring Boot backend** (e.g. the Claude API, since this is already a Claude-built project) — never call the LLM directly from the browser, so the API key stays secret and usage can be logged/rate-limited. A smaller/cheaper model tier is enough for lore Q&A; only bump to a larger model if answer quality needs it.
- Embeddings likewise via a hosted embeddings API (e.g. Voyage AI) rather than running a local embedding model — one less thing to operate.

**Request flow (RAG):**
1. User asks a question in the chat UI.
2. Backend embeds the question and does a cosine-similarity search in `lore_chunks` (pgvector) for the top ~5 most relevant passages.
3. Backend builds a prompt: system instructions (answer only from the supplied lore context, say so when the answer isn't in the corpus, stay in a friendly "lore keeper" tone, and include the required fan-content disclaimer in the UI around the chat, not in every message) + the retrieved passages + the user's question.
4. Backend calls the LLM API and streams the response back to the frontend (Server-Sent Events), so the reply types itself out — a natural fit for the animation requirement.
5. No long-term conversation storage needed for v1; keep each question stateless, or hold short-lived context in the browser session only.

**Placement & guardrails:**
- Surface it as a small chat panel on the fan-game page (4.8) and/or the MTG card browser (4.4), rather than a separate top-level page — it's a companion to the lore content, not a standalone destination.
- Gate it behind login (reuses the existing member auth) to keep API costs bounded and attributable per user.
- Apply a simple per-user rate limit (e.g. N questions/hour) stored in Postgres; no need for a dedicated rate-limiting service at this scale.
- Keep the same Fan Content Policy disclaimer visible near the chatbot as on the fan-game page (section 4.8 / 5): unofficial, non-commercial, not endorsed by Wizards of the Coast.

## 7. Non-Functional Requirements

- All UI copy in English only.
- Accessible: semantic HTML, keyboard navigation, ARIA labels where needed, `prefers-reduced-motion` respected.
- Automated tests: JUnit for backend, Vitest + React Testing Library for frontend.
- README with local setup instructions (Docker Compose one-liner ideally).

## 8. Master Task Checklist for Claude Code

Work through this top to bottom. Each phase links back to the section above with the full detail — treat this as the execution list, and the sections above as the spec to consult while doing each item.

### Phase 0 — Setup
- [ ] Install and initialize Graphify (`pip install graphifyy && graphify install`), section 0. **Declined** (unverified third-party package) — Grep/Glob/Explore-agent used instead.
- [ ] Know when to reach for the `architecture`, `system-design`, `testing-strategy`, `code-review`, `documentation`, and `deploy-checklist` skills. **N/A** — none of these skills exist in this Claude Code environment.
- [x] Scaffold the monorepo: frontend (React + TS + Vite) and backend (Spring Boot 3) projects, Docker Compose (frontend, backend, Postgres), GitHub Actions CI skeleton (lint, test, build). *(Postgres does not have `pgvector` enabled yet — deferred with the lore chatbot, section 6/Phase 11.)*
- [ ] Run `/graphify ./`. **N/A** — tool not installed.

### Phase 1 — Visual direction
- [~] Produce 2–3 quick visual directions and commit to one before building components. A distinct dark, asymmetric visual identity was applied consistently from the homepage onward, but not via an explicit separate "3 mockups, pick one" exercise.
- [x] Confirm the direction avoids the generic AI-SaaS look. Dark theme, asymmetric highlight cards, real accent-color gradients per section — not a centered purple/blue blob template.

### Phase 2 — App shell
- [x] Banner/header: logo, nav, login/account menu.
- [x] Resizable, collapsible sidebar with drag handle, persisted width/collapsed state, mobile drawer behavior (drawer now also has Escape-to-close, focus trap, and focus restoration).
- [x] Routing, base Tailwind setup, Framer Motion wired in for route transitions and micro-interactions, `prefers-reduced-motion` respected throughout.

### Phase 3 — Auth
- [x] Backend: Spring Security + JWT, BCrypt password hashing, signup/login/logout/password-reset endpoints (password-reset **email delivery** itself is dev-only — see `docs/adr/0007` and the deploy checklist).
- [x] Frontend: signup/login/logout flows, protected routes, basic profile page.

### Phase 4 — Homepage
- [x] Hero section + highlight cards linking to MTG, marketplace, chess.
- [x] News panel 1 — Tagesschau. Backend `NewsRefreshService` (every 20 min, Postgres-cached) + frontend `TagesschauPanel`.
- [x] News panel 2 — WotC news. Scraping-based (no official API/RSS anymore, robots.txt allows it) with a hardcoded manual fallback list per the brief's "may break" caveat.
- [x] News panel 3 — Weather. Browser geolocation → direct Open-Meteo call (not proxied through the backend) — also disclosed in the Privacy Policy.
- [x] Loading skeleton / empty / error states + fade-in for all three panels (shared `InfoPanelCard`/`NewsListPanel`).

### Phase 5 — About Me & legal pages
- [x] About Me static page.
- [x] Impressum, Privacy Policy/Datenschutzerklärung, Terms of Service/AGB, cookie consent component (built, not yet mounted — no non-essential cookies/analytics exist to consent to). Draft content, explicitly flagged (dev-only banner + `docs/adr/0006`) for human legal review before go-live.

### Phase 6 — Magic: The Gathering
- [x] Card Browser: Scryfall search/browse/detail view. Also added: a Scryfall hover-preview on card/commander names (not in the original brief, added on explicit request) and a "Meta & Stats" CTA to the new page below.
- [x] Related combos panel on the card detail view (Commander Spellbook API) - up to 3 combos, styled as a right-hand panel per the brief, with card-name hover previews.
- [x] Meta & Stats page (`/mtg/meta`) - EDHREC for most-played cards + popular Commander decks; Moxfield as a manual link-out (no public deck API, as the brief predicted). **Deviates from the brief on purpose:** Standard/Commander tier lists are scraped live from MTGGoldfish (their robots.txt explicitly allows crawling/reference use) rather than hand-curated, since a real "may break gracefully" data source beat manual maintenance - see `docs/deploy-checklist.md`-adjacent reasoning in the PR history (PR #22).

### Phase 7 — Marketplace
- [x] Listing page: image, title, price, condition, description, filter/sort by category and price.
- [ ] Card listings storing a Scryfall reference with server-side-resolved fallback images. **Not implemented as specced** — `docs/adr/0005` deliberately simplified v1 to a plain external-URL image field (no upload pipeline, no automatic Scryfall resolution); seed data pastes real Scryfall image URLs directly instead. Revisit if/when this is worth building.
- [x] No live payments in v1 — inquiry-only.

### Phase 8 — Chess vs. AI
- [x] Custom click-to-move board (not `react-chessboard` — hand-built with real `<button>` grid cells, ARIA labels, and a "coin" piece design for guaranteed contrast; see `docs/adr/*` and PR #9). Functionally equivalent (keyboard-accessible click-to-move as primary interaction) but no drag-and-drop, since the board wasn't built on `react-chessboard`.
- [x] Client-side Stockfish (WASM) opponent with difficulty selector, move history, result detection.

### Phase 9 — Fan-game link page (main repo)
- [ ] Placeholder-friendly page: description, link out, screenshots/GIFs once available. **Not started.**

### Phase 10 — MTG Fan Game (separate repo)
- [x] Second repo created (`Sheodred/mtg-planeswalk`) with the Fan Content Policy disclaimer in its README.
- [x] Lore corpus: `overview.md` plus four planes (Dominaria, Ravnica, Innistrad, Zendikar), original wording, general-knowledge grounding rather than any single copied source.
- [x] Game concept decided: 2D top-down exploration, Phaser proposed, four planes as the initial scope (`CONCEPT.md`) — concept-only, no game code yet, per explicit scope decision.
- [ ] Wired into the main site's fan-game page — blocked on Phase 9 above not existing yet.

### Phase 11 — Lore chatbot
- [x] Infrastructure concept decided and written up: `docs/adr/0008-lore-chatbot-elasticsearch.md` - a dedicated Elasticsearch instance in hobbyhub's own `docker-compose.yml` (separate network/volume/port from hybrid-search-api's, isolated by Docker Compose's per-project scoping), `lore_chunks` index with a `dense_vector` field for kNN in place of the brief's pgvector plan. Reference service YAML and index mapping are in the ADR, not yet applied to the real `docker-compose.yml`.
- [ ] **Building the actual chatbot is on the roadmap, not being worked on now** - explicit instruction (2026-08-05). Nothing below this line is started: enabling the Elasticsearch service for real, picking an embeddings API (fixes the `dims` value), ingestion job, RAG endpoint, chat panel.

### Phase 12 — Polish & ship
- [x] Animation pass across all pages.
- [~] Responsive QA down to mobile — code-level review only (breakpoint classes, no fixed widths found); real narrow-viewport verification blocked by a confirmed environment limitation (`resize_window` reports success but the viewport stays desktop-sized), documented as a manual TODO in the README.
- [x] Accessibility pass: keyboard nav, ARIA, contrast (MobileDrawer modal behavior, focus rings, WCAG AA contrast fixes — see PR #13).
- [~] Automated tests covering auth, marketplace CRUD, chess move validation — all three areas are well covered; broader hardening across the rest of the backend is ongoing, not exhaustive.
- [x] README with setup instructions (Docker Compose one-liner).
- [ ] Run the `deploy-checklist` skill. **N/A** — skill doesn't exist; `docs/deploy-checklist.md` was written by hand as the functional equivalent instead.

---

*End of brief.*
