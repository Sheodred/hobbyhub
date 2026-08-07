Run this repo's session-start routine now, in order. Don't ask for confirmation between steps — just do them and report results concisely at the end.

1. **Graphify.** Check whether `graphify-out/graph.json` exists.
   - If it exists, skip straight to using it if the conversation needs codebase Q&A later (`graphify query "<question>"`) — don't rebuild it.
   - If it doesn't exist, invoke the `graphify` skill on the repo (`/graphify`) to build it.

2. **Agent skills config.** Check whether `docs/agents/issue-tracker.md` and `docs/agents/domain.md` already exist and whether `CLAUDE.md` has an `## Agent skills` block referencing them.
   - If both exist and look current, treat setup as already done — do not attempt to invoke `/setup-matt-pocock-skills` yourself, it is restricted to explicit user invocation and will error if you try.
   - If they're missing or look stale, tell the user to run `/setup-matt-pocock-skills` themselves — don't proceed on their behalf.

3. **Handoff doc.** Look in the OS temp directory (e.g. `C:\Users\<user>\AppData\Local\Temp\`) for a file matching this repo's name (e.g. `hobbyhub-handoff.md`).
   - If found, read it and print its full content so both of you have it in view before continuing.
   - If not found, say so briefly and move on — don't treat it as an error.

End with a short status line: what's built, what's configured, whether a handoff was found, and what it says the next task is (if any).
