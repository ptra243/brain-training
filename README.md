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
npm run check-cases  # generate 300 cases and confirm each has exactly one solution
```

## Layout

| Path | What it is |
| --- | --- |
| `src/content/` | House, suspects, items. Placeholder names; swap the theme here. |
| `src/engine/` | Seeded generator, clue pool, solver and clue trimmer. No React. |
| `src/game/` | The casebook: clues, map, grids, accusation, saved progress, game screens. |
| `src/games/` | Puzzle logic: Wordle scoring, cat puzzle and sudoku generators. No React. |
| `src/dev/CaseInspector.tsx` | Dev page (add `#dev` to the URL): step through cases, see clues and the answer. |
| `scripts/check-cases.ts` | The 100-cases-per-difficulty uniqueness check. |

## How a case is made

1. The case number becomes a seed, so case 7 is always the same case.
2. The truth is rolled: each suspect gets a room and an item; one is the murderer.
3. Every true clue is listed (in/not in a room, holding/not holding an item,
   either/or rooms, next to a room, neighbouring suspects).
4. Clues are added in a weighted random order until only one answer is left,
   then any clue the others make redundant is removed.
5. Each clue is assigned to a minigame that will reveal it.

Difficulty changes the number of suspects and which clue types are allowed.

## Deploying

`.github/workflows/deploy.yml` runs the tests and the case check, builds, and
publishes to GitHub Pages on every push to `main`. Turn it on once in the repo's
Settings > Pages > Source: GitHub Actions.

## Status

- [x] Phase 1: content data
- [x] Phase 2: generator and solver
- [x] Phase 3: casebook UI (map, cross-out grid, accusation)
- [x] Phase 4: minigames that deliver clues (Wordle, cat puzzle, sudoku, questioning, final questioning)
- [ ] Phase 5: modes, campaign progression, saved progress
- [ ] Phase 6: playtest and tuning
