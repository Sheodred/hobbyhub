## Agent skills

### Issue tracker

Issues live as GitHub Issues in this repo (Sheodred/hobbyhub), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Starting a new session

Run `/startup` at the start of a new session in this repo, especially
one continuing from a previous session. It bundles: checking/building
the graphify graph, verifying the agent-skills config, and reading any
handoff doc from the OS temp directory (`/mattpocock-skills:handoff`
writes there, never into this repo — no auto-loading, a fresh session
only picks one up once told to). See `.claude/commands/startup.md`.
