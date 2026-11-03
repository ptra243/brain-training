# FreeCell — game design

Draft, 2026-10-28. Copied from the Claude Doc
https://claude.ai/artifact/HEwnkLC1KqDSjuKNRqco6K; this file is the working copy from here on.

## Summary

FreeCell is the "proper think" card game for a 10-minute session: every card is face up from the
start, so after the deal there's no luck, only planning. Nearly every deal is winnable (of the
classic 32,000 numbered Microsoft deals, only #11982 is known to be impossible), so a loss is her
plan, not the deck. It trains working memory and sequencing, and needs no clue tie-in to earn its
place.

## Rules

Move all 52 cards onto four foundations, one per suit, from Ace up to King.

| Area | What it holds |
| --- | --- |
| Tableau | 8 columns: all 52 cards dealt face up, four columns of 7 and four of 6 |
| Free cells | 4 parking spots, one card each |
| Foundations | 4 piles, one per suit, built up A, 2, 3 … K |

**Moves:** only the exposed card at the bottom of a column moves. It can go:

- onto a foundation, if it's next in that suit;
- into an empty free cell;
- onto another column's bottom card, if it's one lower and the opposite colour (a red 6 on a black 7);
- into an empty column, where any card can go.

A card in a free cell can move back to a column or onto a foundation by the same rules.

**Supermoves:** moving a run of cards at once is allowed when there's enough free space to do it one
card at a time. With f empty free cells and e empty columns, the largest run is (f + 1) × 2^e.

**How it feels:** the Aces and 2s are buried. She digs them out by building descending
alternating-colour runs and parking awkward cards. Free cells are the scarce resource, and an empty
column is worth even more.

## Deals, difficulty and the solver

Deals are seeded, and the number of free cells sets the difficulty.

| Level | Free cells | Notes |
| --- | --- | --- |
| Easy | 4 | Standard FreeCell; almost every deal winnable |
| Medium | 3 | Noticeably harder; some deals become impossible |
| Hard | 2 | Brutal; solver-checked deals only |

- **Seeds:** the seed fixes the deal, so the same code is the same game.
- **Solver:** only needed for 3 and 2 free cells. A depth-first search with a transposition table,
  canonical states (free-cell order and column order don't matter) and automatic safe moves to the
  foundations finds a win quickly. Give it a node budget and skip any seed it can't settle.
- **Seed list:** precompute winnable seeds per level offline and store them as small lists, so
  nothing is solved on her phone and sweeps stay fast.
- **Undo:** unlimited, since there's no hidden information.
- **Scoring:** won or not, plus moves and time for her own records. No penalty for undo.
- **Solve button:** plays the solver's line to the end; recorded as revealed.
- **Hints:** the house cat points at the next card the solver would move.

## UI on the phone and theme

Eight columns across 360px is the hard part, so cards overlap heavily and show only their corner index.

- **Layout:** free cells and foundations in one row at the top (8 slots), the 8 tableau columns
  below, each card about 42px wide with a large corner rank and suit.
- **Moving:** tap a card to send it to its best legal spot (foundation first, then a column, then a
  free cell); drag for anything else. Tap-to-move matters more than drag on a small screen.
- **Auto-play:** cards that can safely go to the foundations go there by themselves, which most
  digital versions do.
- **Look:** the card table's green baize and ivory cards, with the four foundations as the suits'
  brass trays.
- **Long columns:** if a column runs off the bottom, squeeze the overlap rather than scroll.

## Open questions

- [ ] Do 8 columns stay readable at 360px, or does the layout need a prototype first?
- [ ] Standalone only, or a clue game in the mystery too?
- [ ] Offer the harder Baker's Game rule (build by suit, not colour) as an extra level?
- [ ] Show a move counter, or keep it relaxed?
