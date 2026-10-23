# Houses

Several flat houses with irregular footprints and doors, one picked per case. Built 2026-10-23.
The "Two-storey houses" idea in `next-sessions.md` is not this work: these are single-storey.

## What exists

- Layouts in `src/content/houses.ts`, built by `houseFromLayout` (`src/engine/house.ts`): the manor
  (6x6, no doors), lodge (L-shaped, 10 rooms), courtyard (ring round a void courtyard, 9), steps
  (staircase footprint, 8), long house (6 rows by 12, each room 3 thick, centred in the 12x12 grid, 8) and T lodge (9).
  The Cross was rejected as unrealistic.
- A cell no room owns is void (`.` in the layout). The footprint is one contiguous region, each room is
  contiguous and at least 2 cells across, every door pair shares a wall, and the door graph connects
  every room. Room ids are shared across houses where the room is the same (kitchen, hall, library,
  study, conservatory, bedroom); dining, pantry, cloakroom and games room are new.
- Doors: `House.doors` is a list of room pairs. No `doors` means rooms that share a wall touch (the
  manor). With `doors`, only door-joined rooms touch (`roomAdjacency`). `doorSpots(house)` draws one gap
  per door on the middle cell of the shared wall.
- Variants: `rotateHouse(house, quarterTurns, mirror)`. Ids are `r90 | r180 | r270` for turns and
  `m | m90 | m180 | m270` for mirrored ones (the mirror is left-right and is applied before the turn); the
  base layout has no suffix. `houseById('lodge/m90')` builds and caches them. All 8 per layout.
- Choice: `chooseHouse(seedText)` rolls the house and its orientation on its own seed stream
  (`${seedText}-house`), never the main rng. The manor is never turned. `playableHouses` is every layout.
  A case stores `houseId`; `houseOf(c)` is how code finds its house. A campaign keeps one house and one
  orientation for all its rounds (`CampaignRef.houseId`; absent means the manor).
- Storage prefix is v9 and the golden snapshot was regenerated (most cases changed: the roll now covers
  six layouts). Not pushed or deployed at the time of writing.
- Sweeps: `check-cases` builds cases and nosing boards on every layout and variant
  (`src/content/houseSweeps.ts`, `src/engine/houseCaseSweeps.ts`).

## Nosing on the bigger houses

- Per-house settings are `House.nosing` (data in `houses.ts` through `withNosing`), read through
  `nosingSpec(house, level)`; the manor gets the stock level objects unchanged. Never put an explicit
  `undefined` in an override: it overwrote stock values once (528 failures).
- Squares are one per cell (n=1) on the new houses; 2x2 per cell would be 14px squares.
- Easy keeps 28-33 squares: the path ends once clues + 2 rooms are entered (`enterExtra`), capped at 6
  (`enterMax`). The lodge's medium and hard stop after clues + 3 rooms. Paths cross rooms only through
  doors, and never end in a room with fewer than 3 squares walked.
- The board leaves out the wall between door-joined rooms (`wallLines` in `nosingUi.ts`). The cat may
  cross anywhere along that wall, not only at the door gap.
- The path needs about obstacles + ladders + snakes + 8 plain squares, and a room with a single 1-cell
  door can only end the path (the long house's library needed a second door).
- Why medium and hard are slow to build: every non-manor house needs a path through 78-92% of its
  squares (lodge 100-110 of 126), which is nearly a path through every square. The manor needs about 60%.

## Decisions

- The compact nosing board (3.5rem tall, shown during a dog fight) stays small on tall or narrow houses.
  The focus is the current fight; a full-map button or dialog can come later.
- Room-by-room nosing builder (build each room's path from its entrance to its exit, joined through
  doors): prototyped and rejected 2026-10-23. It was 14x faster on the manor (7.4 ms to 0.5 ms at medium),
  but could not build the lodge or long house at medium and hard, and it saves only about 2 s on the
  quick check and 34 s on the full one. Details in the "segment-wise" section of
  `.claude/handoff/houses-foundation.md`. The path search itself was made 2.5x faster without changing
  any board (commit `70a9015`).
- Doors for the manor: not needed. A door on every touching pair would leave adjacency and every case
  identical, but the nosing board would then lose all its inner walls, so skip it unless the look matters.
- Room names in clues come from the case's house (`houseOf`), not the manor: `guestContent({...content,
  house: houseOf(c)}, ...)`.

## Open

- Done 2026-10-23: the nosing variant sweep now builds 10 seeds per variant in full (2 in quick), bots on 3
  (1 in quick); base layouts keep the full sample.
- Measured 2026-10-23 (20 seeds, medium and hard): only the lodge is slow (26 ms a board, 8 ms at 70-76% fill); the rest build in 1-8 ms. Windows above 85% start failing on the lodge. Shortening the lodge would change its boards (golden regeneration); not done.
- The long house was made 6 rows deep (72 cells, was 48 and failed below 79% fill). Window 50-55, turns 6-15, stock obstacle count; builds 20/20 at 69-86%. v9 was never pushed, so no prefix bump.
- `#dev/nosing-houses` shows the nosing board on each other house; the lodge, courtyard, long house and T lodge read at 360px with no sideways scroll (steps not looked at). `#dev/houses` lodge passes too; it prints "Shaded rooms are empty tonight: ." with an empty list.
- Idea: cache built boards keyed on a hash of the builder, spec, layouts and content so repeat local
  runs skip unchanged builds; CI stays cold.
