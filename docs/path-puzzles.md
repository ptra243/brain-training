# Path puzzles: Mirrors and Railroad — game design

Draft, 2026-10-28. Copied from the Claude Doc
https://claude.ai/artifact/QX9dBYx6qDJoXeMEnb2VfY; this file is the working copy from here on.

## Summary

Mirrors and Railroad are the same puzzle underneath: arrange tiles on a grid so a path runs from a
start to a goal. We build one grid-and-path engine and give it two skins. Mirrors bounces a light
beam in straight lines; Railroad carries a train through curves and junctions. Both are short
spatial-reasoning puzzles, a different brain skill from the word, number and logic games already on
the site.

## The shared engine

A tile grid, a tracer that follows the path from the start, and a generator that builds the answer
first so every seeded puzzle is solvable.

- **Grid:** a small rectangle (5×5 to 7×7 fits 360px with 44px touch targets). Each cell is empty,
  a fixed tile, or a movable tile.
- **Tiles:** each tile maps an entry side to an exit side (or several, for splitters and junctions).
  A mirror maps north to east; a curved rail does the same. Rotation turns the mapping.
- **Tracer:** start at the source, step cell to cell following each tile's mapping, and stop at the
  goal, a wall, an empty cell (mirrors: the beam keeps going straight) or a loop. The tracer also
  draws the partial path live, so she sees how far it gets.
- **Generation:** lay down a valid route first, place the tiles it needs, add decoy tiles, then
  scramble (rotate and, on harder levels, move). The puzzle is solvable by construction; no solver
  is needed.
- **Uniqueness:** optional. Several solutions are fine for a casual puzzle. For a clue game, check
  with a small search that the intended route is the only one, or just accept any route that
  reaches the goal.
- **Difficulty levers:** grid size, number of movable tiles, scramble depth, decoys, and whether
  pieces move or only rotate.
- **Seeds:** same code, same puzzle, like every other game. Her moves are the only saved state.

## Mirrors

Move and rotate mirrors so a lantern's beam lands on a target.

| Piece | What it does | From level |
| --- | --- | --- |
| Mirror | Turns the beam 90°; tap to flip between / and \ | Easy |
| Block | Stops the beam; fixed | Easy |
| Target | Lights up when the beam hits it; all must light | Easy |
| Splitter | Half-silvered: the beam goes both straight and turned | Medium |
| Coloured filter | Lets only one colour through | Hard |
| Second lantern | A second beam in another colour, each to its own target | Hard |

- **Easy:** rotate only, one beam, one target, 3–4 mirrors.
- **Medium:** some mirrors move as well; a splitter and two targets.
- **Hard:** filters and two coloured beams ("the red beam must hit the red gem").
- **Mystery tie-in:** the lantern beam lands on a portrait, a safe or a loose floorboard, revealing
  where something was hidden. The room it points to comes from the clue, never from the puzzle's
  answer, following the rule that answers are never a room name.

## Railroad

Rotate and move track pieces until the train can run from the start station to the end.

| Piece | What it does | From level |
| --- | --- | --- |
| Straight | Connects opposite sides | Easy |
| Curve | Connects two adjacent sides | Easy |
| Fixed station | Start or end; can't move | Easy |
| Crossing | Two straights crossing; the train goes straight through | Medium |
| Points (junction) | One side splits to two; tap to switch | Hard |
| Must-visit stop | A station the route has to pass through | Hard |

- **Easy:** rotate only. A quick 2-minute puzzle.
- **Medium:** rotate plus a few must-visit stops.
- **Hard:** pieces also slide into an empty square, 15-puzzle style. Kept as its own level because
  sliding adds a lot of planning on a phone.
- **Win:** tap "Run the train" and watch it travel; it stops where the track breaks, showing her
  where to look.
- **Mystery tie-in:** an alibi check. The route proves whether a suspect's train could have reached
  that station in time, so the reward is a timing clue.

## UI on the phone

One square grid filling the width, with the path drawn live as she works.

- **Tap to rotate**, drag to move. A movable tile has a small handle; a fixed one looks bolted down.
- **Live path:** the beam or track lights up as far as it currently reaches, so every move shows
  its effect.
- **Undo** steps back through moves; unlimited, since there's no hidden information.
- **Look:** Mirrors in the manor at night, brass mirrors and a warm lantern beam on dark wood.
  Railroad as a toy train set on the card table's baize.
- **Solve button:** shows the generated route and records the game as revealed.
- **Hints:** the house cat nudges one tile into place.

## Open questions

- [ ] Build Mirrors first, then Railroad on the same engine?
- [ ] Any route that reaches the goal wins, or only the intended one?
- [ ] Grid size per level (5×5, 6×6, 7×7)?
- [ ] Standalone only at first, or clue games in the mystery from the start?
- [ ] Is sliding in Railroad fun on a phone, or should it stay rotate-only?
