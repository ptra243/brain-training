# Tarot card faces

Build plan, moved from `docs/next-sessions.md`. Reads first: `src/content/tarotArt.ts` (today's faces),
`src/engine/tarotCards.ts` (case cards are `major-i` by order: suspects, items, rooms),
`src/content/dogCards.ts`, `docs/theme-draft.md` ("Hidden tarot layer", "Major arcana coverage") and
"Settled" in `docs/portraits.md`.

## Decided 2026-10-23

The tarot match keeps drawn tarot faces, **not portraits**:
- only suspects have portraits;
- busts are hard to pair at a glance on a 25-card board;
- the deal always holds the reward clue's cards, so portraits would show who the clue names before she
  wins.

Today's faces are fixed shape + colour per id, not random; the dog fight shows the same faces, so
"Seven of cups" is a coloured shape. Code-drawn SVG in `tarotArt.ts`, like the portraits; no case or
storage change.

## Plan

1. **Minor arcana pips** (first; also fixes the dog fight). Four suit emblems (cup, wand, sword, coin),
   one colour per suit; ranks 1 to 10 lay out that many emblems like a playing card; page, knight,
   queen and king show one emblem plus a letter. Same-suit cards are harder to tell apart than shapes:
   decide whether that's fine at medium and hard, or whether easy deals decoys spread across suits and
   ranks. Screen-reader labels become "Seven of cups".
2. **Major arcana emblems.** 22 flat emblems (tower, moon, sun, star, wheel, scales…) in the portrait
   style, each on its own background colour so pairs still read at a glance. No names or numerals in
   normal play (case cards go by order, not by home card, so a name would mislead or hint at the hidden
   layer).
3. **Follow-on, with tarot mode:** map each suspect to their home card (the Butler gets the
   Hierophant) and show card names. Check first that `rng.shuffle` positions depend only on the seed
   and the count, so saved boards keep their layout.

Check the board (easy and hard pair counts) and the dog fight hand at 360px through `browser-check`.
