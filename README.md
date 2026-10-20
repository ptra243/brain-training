# Brain Training

Brain-training games plus a murder-mystery campaign: each minigame she wins
reveals a clue, and she works out who did it, where and with what on a house
map and a cross-out grid.

React + TypeScript + Vite, installable as a PWA, no backend.

## Run it

Needs Node 22.18 or newer.

```bash
npm install
npm run dev          # open the URL it prints; on your phone use the Network URL
npm test             # engine unit tests
npm run check-cases  # build cases at every level and confirm each is fair and has one solution
npm run update-golden # rewrite the golden case snapshot (only after an intended change to generated cases)
```

## Layout

| Path | What it is |
| --- | --- |
| `src/content/` | House, suspects, items. Placeholder names; swap the theme here. |
| `src/engine/` | Seeded generator, clue pool, solvers (classic and the 7-guest search), levels, case codes and names, campaign rounds. No React. |
| `src/game/` | Home screen, casebook (clues, map, grids, accusation), campaign view, saved progress, game screens. |
| `src/games/` | Puzzle logic: Wordle scoring, crossword, word search, cat puzzle and sudoku generators. No React. |
| `src/dev/CaseInspector.tsx` | Dev page (add `#dev` to the URL): step through cases, see clues and the answer. |
| `scripts/check-cases.ts` | The fairness check: 100 cases per preset, 10 per combination of levels, 20 Quick start cases per kind, and every wrong-guess path of 9 campaigns. |
| `scripts/update-golden.ts` | Rewrites `src/engine/golden.json`, the hashes of 77 fixed cases that `golden.test.ts` compares against. |
| `scripts/build-words.ts` | Builds `public/words.txt`, the list of accepted guesses. |

## How a case is made

1. The case code (a number, or a Quick start code like `K7QF2-MN`) becomes a
   seed, so the same code is always the same case.
2. The truth is rolled: each suspect gets a room and an item; one is the murderer.
   With 7 guests, rooms and weapons are shared (5 of each) and two guests hold
   nothing.
3. Every true clue is listed (in/not in a room, holding/not holding an item,
   either/or rooms, next to a room, neighbouring suspects; with 7 guests also
   together, apart, alone, empty-handed).
4. Clues are added in a weighted random order until only one answer is left,
   then any clue the others make redundant is removed. Classic cases list every
   answer; 7-guest cases use a search (`src/engine/search.ts`) instead.
5. Each clue is assigned to a minigame that will reveal it.

A case is set by four levels (`src/engine/settings.ts`): suspects (4, 5 or 7),
logic (which clue types), minigames and length. Easy, medium and hard are
presets of these. A campaign is one long mystery over up to 3 rounds; each round
is built from the victims before it and checked by `roundProblems` rather than
for a single solution.

## Deploying

`.github/workflows/deploy.yml` runs the tests and the case check, builds, and
publishes to GitHub Pages on every push to `main`. Turn it on once in the repo's
Settings > Pages > Source: GitHub Actions.

## Status

- [x] Phase 1: content data
- [x] Phase 2: generator and solver
- [x] Phase 3: casebook UI (map, cross-out grid, accusation)
- [x] Phase 4: minigames that deliver clues (cat puzzle, sudoku, questioning, final questioning), and a choice of Wordle, mini crossword or word search for the scene
- [ ] Phase 5 (under way): case settings as levels, home screen with Quick play (a new case with a mix of puzzles, each its own clue game picked from Get a clue; replayable case codes and names, with the older Quick start cases still loading), 7-guest cases, campaign over up to 3 rounds. Next: rumours and the time grid
- [ ] Phase 6: playtest and tuning
