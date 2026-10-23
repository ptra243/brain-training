# Nosing tests: speed plan

Measured 2026-10-23 on the quick case check (96s) and on 18 manor boards. This is the work to do. It does not change the boards she plays.

## Where the time goes

The quick check spends about 20s building nosing boards and about 17s playing them. Medium and hard are the slow builds: a manor board often takes 50 to 150 tries, and one lodge board is just as slow on the big squares. Of 724 rejected manor tries, 300 never found a path, 400 found a path the layout could not dress, and 24 missed the turn window. The turn-window search itself was 11ms.

A played seed is three full games (`botSeed` in `src/games/nosingSweeps.ts`): hints, always wrong, and random. The roll is one lookup from the seed and the turn. The slow step is the dog's card grid, which lists every way to lay the hand. The same three games run from `npm test` (seeds 0 to 6 per level) and from `check-cases` (a wider sample, plus bots on other houses and variants).

## 1. Walk the path without the card games

Add a walker next to `drive` in `src/games/nosingSweeps.ts`. It uses the real moves, and it does not deal the dog's cards or fill the lock.

- Roll with `{ t: 'roll' }`. The cat jumps `pos + roll`, and stops on the dog if the jump passes it. That is already what `moveCat` does.
- On a question, speed round, ladder, snake or bonus, send the real answer move: the right value, or the wrong one, or a random one. That is one number, not a search.
- On the dog, win with the existing Solve move (`{ t: 'solve' }` while the phase is `dog`). That calls `endDog` and carries the cat on. Do not call `gridValues`.
- Stop when the phase is the lock. Do not place lock cards.

`botSeed` and the `check-cases` nosing-bot loops call this walker instead of `drive`. On every seed they still check:

- the hint walk and the wrong walk both meet the dog
- both stay inside the level's turn window
- the cat ends on the last square, ready for the lock

They stop checking, on every seed, that the hint bot won a card fight, that the wrong bot lost 80% of fights, and that every clue was found. Those need the cards or the lock.

Keep them where they already run for real, and point the sweep comment at these tests:

- the dog fight inside a nosing game: `nosing.test.ts` (the tests that stop when `dog.over` is set) and the dog-fight sweep (`dogFightSweeps.ts`)
- clues given when she is wrong, and the lock opening: the Solve test and the search-square tests in `nosing.test.ts`

The 80% loss rate moves to the dog-fight sweep, which already plays real hands. It does not stay on every nosing board.

`drive` stays. The unit tests that stop at a ladder, a question or a real fight still use it. `e2e/nosingSaves.ts` still uses it to build a mid-game save.

Done when a quick `check-cases` prints a nosing-bot line no slower than a few seconds, and `npm test` no longer spends multiple seconds on the three `botSeed` tests. The "Time by section" line is the record. No `NOSING_VERSION` bump: the games are unchanged.

**Done 2026-10-23.** `walk` in `nosingSweeps.ts`; `botSeed` uses it. In the quick check, "nosing bots" went from about 17s to 5.6s, most of it building the boards (the walks themselves are fast), and the `nosing.test.ts` bot tests take 36 to 480ms each. The 80% loss bound now sits on the dog-fight sweep (smallest bot lost 10/10 at every level).

## 2. `--only nosing`

In `scripts/check-cases.ts`, `--only nosing` runs the nosing sections and skips the rest: presets, campaigns, Quick play, picked games, word builders, search-versus-oracle, and face to face.

It includes the nosing scan, the other-house boards, nosing boards, the walker, the dog-fight sweep and the locks. A nosing change can break those together.

`npm run checks` stays the whole quick check. An agent uses `--only nosing` while tuning, then one full quick check before reporting. No flag per game. Cats, sudoku and the word games are checked inside the shared case loop, and their own sweeps are a few seconds.

**Done 2026-10-23.** `node scripts/check-cases.ts --only nosing` (add `--full` for every sample) took 49s against 88s for the quick check. Other sections (including the tarot scan, scene games, Quick start and other houses' cases) are skipped. Nosing boards are now the whole wait (32s).

## 2b. Faster path search, same boards

**Done 2026-10-23.** `windingPath` in `nosingBoard.ts` does the same search with the same `Rng` draws: neighbour lists built once per grid, a typed `used` array, a running count of rooms entered, and each option ranked once before a stable insertion sort. No board changed (1,476 boards over the manor and every house and variant, 12 seeds per level, byte-identical before and after), so no version bump and no golden change.

| | before | after |
| --- | --- | --- |
| those 1,476 boards | 32.1s | 12.7s |
| `--only nosing` | 49s | 19s (nosing boards 32s to 9s) |
| quick `npm run checks`, check-cases | 107s | 64s |

Anything in section 3 should be measured against the new numbers.

## 3. Propose a room-piece path, and look at it before building it in

Sections 1 and 2 are done. What is left of a nosing-only check is building the boards (about 32s of 49s). This section is a proposal for that, not a change to ship. It would change every nosing board, so it stays out of the game until the pictures below are accepted. Shipping it later needs a `NOSING_VERSION` bump, a storage note, and one `check-cases --full`.

The slowness is both layouts. The manor has no door list, and its medium and hard boards search four squares per cell. The lodge and its family are already one square per cell; they are slow because the path is long and the doors constrain it. The end is not chosen first: the search picks a random edge square and stops wherever it is once the path is long enough. If that room is the scene, the try is thrown away.

A door is a pair of rooms (`house.doors`, letters such as `HC`). `doorSpots` marks the middle cell of the wall they share, which is where the door is drawn. The path may cross anywhere along that wall. The manor has no door list, so a shared wall is open along its length.

**Proposal.** Choose the end room first: not the scene, and a one-door room only as the end. The route is a few door pairs. A piece is one room, from the wall it was entered through to the wall it leaves through, and only that room's squares are in the search. Keep a few lengths for each pair of walls. Joining the pieces is the path. Rooms do not share squares, so the join does not cross itself. Fitting the length is swapping or stretching one piece. Each piece keeps a spare square for that room's search. On the manor's medium and hard, build the pieces on the cells and only then split each cell into four. The checks stay the ones the builder has now: length, rooms entered, the spare square, the end not in the scene, enough plain squares for the obstacles, and `nosingBounds`. Rolls stay `rollFor(nosingRollSeed(seed, attempt), ...)`.

**Look before replacing.** A throwaway script, not `buildNosingBoard`, generates a few pairs and draws them. Same house, level and seed, old path beside the new one:

| House | Level | What to look at |
| --- | --- | --- |
| Manor | easy | Already one square per cell. The new path should still read as a walk through the rooms. |
| Manor | medium | Old path is on the split grid. New path is built on the cells, then split. |
| Lodge | medium | Long path, real doors. A one-door room, if the route uses one, is only the end. |

Each picture shows the floor plan, the path in order, the doors, and the length. Next to the pair: build time, how many tries, and whether the new path meets the checks above. If the tries do not fall, or the path only looks right on the manor, stop. The old builder stays until those pictures are accepted.

## Leave alone

- The turn-window search (`nosingBounds`). It is already the exact check, and it is cheap.
- A worker pool for the whole case check. Revisit only if a nosing-only run is still too slow after the walker.
- Running `check-cases --full` while fixing a board. The quick sample, or `--only nosing`, is the loop. The full check is once, when a change can alter boards or cases.
