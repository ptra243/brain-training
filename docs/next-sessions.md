# Next sessions

Ideas for sessions to start fresh with `/clear` (or another terminal). Each has its own
`Last touched` date. A `SessionStart` hook (`.claude/hooks/stale-sessions.mjs`) tells Claude to
mention any entry untouched for 14 days or more and ask whether to keep, update or drop it.

Keeping an entry current: when you work on one, or when its handoff docs change, update its
`Last touched` line (`YYYY-MM-DD`). Delete an entry once its session is done.

## Session: Tarot match, build
Last touched: 2026-10-20
Reads first: `docs/tarot-match.md` (Decisions and Implementer brief).
Goal: the open points are settled and the brief is written. Do "Golden case snapshots" first. Hand its three pieces (engine and tests,
wiring, UI and content) to the `implementer` agent, then dump and diff existing cases and run
`browser-check`. "Tell me again" was dropped after playtesting; `docs/tell-me-again.md` is history.
Starting prompt:
```
Read docs/tarot-match.md and hand the three brief pieces to the implementer agent.
```

## Session: Golden case snapshots
Last touched: 2026-10-20
Reads first: `src/engine/CLAUDE.md`, `src/engine/generate.test.ts`, `scripts/check-cases.ts`.
Goal: do this before the tarot build. A node test that builds about 20 codes per mode (presets,
campaigns, Play, Quick, with several levels) and compares a hash of each full `Case` JSON against a
committed file (`src/engine/golden.json`). It fails on any unintended change and prints which codes
differ. An `npm run update-golden` script rewrites the file. Well defined: hand it to the
`implementer` agent. Erasable TS only; run with `npx -y node@22`. Mention it in the README and under
"Checks before committing" in `CLAUDE.md`.
Starting prompt:
```
Read the "Golden case snapshots" entry in docs/next-sessions.md and hand it to the implementer agent.
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

## Session: Two-storey houses, picked per case
Last touched: 2026-10-20
Reads first: `src/engine/CLAUDE.md`, `src/engine/house.ts`, `src/engine/caseFacts.ts`, `src/engine/clues.ts`
(the adjacency clue types), the house in `src/content/index.ts`, `src/game/MapPanel.tsx`.
Goal: replace the single 6x6 manor with 3 to 5 hand-drawn two-storey houses (8 to 10 rooms, two
6x6 floors joined by stairs), one picked per case on its own seeded stream (like `BOARD_SHARE`), so
the rest of the generator keeps its draws. Cases still use at most 5 rooms (the grid cap); unused rooms
stay on the map as red herrings. Today every room touches 3 to 5 of the other 5, so "next to" clues
are weak; floors make adjacency sparse. Settle first: does adjacency cross the stairs (proposed: same
floor only), and do we add floor clues ("was upstairs", "same floor as", "different floor from")?
Then write an implementer brief: `House`/`Room` types with floors and stairs, `houseFromLayout`
checks, `roomAdjacency`, MapPanel and CaseInspector drawing two floors (tabs or stacked, 360px, no
sideways scroll), room word lists, `check-cases` over every house. It's a content change: all cases
change, so bump the storage prefix (wipes saved progress; time it between campaigns). Room names and
words should match the theme (`docs/theme-draft.md`).
Starting prompt:
```
Read the "Two-storey houses" entry in docs/next-sessions.md, help me settle the open questions, then write an implementer brief.
```

## Session: Hunting the weapon (campaign)
Last touched: 2026-10-20
Reads first: the "Hunting the weapon" item in the Murder Mystery Mode — What's Left doc (link in
`CLAUDE.md`), `src/engine/CLAUDE.md`, `src/engine/campaign.ts`, `src/game/campaign.ts`.
Goal: make the weapon matter in the campaign. One weapon all night (today it's rolled each round);
loose either-or weapon clues on night 1; a new puzzle at the start of night 2 that gives a shortlist
of 2–3 weapons; night 3 settles the killer and the weapon; a wrong weapon costs a body like a wrong
person (an innocent dies; the accused survives, and she's told one of her two picks was right).
Settle first: the shortlist puzzle's design, the either-or clue types and wording, and how
`roundProblems` and `check-cases` prove each night. Then write an implementer brief. Every campaign
changes, so bump the storage prefix.
Starting prompt:
```
Read the "Hunting the weapon" item in the What's Left doc and docs/next-sessions.md, help me design the shortlist puzzle and the either-or clues, then write an implementer brief.
```
