# Two-storey houses, picked per case: proposal

Not built. Moved here from its `docs/next-sessions.md` entry on 2026-10-26, unchanged in substance.
Not the single-storey houses in `docs/houses.md`.

## Idea

Replace the single 6x6 manor with 3 to 5 hand-drawn two-storey houses (8 to 10 rooms, two 6x6 floors
joined by stairs), one picked per case on its own seeded stream (like `BOARD_SHARE`), so the rest of the
generator keeps its draws. Cases still use at most 5 rooms (the grid cap); unused rooms stay on the map
as red herrings.

Why: today every room touches 3 to 5 of the other 5, so "next to" clues are weak. Floors make adjacency
sparse.

## Settle first

- Does adjacency cross the stairs? Proposed: same floor only.
- Do we add floor clues ("was upstairs", "same floor as", "different floor from")?

## Then the implementer brief

- `House` / `Room` types with floors and stairs, `houseFromLayout` checks, `roomAdjacency`.
- MapPanel and CaseInspector drawing two floors (tabs or stacked, 360px, no sideways scroll).
- Room word lists; room names and words should match the theme (`docs/theme-draft.md`).
- `check-cases` over every house.
- It's a content change: all cases change, so bump the storage prefix (wipes saved progress; time it
  between campaigns).
