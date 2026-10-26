# Case check split — plan

Status: plan approved 2026-10-26. Pieces 0, A–F done and reviewed 2026-10-26:
every sweep file's summary lines match both baselines (case-file counts add up
to the old totals; review notes in `.claude/handoff/case-check-split/piece*.md`).
`scripts/check-cases.ts` is deleted. `npm run checks` 35s (was bound by the
59s case check); full case check 117s wall (was 404s). Piece G done
2026-10-26 (word first): 1.2 ms a build (was 12), mean 2.6 layouts, run cap
3, 0 fails over 5,760 builds; case sweeps quick presets 7.2→5.5s, houses
15.5→10.6s, campaign 3.8→2.6s. Next: builders that cannot fail, crossword first.

Notes for E from the reviews:
- The "Nosing dog" fallback bound (≤ 3%) was measured over Play cases' fights.
  A's `nosing.sweep.ts` checks it over the forced boards only (62 plays quick,
  332 full, 0 fallbacks), so keep the case-fight count and its 3% bound in
  `cases.quick.sweep.ts` beside the nosing scan (184 plays quick, 960 full).
- The Play-case part of the "Nosing around" line (scan counts) is E's; A
  prints forced boards on their own line.
- C2 makes `tarotHintsWin` and the in-case cat checks removable; tarot size,
  pair cap and reward cards stay in `caseChecks.ts`.
- Quick times alone: nosingBoard 6–10s (the old section was 4.4s), face
  3.7s, the rest under 6s. Full: dog fights 70s, wordBuilders 42s,
  nosingBoard 117s.

## Why

`scripts/check-cases.ts` (970 lines, one process, ~56s quick) mixes three
kinds of check:

1. **Case logic**: a generated case's clues give exactly one answer, the
   killer is alone at the scene with the weapon, interrogations can be caught,
   clue shares are fair, campaign rounds are fair. Needs a case, no games.
2. **Case wiring**: a game built *from this case's facts* works: word games
   spell the case's word and hide an object of the right room, case and end
   boards build and pack, tarot holds the reward cards, talk threads build,
   nosing builds with the case's clues. Needs a case and its games built, not
   played.
3. **Game sweeps**: one game over many seeds, with no case: bots playing
   nosing and dog fights, lock tiers, crossword grids, builders vs oracle,
   search vs oracle, face to face, opening, cat and tarot hint wins.

Layer 3 belongs to each game, beside its unit tests. Layers 1–2 are the case
check. After the split:

- Every layer-3 sweep is its own `*.sweep.ts` file next to its game, run by
  `node --test` (one process per file, in parallel across cores).
- The case check becomes a few `cases.*.sweep.ts` files (one per mode), also
  run in parallel. `scripts/check-cases.ts` goes.
- `npm run checks` runs only the sweep files whose import closure changed
  (the walk already in `scripts/caseCheckDeps.ts`). CI runs all of them, full.

Expected: a dog fight change runs ~5s of sweeps; a talk change ~2s; a
generator change all case files in parallel, ~15s wall (bound by the houses
file). `npm run checks` overall is then bound by lint and build (~28s).

## What happens to each piece of today's script

