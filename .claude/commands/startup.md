Run this repo's session-start routine now, in order. Don't ask for confirmation between steps — just do them and report results concisely at the end.

1. **Graphify.** Check whether `graphify-out/graph.json` exists.
   - If it exists, skip straight to using it if the conversation needs codebase Q&A later (`graphify query "<question>"`) — don't rebuild it.
   - If it doesn't exist, invoke the `graphify` skill on the repo (`/graphify`) to build it.

2. **Agent skills config.** Check whether `docs/agents/issue-tracker.md` and `docs/agents/domain.md` already exist and whether `CLAUDE.md` has an `## Agent skills` block referencing them.
   - If both exist and look current, treat setup as already done — do not attempt to invoke `/setup-matt-pocock-skills` yourself, it is restricted to explicit user invocation and will error if you try.
   - If they're missing or look stale, tell the user to run `/setup-matt-pocock-skills` themselves — don't proceed on their behalf.

3. **Handoff doc.** Look under `C:\Users\<user>\.claude\handoff\hobbyhub\` for the newest timestamped file.
   - If found, read it and print full content so both of you have it in view before continuing.
   - If this repo's folder is empty or missing, list the five most recent handoffs across all project folders (timestamp, project, and slug each) and ask the user which to load — don't auto-pick.
   - Also check the OS temp directory (e.g. `C:\Users\<user>\AppData\Local\Temp\`) for a stray `hobbyhub-handoff.md` — the handoff skill's own docs hardcode temp, so a file landing there is the plugin default reasserting itself, not a bug in this setup. Mention it if found.

End with a short status line: what's built, what's configured, whether a handoff was found, and what it says the next task is (if any).
