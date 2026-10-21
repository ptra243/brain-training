# Next sessions

Ideas for sessions to start fresh with `/clear` (or another terminal). Each has its own
`Last touched` date. A `SessionStart` hook (`.claude/hooks/stale-sessions.mjs`) tells Claude to
mention any entry untouched for 14 days or more and ask whether to keep, update or drop it.

Keeping an entry current: when you work on one, or when its handoff docs change, update its
`Last touched` line (`YYYY-MM-DD`). Delete an entry once its session is done.

## Session: Theme content, tarot cast and line pools
Last touched: 2026-10-20
Reads first: `docs/theme-draft.md`. Best after "The cast", which fixes the roles.
Goal: the line pools and shared tangents are drafted. What's left is content only (no engine code):
fix lines that break rules 2 and 3 (times such as "all night", "for hours"), write the 4 extra
next-door tangents, lines for the six extra cards, the missing card + object and follow-up threads,
and pick the tone. Also make borrowed cards sound natural:
- Audit every role-neutral line against each role that may borrow that card. Some only fit the home
  role (the Emperor's "I've given the orders for years" is tagged N but needs someone in charge); retag as B.
- Write 1 or 2 bespoke lines per role + secondary card pairing (about 15 to 20 lines in all, e.g. the
  Gardener with the Devil: "Everything in that garden owes me something.").
- Explore a hostile reading: a cold or curt night as its own line pool ("Ask someone else. Or don't.").
  Rolled the same way for everyone, so the killer is no more likely to be hostile (rule 5). Hostile
  means rude, never lying (every clue is true), and no barbed lines aimed at one person unless any
  suspect can say them about anyone.
Starting prompt:
```
Read docs/theme-draft.md, fix the lines that break rules 2 and 3, audit the neutral lines against borrowing roles, then draft the six extra cards and the missing card + object threads.
```

## Session: Tangent threads and Talk/Play flow
Last touched: 2026-10-20
Reads first: `docs/theme-draft.md` (the "Model" and "Follow-up threads" sections), `docs/tell-me-again.md`,
and the Murder Mystery Mode doc (link in `CLAUDE.md`) for how she travels the house.
Goal: settle the open questions (unprompted versus "Anything else?", threads per suspect, Play after
Talk in one visit, side characters, the `visit` trigger), then write an implementer brief for the set
roll, the saved stage per character, the triggers and the Talk screen. Dump and diff existing cases
before and after (rule 10). Also settle:
- Is the borrowed card rolled once per suspect per case (proposed: yes, one secondary for the night, so
  a suspect sounds like one person) or per line? The draft's 60 to 70% home weight doesn't say.
- Show the stage as a few pips per suspect (how much of their story she has heard). That is the
  "relationship meter": it only goes up, and it behaves the same for the killer (rule 5).
- Explore hostile to warm as the arc: some suspects start cold, and each beat she hears softens them
  ("You again?" then "Fine, sit down." then a confidence). She wins them round; the meter never drops.
- Explore hostility changing the minigame, never the clue: a hostile suspect's puzzle is a bit harder
  or has a twist (the dog won't go near them, so hints help less). Same true clue on a win, Solve still
  works. Never "won't talk until you do X" unless there's always another way (she can never get stuck).
Starting prompt:
```
Read the Model and Follow-up threads sections of docs/theme-draft.md and the Murder Mystery Mode doc, then help me settle the open questions and write an implementer brief.
```

## Session: Relationships between characters
Last touched: 2026-10-20
Reads first: `docs/theme-draft.md` (Follow-up threads, Model), the cast and who-knows-whom map from
"The cast" session. Best after "Tangent threads and Talk/Play flow" settles the trigger list.
Goal: make characters react to each other, without anything depending on the killer (rule 5). Explore:
- Card pairs: tarot pairs (Emperor and Empress, Magician and High Priestess, Devil and Lovers) open a
  thread between the two people holding them ("{other} won't look at me tonight").
- Shared card: two suspects can't share a home card (tarot mode labels would clash), but they can
  share tonight's secondary card. Their upright/reversed rolls decide how it goes: both upright,
  kindred spirits; both reversed, rivals who are too alike; one of each, one-sided. Aim for about one
  case in three having a pair; start with the 4 or 5 most borrowed cards (about 3 lines per type each).
- A `heard` trigger: hearing about B from A opens B's next beat ("The Financier has been very generous
  lately" opens the Financier's thread). It uses only what she has seen, so it's safe.
- No alibis: relationship lines say how people feel, never where they were or when (rule 3; a witness
  never vouches for themselves).
Starting prompt:
```
Read the "Relationships between characters" entry in docs/next-sessions.md and docs/theme-draft.md, then help me design card-pair and shared-card threads and the heard trigger.
```

## Session: Side missions (exploratory)
Last touched: 2026-10-20
Reads first: the side characters from "The cast" session, `docs/theme-draft.md` (Model), and the
Murder Mystery Mode doc (link in `CLAUDE.md`). Low priority; needs the cast and threads first.
Goal: decide whether optional side stories with the side characters are worth building (a lost item,
the dog/cat, a servant's secret). Rules: always optional, never block the case (she can never get stuck),
pay out story or cosmetics (card art, the dog), never clues. Settle what a side mission is made of
(a minigame plus thread beats?), where it starts, and how it's saved.
Starting prompt:
```
Read the "Side missions" entry in docs/next-sessions.md, then help me decide whether side missions are worth building and what one would look like.
```

## Session: The killer lies, in hard mode (exploratory)
Last touched: 2026-10-20
Reads first: `src/engine/CLAUDE.md` (one solution, own seed stream, interrogations, campaign),
`src/engine/clues.ts`, `src/engine/solver.ts`, `src/engine/search.ts`, `src/engine/wording.ts`.
Low priority: only if hard cases feel too easy.
Idea: a new optional hard logic level where everyone tells the truth except the killer, and everything
the killer says is false. She reasons "if the Butler did it, their story is false; does that still fit?"
It's the one form of casebook lie that stays fair. Lies inside a minigame (the interrogation) already exist
and are unaffected; outside this level, "every clue is true" stays.
Explore and settle:
- Clue model: testimony becomes a claim ("the Butler says X"), evidence stays fact. How the casebook
  shows claims; whether "a witness never vouches for themselves" still holds or the lie replaces it.
- Solver: try each suspect as the killer with their claims negated; exactly one suspect must fit, with
  a minimal clue set. Cost for 7 guests (already needs `search.ts`).
- Fairness: the killer must make at least one claim she can prove false, so she never has to guess.
- Scope at first: no case board, no campaign; how map and grid hints treat claims.
- New level on its own seed stream, after the existing draw; presets, campaigns and the golden
  snapshot stay unchanged. `check-cases` covers the new level.
Starting prompt:
```
Read "The killer lies" entry in docs/next-sessions.md and src/engine/CLAUDE.md, then help me decide whether it's worth building and sketch the clue model and solver change.
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

## Session: Sudoku touch targets and small performance wins
Last touched: 2026-10-21
Reads first: `docs/code-review-followups.md` sections 1 and 3, `e2e/CLAUDE.md`.
Goal: the sudoku pad buttons reach 44 px (then remove its `test.fail` in `e2e/games.spec.ts`);
`stillPossible` stops rerunning on every move; the `#dev` inspector is lazy-loaded; `words.txt` is
trimmed to the lengths the games use. All well defined: brief the implementer, check with
`npm run e2e`. Cases must not change.
Starting prompt:
```
Read docs/code-review-followups.md sections 1 and 3, then hand each item to the implementer and check the results with npm run e2e.
```

## Session: Board UI refactor (CaseBoard and map dragging)
Last touched: 2026-10-21
Reads first: `docs/code-review-followups.md` section 2, `src/game/CLAUDE.md` (Touch, Map, Case board UI),
`e2e/CLAUDE.md`.
Goal: split `CaseBoard.tsx` (drag hook, one reducer for undo, toast and flags), share one pointer-drag
hook with `MapPanel.tsx`, and decide on the React Compiler by profiling a drag before and after. First
add an e2e touch-drag test for the case board so behaviour is pinned. Cross-cutting: design here,
then delegate the pieces.
Starting prompt:
```
Read docs/code-review-followups.md section 2, add an e2e drag test for the case board, then design the drag hook and reducer split with me before delegating.
```

## Session: Validate saved data
Last touched: 2026-10-21
Reads first: `docs/code-review-followups.md` section 4, `src/game/storage.ts`, `src/game/games/saveData.ts`.
Goal: saves are checked, not cast. A bad game record resets that game only; a bad field falls back to
its empty value. Decide Valibot or hand-written guards (Valibot needs installing on the owner's
machine), then delegate. Add node tests with malformed saves.
Starting prompt:
```
Read docs/code-review-followups.md section 4, help me pick Valibot or hand-written guards, then write an implementer brief with tests for malformed saves.
```

## Session: Property tests for the engine (exploratory)
Last touched: 2026-10-21
Reads first: `docs/code-review-followups.md` section 5, `src/engine/CLAUDE.md`, `scripts/check-cases.ts`.
Goal: decide whether fast-check adds anything beyond `check-cases`. If yes, add a capped property test
for one invariant (every clue is true) and see whether it finds anything.
Starting prompt:
```
Read docs/code-review-followups.md section 5 and scripts/check-cases.ts, then try one fast-check property test for "every clue is true" and tell me if it's worth keeping.
```

## Session: Nosing around (maths board game), build
Last touched: 2026-10-21
Reads first: `docs/nosing-around.md` (the full design), `src/games/CLAUDE.md`, `src/engine/CLAUDE.md`
(how a new game joins on its own seed stream), `src/engine/house.ts`, and `src/games/tarot.ts` with
`TAROT_SHARE` in `gameKinds.ts` as the most recent example of adding a game.
Goal: build the snakes-and-ladders maths game on the floor plan. Keep in the main session: settling
the open questions at the end of the design doc, and tuning board size, ladders and snakes per level
by experiment until the turn ranges hold. Then delegate to `implementer`: the pure board/question/lock
logic with hints and tests (`src/games/`), the content lists (question templates, ladders, snakes,
bonuses, locks), the `check-cases` checks, and the screen with its number pad. Existing cases must
not change (golden snapshot).
Starting prompt:
```
Read docs/nosing-around.md, settle its open questions with me, then tune the board generator per level until the check-cases turn ranges hold before delegating the rest.
```

## Session: The dog card battle as its own game (exploratory)
Last touched: 2026-10-21
Reads first: `docs/nosing-around.md` (the "Encounters" section, the dog). Best after Nosing around is
built, so the encounter module exists to grow from.
Goal: decide whether the dog encounter becomes a full minigame: a longer duel with deck building
between fights (Slay the Spire style), seeded decks and dog rolls, attack = largest number from her
hand, defend = meet or beat the dog's roll, exact = an extra card. Settle levels, how a loss works
without getting her stuck, the hint ladder, and whether it joins the case rotation.
Starting prompt:
```
Read the dog encounter in docs/nosing-around.md and help me decide whether to grow it into its own card-battle minigame: rules, levels, losing without getting stuck, hints.
```
