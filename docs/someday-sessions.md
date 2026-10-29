# Someday sessions

Exploratory ideas with no settled design, kept out of `docs/next-sessions.md` so the ranked menu stays
short. Same entry format and rules as that file. The `SessionStart` menu lists these after the ranked
entries, numbered on from them, without stale-date reminders. When one gets a settled design (or the
owner wants it soon), move it into `docs/next-sessions.md` at its rank.

## Session: Target or another word game
Last touched: 2026-10-23
Reads first: `docs/target-game.md` (proposed approach, what to settle), `src/games/CLAUDE.md`.
Goal: design, then build, a Target-style word game (or another that fits better), with two word lists.
Starting prompt:
```
Read docs/target-game.md and help me design the game: confirm Target or pick another, settle goals, hints and the clue reward, then plan the two word lists.
```

## Session: The dog card deck builder
Last touched: 2026-10-22
Reads first: `docs/dog-deck-builder.md` (the owner's seed idea, what to settle), `docs/nosing-around.md`
("Next build: the dog"). Best after the dog encounter is built.
Goal: decide whether the dog fight grows into a real deck builder (Slay the Spire style).
Starting prompt:
```
Read docs/dog-deck-builder.md and "Next build: the dog" in docs/nosing-around.md, and help me design the dog card game as a real deck builder: one-suit start deck, suit effects, rewards, run length, losing without getting stuck.
```

## Session: Card Capture (card game)
Last touched: 2026-10-29
Reads first: `docs/card-capture.md` (the owner's full rules, what to settle), `src/games/CLAUDE.md`.
Goal: the rules are settled. Check with a seed sweep how often a deal can be won or hits a dead end,
then decide where it lives: a standalone game for fun, or a hard-mode campaign where she can lose.
Starting prompt:
```
Read docs/card-capture.md and src/games/CLAUDE.md, then sketch a seeded solver to measure how often a deal can be won and how often it hits a dead end.
```

## Session: Portrait expressions
Last touched: 2026-10-26
Reads first: `docs/portraits.md` (facial expressions are a later layer, not part of the portrait build).
Goal: decide whether brows, a mouth facet and a head tilt are worth adding. The portraits, the hint
counters and the questioning chair are already in.
Starting prompt:
```
Read the expressions note in docs/portraits.md and help me decide whether brows, a mouth facet and a head tilt are worth adding.
```

## Session: Clue moments
Last touched: 2026-10-25
Reads first: `docs/story-layer.md` (clue moments), `src/engine/wording.ts`, `src/game/ClueCard.tsx`.
Goal: show each newly won clue first as a one-line scene (the witness's voice and portrait, or the cat
finding something), with the plain statement kept for the casebook. Settle templates and a fact check.
Starting prompt:
```
Read the clue moments section of docs/story-layer.md and src/engine/wording.ts, then propose line templates per clue type and how to check a moment says exactly what its clue says.
```

## Session: Split clues (two games, one clue)
Last touched: 2026-10-29
Reads first: `src/engine/generate.ts` (`buildPlayCaseIn`: shares, word-game blanks), `src/engine/CLAUDE.md`
(Play and picked cases), `src/engine/wording.ts` (`located`, the half-heard blank), `src/engine/caseChecks.ts`.
Goal: let her pick as many games as she likes. Today a picked case needs one clue per game, and a 4-suspect
easy case has about 7 clues, so new picks are capped at 7 (`PICK_MAX`; 8–9 game codes still load, with up to
100 seed tries). Measured 2026-10-29: with all 9 games on that level, 14 of 76 codes failed all 30 old tries
("her games cannot all get a clue": 255 of 272 burned tries; "no clue to blank": 16). Idea: when there are fewer
clues than games, two games share one clue. The first unlocks it half-heard ("…in the room with the ___"),
so she knows there's something to look for; the second fills the blank. Only used when clues run short, so
existing cases stay the same. Settle: which games pair up, the half clue never rules anything out alone
(the grid must not move), how the casebook and shelf show a half clue, Solve on either half, and the checks.
Lifts `PICK_MAX` back to 9 and leaves room for new games. Rejected for now: spare redundant clues (cheaper,
engine only, but they add information and bend the minimal clue set).
Starting prompt:
```
Read the split clues entry in docs/someday-sessions.md and buildPlayCaseIn in src/engine/generate.ts, then propose how two games share one clue: the data shape, which games pair, how a half clue reads and shows, and what checks prove it.
```

## Session: Side missions
Last touched: 2026-10-20
Reads first: `docs/side-missions.md` (the idea, rules, what to settle). Low priority; needs the cast and
threads first.
Goal: decide whether optional side stories with the side characters are worth building, and what one
would be made of.
Starting prompt:
```
Read docs/side-missions.md, then help me decide whether side missions are worth building and what one would look like.
```

## Session: Property tests for the engine
Last touched: 2026-10-21
Reads first: `docs/code-review-followups.md` section 5, `src/engine/CLAUDE.md`, `scripts/check-cases.ts`.
Goal: decide whether fast-check adds anything beyond `check-cases`. If yes, add a capped property test
for one invariant (every clue is true) and see whether it finds anything.
Starting prompt:
```
Read docs/code-review-followups.md section 5 and scripts/check-cases.ts, then try one fast-check property test for "every clue is true" and tell me if it's worth keeping.
```

## Session: The killer lies, in hard mode
Last touched: 2026-10-23
Reads first: `docs/killer-lies.md` (variants A and B, why guests lie, what to settle),
`src/engine/CLAUDE.md`. Low priority: only if hard cases feel too easy.
Goal: decide whether a hard level where the killer's claims are all false is worth building, and sketch
the clue model and solver change (build A first, then B).
Starting prompt:
```
Read docs/killer-lies.md and src/engine/CLAUDE.md, then help me decide whether it's worth building and sketch the clue model and solver change.
```
