# Next sessions

Ideas for sessions to start fresh with `/clear` (or another terminal). Each has its own
`Last touched` date. A `SessionStart` hook (`.claude/hooks/stale-sessions.mjs`) tells Claude to
mention any entry untouched for 14 days or more and ask whether to keep, update or drop it.

Keeping an entry current: when you work on one, or when its handoff docs change, update its
`Last touched` line (`YYYY-MM-DD`). Delete an entry once its session is done.

## Session: Tell me again, engine brief
Last touched: 2026-10-20
Reads first: `docs/tell-me-again.md`, and the Questioning variants doc (link in `CLAUDE.md`).
Goal: turn the settled design into an implementer brief for the engine part: the retell generator,
the solver fact checks, rewording templates, and the tests (exactly one fact changed, or two on
hard; tangents never change meaning). Keep design decisions in the main session; hand the built
brief to the `implementer` agent.
Starting prompt:
```
Read docs/tell-me-again.md and the Questioning variants doc (linked in CLAUDE.md), then write an implementer brief for the engine part: the retell generator, the fact checks and the tests.
```

## Session: Theme content, tarot cast and line pools
Last touched: 2026-10-20
Reads first: `docs/theme-draft.md`.
Goal: the line pools and shared tangents are drafted. What's left is content only (no engine code):
fix lines that break rules 2 and 3 (times such as "all night", "for hours"), write the 4 extra
next-door tangents, lines for the six extra cards, the missing card + object and follow-up threads,
and pick the tone.
Starting prompt:
```
Read docs/theme-draft.md, fix the lines that break rules 2 and 3, then draft the six extra cards and the missing card + object threads.
```

## Session: Tangent threads and Talk/Play flow
Last touched: 2026-10-20
Reads first: `docs/theme-draft.md` (the "Model" and "Follow-up threads" sections), `docs/tell-me-again.md`,
and the Murder Mystery Mode doc (link in `CLAUDE.md`) for how she travels the house.
Goal: settle the open questions (unprompted versus "Anything else?", threads per suspect, Play after
Talk in one visit, side characters, the `visit` trigger), then write an implementer brief for the set
roll, the saved stage per character, the triggers and the Talk screen. Dump and diff existing cases
before and after (rule 10).
Starting prompt:
```
Read the Model and Follow-up threads sections of docs/theme-draft.md and the Murder Mystery Mode doc, then help me settle the open questions and write an implementer brief.
```
