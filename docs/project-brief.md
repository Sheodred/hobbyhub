# Project Brief: Full-Stack Hobby Web App

Original brief as given, with the Master Task Checklist (section 8)
annotated against actual verified repo/CI state as of 2026-08-05 -
`[x]` done, `[~]` partially done / done differently than specced (see
note), `[ ]` not started. Everything above section 8 is the unmodified
original spec, kept for reference - including every original checkbox
in section 8 itself, preserved verbatim rather than condensed, so each
one can be checked individually against real repo state.

*(Correction, 2026-08-05: section 0 and section 8 briefly held a
paraphrased/condensed version of the original text rather than the
brief as actually given - caught and fixed on request, since fidelity
is the whole point of this document. Sections 1-7 were never affected.)*

**Status notes that apply throughout, not repeated per line:**
- Graphify (section 0.1) was explicitly declined for the entire original
  build - not installed, per an explicit user decision (unverified
  third-party pip package). Codebase navigation instead used this
  session's own Grep/Glob/Explore-agent tools throughout. **Update
  (2026-08-06): installed after all**, on separate explicit request well
  after the original build was done - `graphify claude install` wired up
  the CLAUDE.md directive and a PreToolUse hook (`.claude/settings.json`),
  and `graphify update .` built the initial graph (`graphify-out/`,
  gitignored, regenerable). Doesn't retroactively change how any of the
  work described below was actually done.
- MarkItDown (section 0.2) is applied as a *global* CLAUDE.md rule for the
  operator (not committed to this repo), but was never actually exercised
  during this build - no PDF was read at any point.
- The `architecture`/`system-design`/`testing-strategy`/`code-review`/
  `documentation`/`deploy-checklist` skills named in section 0 don't exist
  in this Claude Code environment - general engineering practice was used
  in their place at the relevant points (ADRs in `docs/adr/` instead of an
  `architecture` skill, `docs/deploy-checklist.md` instead of a
  `deploy-checklist` skill run, etc).
- **Post-launch (2026-08-05): the backend described below (Spring Boot,
  PostgreSQL, JWT auth, marketplace) was migrated to PHP/MySQL on IONOS
  Webhosting Plus, and auth/marketplace were extracted to a separate
  project.** This brief and its Phase 0-12 checklist are kept as the
  unmodified historical record of the original build - see
  `docs/adr/0009` for the migration itself and `docs/architecture.md` for
  the current system.

---

> Paste everything below this line as your first message to Claude Code. It has everything needed to scaffold and build the app end to end.

---

## 0. Setup: Claude Code environment (Graphify + PDF handling)

### 0.1 Graphify — codebase knowledge graph

Install and initialize **Graphify**, an open-source (MIT) knowledge-graph skill for AI coding assistants, and wire in its full Claude Code integration in one go:

```bash
pip install graphifyy
graphify install
graphify claude install   # run from inside the project root
```

`graphify claude install` sets up the always-on integration automatically — no manual CLAUDE.md editing needed:
- Adds a **CLAUDE.md** section telling Claude to read `graphify-out/GRAPH_REPORT.md` before answering architecture questions.
- Installs a **PreToolUse hook** (in `.claude/settings.json`) that fires before every `Glob`/`Grep` call, nudging Claude toward the graph (god nodes, communities, surprising connections) instead of blindly grepping raw files.

Keep the graph fresh as the project grows: `graphify hook install` adds git post-commit/post-checkout hooks that rebuild it automatically, or run `/graphify ./raw --watch` in a background terminal for live rebuilds while coding. For precise lookups, use `/graphify query`, `/graphify path`, and `/graphify explain` directly instead of re-reading files from scratch.

### 0.2 PDF handling — use MarkItDown instead of raw PDF reads

Claude Code's `Read` tool renders PDF pages as images by default, which burns far more tokens than plain text for text-heavy PDFs (legal templates, rules references, etc. — relevant here for the Impressum/legal drafting and any MTG rules-text sources for the lore corpus). Install MarkItDown:

