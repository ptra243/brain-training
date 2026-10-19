# Next sessions

Ideas for sessions to start fresh with `/clear` (or another terminal). Each has its own
`Last touched` date. A `SessionStart` hook (`.claude/hooks/stale-sessions.mjs`) tells Claude to
mention any entry untouched for 14 days or more and ask whether to keep, update or drop it.

Keeping an entry current: when you work on one, or when its handoff docs change, update its
`Last touched` line (`YYYY-MM-DD`). Delete an entry once its session is done.

## Session: Tell me again, engine brief
Last touched: 2026-10-20
Reads first: `docs/tell-me-again.md`, and the Questioning variants doc (link: add here).
Goal: turn the settled design into an implementer brief for the engine part: the retell generator,
the solver fact checks, rewording templates, and the tests (exactly one fact changed, or two on
hard; tangents never change meaning). Keep design decisions in the main session; hand the built
brief to the `implementer` agent.
Starting prompt:
```
Read docs/tell-me-again.md and the Questioning variants doc <paste the link>, then write an implementer brief for the engine part: the retell generator, the fact checks and the tests.
```

## Session: Theme content, tarot cast and line pools
Last touched: 2026-10-20
Reads first: `docs/theme-draft.md`.
Goal: grow the draft to about 6 lines per card per reading, mark role-neutral versus role-bound
lines, write about 40 shared tangents, and pick the tone. Content only; no engine code.
Starting prompt:
```
Read docs/theme-draft.md, then expand the line pools to about 6 lines per card per reading, with the role-neutral lines marked.
```

## Session: Plan-doc links in CLAUDE.md
Last touched: 2026-10-20
Reads first: nothing.
Goal: add the Build Plan and Questioning variants doc links to `CLAUDE.md` so a fresh session can
open them with the Docs reader. Needs the two links from the owner. Small; do it at the start of
any other session.
Starting prompt:
```
Add these doc links to CLAUDE.md under the opening paragraph: Murder Mystery Mode Build Plan <link>, Questioning variants Build Plan <link>.
```