| Today (check-cases.ts) | Layer | Goes to | Piece |
|---|---|---|---|
| `problems`: one solution, killer alone, clue shares | 1 | `src/engine/caseChecks.ts` | E |
| `playProblems` (no free clues, blanks hide a room object) | 1–2 | `caseChecks.ts` | E |
| interrogations in `puzzleProblems` | 1 | `caseChecks.ts` | E |
| word games spell their word (in a case) | 2 | `caseChecks.ts` | E |
| case board and end boards build and pack | 2 | `caseChecks.ts` | E |
| talk threads and ready beats | 2 | `caseChecks.ts` | E |
| tarot board size, pair cap, reward cards | 2 | `caseChecks.ts` | E |
| tarot: following the cat's hints wins (`tarotHintsWin`) | 3, rules only | a unit test in `src/games/tarot.test.ts`, a few seeds per pair count; no sweep (`buildTarot` is a valid board by construction, so only the play rules are tested) | C2 |
| case board and end board, no case (none today) | 3 | `src/engine/board.sweep.ts`, new: `buildBoard` can fail, so its rules and failure rate get a sweep | F |
| nosing in a case: builds, holds 1–7 clues | 2 | `caseChecks.ts` | E |
| `nosingProblems`, `dogProblems`, `meetsDog` (board, lock, questions, dog) | 3 | `src/games/nosingSweeps.ts` + `nosing.sweep.ts` | A |
| cat puzzle has one answer, easy by simple steps | 3, **redundant** | removed from the case; `generateCats` already rejects anything else (`cats.ts:224-225`). A unit test on a few seeds per size and easy/not stays. | C2 |
| presets, other combinations | 1–2 | `src/engine/cases.presets.sweep.ts` | E |
| Quick start, Quick play, picked, picked combinations | 1–2 | `src/engine/cases.quick.sweep.ts` | E |
| tarot scan (draw Play codes until each level has 5 tarot cases) | 2 | `cases.quick.sweep.ts` (keeps wiring coverage per level) | E |
| nosing scan (Play codes until each level has 5) | 2 | `cases.quick.sweep.ts`, wiring checks only | E |
| nosing forced boards (every scene room × level × share) | 3 | `nosing.sweep.ts` | A |
| campaigns (`walkCampaign`) | 1–2 | `src/engine/cases.campaign.sweep.ts` | E |
| other houses (`houseCaseSweep`) | 1–2 | `src/engine/cases.houses.sweep.ts`; their campaign walks in `cases.houseCampaigns.sweep.ts` (split 2026-10-26) | E |
| search vs oracle | 3 | `src/engine/search.sweep.ts` | D |
| nosing bots, nosing boards (all houses and variants) | 3 | `src/games/nosing.sweep.ts`, `nosingBoard.sweep.ts` | A |
| dog fights (bots, redeals, doubles, challenges, rate bounds) | 3 | `src/games/dogFight.sweep.ts` | B |
| nosing dog fallback ≤ 3% across case fights | 3 | `nosing.sweep.ts`, over the forced boards | A |
| locks | 3 | `src/games/lock.sweep.ts` | 0 (the template) |
| scene games (crossword grids, cases' word games) | 3 | `src/game/sceneGames.sweep.ts` | C1 |
| builders vs oracle | 3 | `src/games/wordBuilders.sweep.ts` | C1 |
| face to face | 3 | `src/game/face.sweep.ts` | D |
| opening | 3 | `src/game/opening.sweep.ts` | D |
| `--only nosing` | — | gone: `node --test src/games/nosing*.sweep.ts` | E |

Unchanged: `npm test` and its golden snapshot, every `*Sweeps.ts` seed
function's body (they move as they are), and the seeds each sweep checks in
quick and in full mode.

## Order and file ownership

```
0 (foundation) ──► A, B, C1, C2, D, F in parallel ──► E (case files, delete old script) ──► orchestrator review
                                                                    ├──► G: room-first word search (content change)
                                                                    └──► later: builders that cannot fail (see the end)
```

No two pieces write the same file. Pieces A–D **never edit
`scripts/check-cases.ts`**; they add sweep files and report which of its line
ranges their file replaces. Only E deletes from it. Everyone may *read* any
file.

| Piece | Owns (writes) |
|---|---|
| 0 | `src/sweep.ts` (new), `scripts/sweeps.ts` (new), `scripts/caseCheckDeps.ts` (+ test), `scripts/checks.ts`, `package.json`, `.github/workflows/*.yml`, `src/games/lock.sweep.ts` (new) |
| A | `src/games/nosingSweeps.ts`, `nosingBoardSweeps.ts`, `nosing.sweep.ts` (new), `nosingBoard.sweep.ts` (new) |
| B | `src/games/dogFightSweeps.ts`, `dogFight.sweep.ts` (new) |
| C1 | `src/game/sceneGamesSweeps.ts`, `sceneGames.sweep.ts` (new), `src/games/wordBuildersSweeps.ts`, `wordBuilders.sweep.ts` (new) |
| C2 | `src/games/tarot.test.ts`, `src/games/cats.test.ts` (new or extended) |
| D | `src/engine/searchSweeps.ts`, `search.sweep.ts` (new), `src/game/faceSweeps.ts`, `face.sweep.ts` (new), `src/game/openingSweeps.ts`, `opening.sweep.ts` (new) |
| F | `src/engine/boardSweeps.ts` (new), `src/engine/board.sweep.ts` (new), `src/engine/board.test.ts` |
| E | `scripts/check-cases.ts` (deleted), `src/engine/caseChecks.ts` (new), `src/engine/cases.*.sweep.ts` (new), `src/engine/houseCaseSweeps.ts`, `src/engine/CLAUDE.md`, `src/games/CLAUDE.md`, root `CLAUDE.md` (check lines only), `README.md` (check lines only), `.claude/agents/implementer.md` |

Every piece: don't commit; leave other files' uncommitted changes alone; run
`npm run lint` and `npm test` before reporting.

## Shared rules for every sweep file (set by piece 0)

- `src/sweep.ts` exports `FULL` (true when `SWEEP_FULL=1`), `seedsOf(from,
  total, count)` (today's `spreadSeeds`), and `sweep(name, seeds, f)`: one
  `node:test` `test` per group, failing with the seed in the message. A
  statistical bound (`bound` today) is an `assert` after the loop.
- Each file prints the summary line `check-cases.ts` prints today for its
  section, via `t.diagnostic`, so the counts stay visible.
- Seeds: quick and full check exactly the seeds they check today. Never the
  unit tests' own seeds in quick.
- A quick sweep file stays under ~15s alone. If it doesn't, report it, don't
  trim seeds.

---

## Briefs

Each brief goes to the `implementer` agent. The orchestrator writes the
baseline path and this file's absolute path into it.

### Piece 0 — foundation and the lock template

**Do:**
1. Capture baselines before touching anything:
   `node scripts/check-cases.ts > .claude/handoff/case-check-split/baseline-quick.txt`
   and the same with `--full` to `baseline-full.txt` (run full in the
   background; it takes minutes).
2. Add `src/sweep.ts` (rules above) and `scripts/sweeps.ts`: runs
   `node --test` on given sweep files (default `src/**/*.sweep.ts`), sets
   `SWEEP_FULL=1` with `--full`, prints one pass/fail line per file.
   `package.json`: `sweeps`, `sweeps:full`.
3. Generalise `caseCheckDeps.ts` to `closure(entry)` for any file;
   `checks.ts` runs `check-cases` as now **plus** only the sweep files whose
   closure intersects the changed files (all of them when git can't say).
4. CI: add `npm run sweeps:full` beside `check-cases:full`.
5. Move the locks section to `src/games/lock.sweep.ts` as the template every
   other piece copies. Leave the section in `check-cases.ts` (E deletes it).

**Done when:** `npm run sweeps` runs `lock.sweep.ts` and its summary line
matches the locks line in `baseline-quick.txt` (same seed count);
`npm run sweeps:full` matches `baseline-full.txt`; `checks.ts` with a
hand-made changed list of `src/games/lock.ts` picks `lock.sweep.ts` only;
lint and tests pass; both baselines exist.

**Go back to the orchestrator (don't push through) if:** `node --test`
can't take the env/flag on Windows without a new dependency; a lock seed
can't be reproduced exactly; the full baseline fails (that's a real case bug
to show the owner first); or the template needs a different shape than the
rules above.

### Piece A — nosing

**Do:** move `nosingProblems`, `dogProblems`, `meetsDog` and their counters
from `check-cases.ts` into `nosingSweeps.ts` (exported, bodies unchanged).
`nosing.sweep.ts`: nosing bots, forced boards (every scene room × level ×
share), the dog fallback ≤ 3% bound over those fights. `nosingBoard.sweep.ts`:
nosing boards on the manor, every other house and every variant.

**Done when:** each file's summary counts equal the "Nosing bots", "Nosing
boards" and forced-board numbers in both baselines; the forced boards still
run `nosingProblems` on every room × level × share; quick time per file
reported; report lists the `check-cases.ts` line ranges these replace.

**Go back if:** the fallback rate over forced boards alone fails the 3% bound
(it was measured over real cases: the owner decides the new bound); anything
in `nosingProblems` turns out to need the case beyond house, seed, level,
scene room and clue count; a file is over ~15s quick.

### Piece B — dog fights

**Do:** `dogFight.sweep.ts`: the dog fights section as it is, every bound
(smallest bot ≥ 80% losses, fallbacks ≤ 2%, doubles 20–45%, challenge ≥ 50%)
an assert.

**Done when:** the "Dog fights" line in both baselines is reproduced exactly
(same means, counts and bounds); line ranges reported.

**Go back if:** any number differs from the baseline (a seed order change),
or the bounds need values not in the script today.

### Piece C1 — word games

**Do:** `sceneGames.sweep.ts` (crossword grids per room thing, cases' word
games) and `wordBuilders.sweep.ts` (builders vs oracle).

**Done when:** the "Scene games" and "Word builders vs oracle" lines match
both baselines; line ranges reported.

**Go back if:** `sceneCaseSeed` turns out to be a case-wiring check that
should stay with the case (say which, don't move it).

### Piece C2 — tarot and cats

Both are unit tests, not sweeps: their builders are correct by construction.

**Do:** Tarot: move `tarotHintsWin` from `check-cases.ts` into
`tarot.test.ts` (copy it; E deletes the original) and assert it on boards from
`buildTarot` with made-up decks, for every pair count from 1 to
`TAROT_MAX_PAIRS`, 3 seeds each, with and without reward cards. Cats: confirm
`generateCats` rejects any puzzle with more than one answer and any easy one
that fails `solvableBySimpleSteps` (`cats.ts:218-229`), then add a unit test
on a few seeds per size used by `MINIGAMES` and easy/not, asserting both.

**Done when:** both tests pass, together under ~2s; the report says the
in-case cat and tarot hint-win checks can be removed and why (tarot's size,
pair cap and reward-card checks stay in the case: they guard the generator's
`tarotPairsFor` against `buildTarot`).

**Go back if:** following the hints fails on any board (a real tarot bug:
show it, don't fix it); hint-win turns out to depend on the case's clue cards
beyond the deck; or `generateCats` can return a puzzle that fails either
check.

### Piece F — case and end boards

**Do:** move `makePlan` (the random plan maker) out of `board.test.ts` into
`src/engine/boardSweeps.ts` with per-seed check functions for the test's rules
(full rectangle, truth inside its section, truth obeys every rule, exactly one
packing, `boardSolvable` true for the truth). `board.test.ts` keeps its 12
plans through those functions. `board.sweep.ts`: the same over seeds the test
doesn't use (quick ~40, full ~300), plus the build failure rate as an assert.

**Done when:** `board.test.ts` runs the same 12 plans with the same results
and time; the sweep passes; report the failure rate and slowest build per
mode, and the bound you set (a little above the measured rate, with the
numbers).

**Go back if:** the measured failure rate is above 1 in 12 (the test's own
allowance), or any built board breaks a rule (a real board bug: show it); or
the quick sweep is over ~15s.

### Piece D — search, face to face, opening

**Do:** `search.sweep.ts`, `face.sweep.ts`, `opening.sweep.ts`, each as its
section is today (opening's moved-body rate an assert).

**Done when:** the three summary lines match both baselines; line ranges
reported.

**Go back if:** any count differs.

### Piece E — the case files (after A–D are accepted)

**Do:**
1. `src/engine/caseChecks.ts`: `problems`, `playProblems`, and
   `puzzleProblems` without the parts A and C2 moved out (keep nosing
   "builds, 1–7 clues", tarot board size and reward cards, word games,
   boards, talk, interrogations). Plain TS with its own node test on 2 seeds.
2. `cases.presets.sweep.ts`, `cases.quick.sweep.ts` (Quick start, Quick
   play, picked, picked combinations, tarot and nosing scans),
   `cases.campaign.sweep.ts`, `cases.houses.sweep.ts`, same seeds as today.
3. Delete `scripts/check-cases.ts`; `npm run check-cases` becomes
   `node scripts/sweeps.ts src/engine/cases.*.sweep.ts` (`:full` likewise),
   and CI's `check-cases:full` + `sweeps:full` collapse to `sweeps:full`.
   Update `caseCheckDeps` entries, `checks.ts`, and the docs that say "seed
   sweeps go in check-cases" (`src/engine/CLAUDE.md`, `src/games/CLAUDE.md`,
   root `CLAUDE.md`, `README.md`, `.claude/agents/implementer.md`).

**Done when:** the four case files together report the same case count (416
quick), the same per-preset clue stats, campaign round count and house
counts as both baselines; every check in the baseline's closing sentence
still runs somewhere (list where); `npm run checks` passes; quick wall time
of `npm run sweeps` reported, with the slowest file.

**Go back if:** splitting by mode changes any case's seed or count; any
removed in-case check isn't covered by an accepted A–D, C2 or F file; the houses
file is over ~25s quick (then propose splitting it by house, don't do it).

### Where the time goes (measured 2026-10-26, after piece G)

Each part of the check timed on the quick presets and houses sweeps' cases
(`.claude/handoff/case-check-split/time-parts.ts`; run it from the repo root):

| Part | Presets (138 cases) | Houses (80 cases + rounds) |
|---|---|---|
| Campaign walk (whole) | — | 7.0 s, 71% |
| Making the case (`generateCase`) | 14.2 ms/case, 42% | 15.6 ms/case, 13% |
| End boards (2 per case) | 11.2 ms/case, 34% | 11.1 ms/case, 9% |
| Crossword | 7.4 ms/case, 22% | 5.4 ms/case, 4% |
| Nosing | 0 | 2.9 ms/case, 2% |
| Case board puzzle, talk, one-solution search, interrogations, tarot | under 0.5 ms/case together | same |

The real `problems()` run right after the parts took about 10 ms a case
against their ~19 ms sum because `caseBoard.ts` caches the last 24 boards
(`cached`), so its second build is free. The part figures are the real cost.

**Campaign walk, per round** (houses, quick, 175 rounds): building the round
10–18 ms, end boards 19 ms, crossword 7 ms, `roundProblems` under 1 ms. Done
2026-10-26: `walkCampaign` takes `paths` (`'all' | 'two' | 'wrong' |
'walked'`); the houses' campaigns moved to `cases.houseCampaigns.sweep.ts`,
which walks one path per campaign in quick (alternating, 90 rounds) and both
in full. Quick wall times: houses 10.9 s → 3.5 s, the new file 4.6 s, quick
7.2 s (now the slowest), presets 4.9 s, campaign 2.6 s.

### Faster end boards (explored 2026-10-26, not started)

Measured on the presets' quick end boards (276 boards, scripts in the
session scratchpad, re-creatable from the notes here): 256 build on the first
attempt, so attempts are not the cost. A median board takes 2.2 ms, but the
slowest 10% (17+ pieces, 8–12 rows) take 55% of the time, with ~1,700 search
steps over ~6 solves each; the slowest took 119 ms in one attempt (4,875
steps). Only 2 of 489 solves hit the step budget. The cost is per step
(12–24 µs, slow for a step), plus string-keyed set-up around it:

| Where (CPU profile, boards only) | Share |
|---|---|
| The packing search (`tiles` / `go`, `placementsOf`) | ~37% |
| Shape keys: `norm`, `keyOf`, `rotations` (per piece per solve, `pieceCls` and `offsets`) | ~25% |
| Flood fills on `"r,c"` string sets (Unknown's 60 orderings, `biggestOpen`) | ~12% |
| `solve` set-up (`coords` from string keys), `squares()` | ~6% |

Speed-ups that leave every board the same (they change no search order,
no rng draw and no step count, and the step budget decides which board
comes out):
1. Shape keys once per cells array: a `WeakMap` from a `cells` array to its
   rotations, `shapeKey` and offsets (arrays are replaced, never mutated, by
   `shift`); compute each key once inside `rotations`. About 20% of board time.
2. Flood fills and squares on numbers (`r * W + c`, typed arrays) instead of
   `"r,c"` strings. Only sizes come out, so order can't matter. About 10%.
3. Inside `go`: build `stateKey` cheaper (the `occ.join('')` string every
   step, then a sorted `usedIds` list); intern piece classes and placement
   cells as numbers for the `dup` keys; no `options` objects. It must keep
   exactly which states count as failed, so an exact key (not a hash). Maybe
   10–15%.
Together perhaps 40–50% off boards: ~5 ms a case off presets, ~9 ms a round
off the walk, and the same on her phone, where boards rebuild on every clue.
Proof: keep a copy of today's `board.ts` and assert identical boards over
every end and puzzle board the quick sweeps build (`JSON.stringify` equal),
as the exploration did for an instrumented copy. The golden snapshot does
not cover boards.

### After the split — builders that cannot fail (not started)

The case files still build every case's word games (~11.5s) and boards
(~7.5s) to prove the game she will open builds for that case's answer, seed
and size: `GameSpec` stores only those, the grid is built on screen, and
`generateCrossword` / `generateWordSearch` can throw (`crossword.ts:253`,
`wordSearch.ts:79`). Building them in the generator instead would only move
the cost (the check generates every case it checks) and add it to her phone.

The fix is a builder that always returns a valid puzzle: on failure, retry on
a derived seed, then a smaller size. Prove it once in the game's own test and
sweep (every answer at every size, plus the retry path), then drop the
in-case build from `caseChecks.ts`. Same later for the case and end boards.
Today's cases already build, so the retry never fires for them and no case
should change; confirm with the golden snapshot. One game per piece, after E.

The crossword can follow the word search below later: build the grid, then
pick a room thing whose letters can be shaded across different entries.

### Piece G — room-first word search (after E; owner's design, 2026-10-26)

**Decided 2026-10-26: word first.** The case picks the word as today; the
builder fills the grid until exactly that many squares are open. Measured on
the prototype (handed only the picked thing): 0.97 ms a build, 2.0 layouts
(worst 14), 0 fails over every room thing × 3 levels × 40 seeds. Cases,
clues and the golden snapshot stay the same; only grids change. So step 2
below is dropped, "pick by word" is moot, the layouts bound is 3, and the
storage prefix is bumped (owner: losing a quick game is fine). Brief:
`.claude/handoff/case-check-split/pieceG.md`. The text below is the original
grid-first plan.

The case fixes the room, not the word. Build the grid first, then hide a room
thing in whatever squares are left. No blank squares, almost no retries, and
in practice no failures, so the word search's in-case build can leave the case
check. A content change: every word search and its word change.

**Measured** (scratch prototype, 720 builds: 6 rooms × 3 levels × 40 seeds,
size 7; prototype and scripts in
`.claude/handoff/case-check-split/room-first-prototype/`):

| Builder | ms per build | Fails | Blanks | Layouts per build |
|---|---|---|---|---|
| Today (`generateWordSearch`) | 12.7–13.2 | 0 | 2.01 | ~11 |
| Room first, today's room things | 0.58–0.65 | 0 | 0 | 1.2 |
| Room first, lists padded to every length 4–9 | 0.54–0.57 | 0 | 0 | 1.1 |

Today's time is about 11 layouts per build at about 1 ms each, retried to cut
blanks; shuffling only the 120 words tried saves nothing (pool is 309 words,
measured). Today's room things are enough: no new word lists are needed for
speed (more only for variety). The prototype's hidden letters bunch a little
more: 25% of consecutive answer letters sit side by side in a row (today 17%),
longest readable run 6 (today 4).

**Do:**
1. Replace `generateWordSearch` with the room-first builder, taking the
   room's things instead of an answer. Start from the prototype's
   `roomFirstWordSearch` (`roomfirst-add.ts.txt`) with two changes:
   - **Pick by word:** pick a thing first (seeded) and aim for its length, not
     a length first. The prototype picked the study's only 4-letter thing in
     32 of its 120 builds; every thing should be about equally likely.
   - **Cap letter runs:** reject a layout whose answer has more than 3 letters
     side by side in one row (retry on the same `Rng`). Report the new
     side-by-side share and longest run with `spread.ts`.
2. The generator builds the word search when it makes the case (in Play, for
   the blanked clue's room; elsewhere, the scene room) and stores the word it
   hid as `scene.answer`, so the sentence and the blanked clue's word come
   from the grid. Keep Play's rules: no two games hide the same word, never
   the scene sentence's word (pass those as excluded things).
3. Update `wordBuildersOracle.ts` so the oracle sweep compares against the new
   builder, regenerate the golden snapshot (`npm run update-golden`), bump the
   storage prefix in `src/game/storage.ts` (and `PLAY_VERSION` if Play saves
   break), and update the word search rules in `src/games/CLAUDE.md`.
4. Remove the word search build from `caseChecks.ts`; keep its cheap wiring
   checks (the hidden word is a thing of the right room, not the scene word,
   no repeat in a Play case).

**Done when:** in-house timing on the 720 inputs matches the table (under
about 1 ms per build, 0 fails, 0 blanks); longest run at most 3; every thing
of a room comes up within about 2× of the average over 40 seeds per room and
level; the case files pass quick and full; `npm run checks` and `npm run e2e`
pass; the case check's quick time is reported before and after.

**Go back if:** the run cap makes any build fail or pushes the mean over
2 layouts per build; a Play case can't find an allowed word for its room;
anything other than word searches, their words and the sentences and clues
that name them changes in the golden diff; or e2e shows a word search screen
that looks wrong at 360px.

### Orchestrator review (main session)

For each hand-back: read the diff, compare the summary lines against the
baselines yourself (don't trust the report), and check the file stayed in
its owned list. Accept, or send a fresh agent the failure. After E: run
`npm run checks` and `npm run sweeps:full` once, show the owner the before
and after times, then commit.
