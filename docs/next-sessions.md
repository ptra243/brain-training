# Next sessions

Ideas for sessions to start fresh with `/clear` (or another terminal). Each has its own
`Last touched` date. A `SessionStart` hook (`.claude/hooks/stale-sessions.mjs`) tells Claude to
mention any entry untouched for 14 days or more and ask whether to keep, update or drop it.

Keeping an entry current: when you work on one, or when its handoff docs change, update its
`Last touched` line (`YYYY-MM-DD`). Delete an entry once its session is done.

## Session: Tarot match, implementer brief
Last touched: 2026-10-20
Reads first: `docs/tarot-match.md`, `docs/theme-draft.md` (tarot cast), `src/games/CLAUDE.md`.
Goal: settle the open points, then write an implementer brief for the tarot match minigame: the
seeded deal, the joker free peek, the cat hint, Solve, and the tests. "Tell me again" was dropped
after playtesting (not a puzzle, tedious, hard to spot); `docs/tell-me-again.md` is history.
Starting prompt:
```
Read docs/tarot-match.md and write an implementer brief for the tarot match minigame.
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

## Session: Crossword word lists, review
Last touched: 2026-10-20
Reads first: `src/games/CLAUDE.md` (Crossword and Word lists), `src/content/crosswordWords.ts`.
Goal: read the medium and hard fill (about 330 words) and fix clues that are too obscure, too easy
for their level, or give the answer away; swap out words she couldn't get from the clue. Well
defined: hand it to the `implementer` agent. Changing words changes medium and hard crosswords, so
run `npm test` and `npm run check-cases` after.
Starting prompt:
```
Review the medium and hard crossword clues in src/content/crosswordWords.ts for fairness and fix weak ones.
```

## Session: Crossword difficulty roll in Quick play
Last touched: 2026-10-20
Reads first: `src/engine/CLAUDE.md` (Play cases), `src/engine/settings.ts` (`perGame`, `crosswordSize`).
Goal: Quick play rolls a level per game, but not for the crossword (or Wordle), so its grid size
still follows `levels.minigames`. Decide whether it gets its own roll (it would go last in
`playLevels` so earlier rolls stay the same) and wire `crosswordSize` to it. Design first, in the
main session; the wiring and tests can go to `implementer`. Dump and diff Play cases before and after.
Starting prompt:
```
Give the crossword its own difficulty roll in Quick play.
```
