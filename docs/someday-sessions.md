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