```bash
pip install 'markitdown[pdf]'
```

Add this rule to the project's `CLAUDE.md`:

```
## PDF Handling
Never Read .pdf files directly. First run:
  markitdown "<path>" -o "<path>.md"
via Bash, then Read the resulting .md file instead.
```

For a hard guarantee instead of a followed instruction, also add a `PreToolUse` hook matched to the `Read` tool that blocks any `.pdf` path (exit code 2) and points Claude at the `markitdown` command in its place, mirroring how Graphify's own `PreToolUse` hook works above.

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

## 6. Boardgame Lookup

A search feature: enter a board game's name and get back its aggregated star ratings from several review sites, a short "good vs. bad" summary distilled from those reviews, and a short description of the playstyle — as easy as possible, one search box in, one answer out.

**Open architecture question (deliberately not settled here):** whether to scrape review sites fresh on every search, or cache each looked-up game's data in our own DB and only re-scrape on a miss or once the cached entry is older than a TTL. This needs a real plan (data sources, their ToS, refresh cadence, schema) before implementation starts — tracked via a GitHub issue and worked out through this repo's usual brainstorming/planning process rather than prescribed here. See the issue for current status.

**Precedent already in this repo:** section 4.5 (MTG Meta) hit the same shape of problem (cache external data server-side, don't scrape sites whose ToS forbid it) — reuse that reasoning rather than re-deriving it.

> Note: the Magic Lore Chatbot that used to live in this section has moved to the MTG Fan Game project's own roadmap (separate repo, see section 5) — the RAG/lore-chatbot design belongs with the lore corpus it depends on, not with this app's roadmap.

## 7. Non-Functional Requirements

- All UI copy in English only.
- Accessible: semantic HTML, keyboard navigation, ARIA labels where needed, `prefers-reduced-motion` respected.
- Automated tests: JUnit for backend, Vitest + React Testing Library for frontend.
- README with local setup instructions (Docker Compose one-liner ideally).

## 8. Master Task Checklist for Claude Code

Work through this top to bottom. Each phase links back to the section above with the full detail — treat this as the execution list, and the sections above as the spec to consult while doing each item.

### Phase 0 — Setup
- [~] Install Graphify and run `graphify claude install` to wire up the CLAUDE.md directive + PreToolUse hook automatically (section 0.1). **Declined for the entire original build** — unverified third-party pip package, explicit user decision; Grep/Glob/Explore-agent used instead throughout. **Installed later (2026-08-06)** on separate explicit request, well after the fact - doesn't change how the work below was actually done.
- [~] Install MarkItDown and add the PDF-handling CLAUDE.md rule (and optionally the blocking hook) so PDFs are never read raw (section 0.2). **Partially confirmed**: the "never Read .pdf directly, run markitdown first" rule is present in the operator's *global* CLAUDE.md (applies across all their projects, not committed to this repo). Whether the `markitdown[pdf]` pip package is actually installed, or whether the optional PreToolUse blocking hook exists, isn't verifiable from this project's own history — no PDF was ever read during this build, so the rule was never actually exercised here.
- [ ] Know when to reach for the `architecture`, `system-design`, `testing-strategy`, `code-review`, `documentation`, and `deploy-checklist` skills (section 0) — use them at the point each is relevant below, not all up front. **N/A** — none of these skills exist in this Claude Code environment; general engineering practice substituted at each relevant point instead (ADRs in `docs/adr/` for `architecture`, manual review for `code-review`, `docs/deploy-checklist.md` written by hand for `deploy-checklist`, etc).
- [x] Scaffold the monorepo: frontend (React + TS + Vite) and backend (Spring Boot 3) projects, Docker Compose (frontend, backend, Postgres with `pgvector` enabled), GitHub Actions CI skeleton (lint, test, build). *(`pgvector` was never actually enabled on Postgres — deferred with the lore chatbot, Phase 11, which stayed a roadmap item. Postgres and Spring Boot themselves were later replaced entirely by MySQL/PHP - see the migration note at the top of this document.)*
- [~] Run `/graphify ./` once there's real structure, to baseline the knowledge graph. **N/A during the original build** (Graphify declined). Done later (2026-08-06) via `graphify update .` once the tool was installed after all - 535 nodes, 696 edges, 49 communities as of that run.

### Phase 1 — Visual direction (before any real styling)
- [x] No dedicated "design review" skill is installed for this project — don't skip this step expecting a skill to catch a generic look; follow section 3.1 directly. Confirmed: no such skill exists; section 3.1 was followed directly.
- [~] Produce 2–3 quick visual directions (typeface, color palette, layout approach) and commit to one before building components, per section 3.1. A distinct dark, asymmetric visual identity was applied consistently from the homepage onward, but not via an explicit separate "3 mockups, pick one" exercise up front — the direction emerged through the early build rather than being decided before Phase 2 started.
- [x] Confirm the direction explicitly avoids the generic AI-SaaS look (centered hero, purple/blue gradient blob, default rounded-card-with-shadow grid). Dark theme, asymmetric highlight cards, real per-section accent-color gradients - not a centered purple/blue blob template.

### Phase 2 — App shell
- [x] Banner/header: logo, nav, login/account menu (section 3). *(The account menu itself was present as specced at the time this phase completed; all of auth was later removed - see the migration note at the top of this document.)*
- [x] Resizable, collapsible sidebar with drag handle, persisted width/collapsed state, mobile drawer behavior (section 3). Drawer additionally got Escape-to-close, a focus trap, and focus restoration - beyond what was specced.
- [x] Routing, base Tailwind setup, Framer Motion wired in for route transitions and micro-interactions, `prefers-reduced-motion` respected.

### Phase 3 — Auth
- [x] Backend: Spring Security + JWT, BCrypt password hashing, signup/login/logout/password-reset endpoints (section 4.2). Password-reset **email delivery** itself was dev-only (see the now-Superseded `docs/adr/0007`).
- [x] Frontend: signup/login/logout flows, protected routes, basic profile page.
- **Superseded (2026-08-05): all of Phase 3 was later removed entirely and extracted to a separate project** ([kluge-boards-and-cards](https://github.com/Sheodred/kluge-boards-and-cards)) as part of the PHP/MySQL migration - see the note at the top of this document and `docs/adr/0009`. HobbyHub itself has no accounts anymore.

### Phase 4 — Homepage
- [x] Hero section + highlight cards linking to MTG, marketplace, chess (section 4.1). *(Marketplace was later extracted along with auth; the highlight cards now link to MTG and chess only.)*
- [x] News panel 1 — Tagesschau: backend job polling `tagesschau.de/api2u/homepage/` on a schedule (≤60 req/hour, cache in Postgres), frontend card showing 3–5 headlines + teaser + link. A real bug was found and fixed here during the build: the API 308-redirects the trailing-slash path, and an unfollowed redirect silently looked like zero headlines rather than an error - fixed by dropping the trailing slash and adding explicit redirect-following (see `docs/project-history.md`). The cache backend itself later moved from Postgres to MySQL with the migration.
- [x] News panel 2 — WotC news: backend scheduled job parsing `magic.wizards.com/en/news` for the 3 latest headline/date/link (robots.txt checked); admin-editable manual fallback list built for when the scraper breaks.
- [x] News panel 3 — Weather: browser geolocation prompt → Open-Meteo forecast call → display current conditions; graceful fallback if permission is denied. No backend involvement at all - a gap the GDPR review (Phase 12-adjacent work) later caught and disclosed explicitly in the Privacy Policy.
- [x] All three panels: loading skeleton, empty/error states, fade/slide-in animation.

### Phase 5 — About Me & legal pages
- [x] About Me static page (section 4.3).
- [x] Impressum, Privacy Policy/Datenschutzerklärung, Terms of Service/AGB, cookie consent banner if needed (section 4.9). Built as a component; never mounted anywhere, since the site sets no non-essential cookies/analytics to consent to. Draft content throughout, explicitly flagged (dev-only banner + `docs/adr/0006`) for human legal review before go-live - still true today.

### Phase 6 — Magic: The Gathering
- [x] Card Browser: Scryfall search/browse/detail view (section 4.4). Also added, not in the original spec: a Scryfall hover-preview on card/commander names (explicit follow-up request) and a "Meta & Stats" CTA to the page below.
- [x] Related combos panel on the card detail view: up to 3 combos via the Commander Spellbook API, styled like `edhrec.com/combos/lightning-bolt` (section 4.4), with card-name hover previews.
- [~] Meta & Stats page: EDHREC (`json.edhrec.com`) integration for top commanders/most-played cards - done as specced. Moxfield treated as manual link-out only (no public deck API) - done as specced, this brief predicted correctly that no such API exists. Standard/Commander "strongest decks" was specced as **manual curation** pending a real data source (section 4.5); **built differently on purpose** - scraped live from MTGGoldfish instead (their robots.txt explicitly allows crawling/reference use), since a real "may break gracefully" data source beat hand-maintained content long-term (see PR #22). Cache all of it server-side - done, first via Postgres, later via MySQL cache tables with the migration.

### Phase 7 — Marketplace
- [x] Listing page: image, title, price, condition, description, filter/sort by category and price (section 4.6).
- [ ] Card listings store a Scryfall card reference; if no seller photo is uploaded, resolve and cache the Scryfall image as the fallback. Board game listings fall back to a generic placeholder instead. **Not implemented as specced** - `docs/adr/0005` (now Superseded) deliberately simplified v1 to a plain external-URL image field (no upload pipeline, no automatic server-side Scryfall resolution); seed data pasted real Scryfall image URLs directly instead.
- [x] No live payments in v1 — inquiry-only; Stripe noted as the future path if that changes.
- **Superseded (2026-08-05): the entire Marketplace feature was later extracted to a separate project** and put on *that* project's roadmap ("im Zweifel erstmal nur als Roadmap, um Zeit zu sparen") - not rebuilt there or here yet. See the migration note at the top of this document.

### Phase 8 — Chess vs. AI
- [~] `react-chessboard` + `chess.js` integration, classic/Staunton-style default piece set (section 4.7). **Built differently on purpose**: a custom click-to-move board - hand-built with real `<button>` grid cells and ARIA labels - instead of `react-chessboard` (see PR #9). Piece rendering changed 2026-08-06: the original gradient "coin" design was replaced with flat SVG piece icons on a warm chess.com-style palette (`pieceIcons.tsx`) - Unicode chess glyphs were tried in between and dropped, font/emoji rendering of those codepoints was unreliable across browsers.
- [~] Drag-and-drop as primary interaction, click-to-move as fallback. **Inverted, on purpose**: click-to-move is the primary (and only) interaction - no drag-and-drop, since the board wasn't built on `react-chessboard`. Functionally equivalent for keyboard/mobile/accessibility use, but doesn't match this line literally.
- [x] Client-side Stockfish (WASM) opponent with difficulty selector, move history, result detection.
- [x] Undo/back button and board-flip toggle (2026-08-06).
- [ ] Further board polish - the flat SVG piece set (above) is a clear improvement, but the knight icon is a rough geometric approximation, not immediately recognizable as a horse the way the other five pieces are. Not started.
- [ ] Let the player start as Black (engine plays White and moves first). Currently hardcoded - "Player is always White" (`ChessPage.tsx`). Not started.

### Phase 9 — Fan-game link page (main repo)
- [ ] Placeholder-friendly page: description, link out, screenshots/GIFs once available (section 4.8). **Not started.**

### Phase 10 — MTG Fan Game (separate repo, own track — not blocking the main app)
- [x] Create the second repo; add the required Fan Content Policy disclaimer up front (free/non-commercial, no WotC logos/trademarks) — section 5. Done: `Sheodred/mtg-planeswalk`, disclaimer in its README.
- [x] Collect and summarize the lore corpus into `/lore` Markdown files, in your own words, attributing any wiki sources per their license. Done: `overview.md` plus four planes (Dominaria, Ravnica, Innistrad, Zendikar), original wording, general-knowledge grounding rather than any single copied source.
- [x] Decide the concrete game format (default assumption: 2D exploration via Phaser or PixiJS) once enough lore is organized to know what's worth building. Done: 2D top-down exploration, Phaser proposed, four planes as initial scope (`CONCEPT.md`) - concept-only, no game code, per an explicit scope decision ("ein Konzept reicht da erst mal").
- [ ] Wire the lore corpus into both the game content and the main site's fan-game page (Phase 9). **Not done** - blocked on Phase 9 (the main-site link page) not existing yet.

### Phase 11 — Lore chatbot (depends on Phase 10 having lore content)
- [ ] Enable `pgvector` on the existing Postgres instance; create the `lore_chunks` table (section 6). **Not done, and now moot** - the infrastructure decision changed from Postgres/pgvector to a dedicated Elasticsearch instance (`docs/adr/0008-lore-chatbot-elasticsearch.md`, `lore_chunks` index with a `dense_vector` field for kNN), and Postgres itself was later replaced by MySQL entirely (see the migration note above). Reference Elasticsearch service YAML and index mapping exist in the ADR but were never applied to a real `docker-compose.yml`.
- [ ] Build the ingestion script: chunk `/lore` files, embed via a hosted embeddings API, store vectors. **Not started.**
- [ ] Backend RAG endpoint: embed question → similarity search → build prompt with retrieved context → call a hosted LLM API server-side → stream response via SSE. **Not started.**
- [ ] Frontend chat panel on the fan-game page and/or card browser, gated behind login, with per-user rate limiting and the Fan Content Policy disclaimer visible. **Not started** - and "gated behind login" is now moot regardless, since HobbyHub has no accounts anymore (see migration note above); this would need a different guardrail if ever built.
- **Explicit decision (2026-08-05): building the actual chatbot is on the roadmap, not being worked on now.** Only the infrastructure concept above is decided.

### Phase 12 — Polish & ship
- [x] Animation pass across all pages, responsive QA down to mobile, accessibility pass (keyboard nav, ARIA, contrast). *(Split out below - responsive QA and accessibility landed at different confidence levels, see the next two lines.)*
- [~] Responsive QA down to mobile - code-level review only (breakpoint classes, no fixed widths found); real narrow-viewport verification blocked by a confirmed environment limitation (`resize_window` reports success but the viewport stays desktop-sized), documented as a manual TODO in the README.
- [x] Accessibility pass: keyboard nav, ARIA, contrast (MobileDrawer modal behavior, focus rings, WCAG AA contrast fixes - see PR #13).
- [~] Automated tests: JUnit (backend), Vitest + React Testing Library (frontend) — cover auth, marketplace CRUD, chess move validation, RAG endpoint at minimum. Auth, marketplace CRUD, and chess move validation were well covered while those features existed; the RAG endpoint was never built, so it was never tested. **All 60+ backend JUnit tests were later deleted along with Spring Boot during the PHP migration, with no PHP equivalent added** (see migration note above and `docs/adr/0009`'s Consequences) - this line's original coverage no longer exists in the current codebase at all, named explicitly rather than silently dropped.
- [x] README with setup instructions (Docker Compose one-liner).
- [ ] Run the `deploy-checklist` skill before the first production deploy. **N/A** — skill doesn't exist; `docs/deploy-checklist.md` was written by hand as the functional equivalent instead, and has since been rewritten twice more (once for the original Spring Boot hosting plan, once for the IONOS/PHP migration).

---

*End of brief.*
