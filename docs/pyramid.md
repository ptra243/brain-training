# Pyramid — game design

Draft, 2026-10-28. Copied from the Claude Doc
https://claude.ai/artifact/FsuxB8D2xsc9DoFxUY6v33; this file is the working copy from here on.

## Summary

Pyramid is a 2–5 minute quick-fire card game: clear a pyramid of cards by removing pairs that add
up to 13. It's mental arithmetic and visual scanning, so it fills the site's number-game slot and
works as a warm-up before a longer game. Many deals can't be fully cleared, so it's scored by cards
cleared, or dealt only from solver-checked seeds.

## Rules

Clear the whole pyramid by removing uncovered cards in pairs that sum to 13.

| Part | Rule |
| --- | --- |
| Layout | 28 cards face up in 7 rows (1 at the top, 7 at the bottom), each row overlapping the one above. The other 24 cards form a draw pile |
| Values | Ace 1, number cards face value, Jack 11, Queen 12, King 13 |
| Move | Remove two uncovered cards that sum to 13. A King is removed on its own |
| Uncovered | A card is uncovered once both cards overlapping it from below are gone |
| Draw pile | Flip one card at a time onto a waste pile. The top waste card can pair with an uncovered pyramid card, or with the next flipped card |
| Passes | Usually one pass through the draw pile, or a limited number |
| Win | The pyramid is empty |

**Where the thinking is:** choosing which pair to take when there's a choice. If a 6 is uncovered
on both sides of the pyramid and a 7 comes up, the 6 she clears decides which part of the pyramid
opens next. Stronger play also counts which cards are still to come in the draw pile.

## How it compares with FreeCell

They're near opposites, so they fill different slots: Pyramid the quick warm-up, FreeCell the long
think (`docs/freecell.md`).

| | FreeCell | Pyramid |
| --- | --- | --- |
| Information | Everything face up | Draw pile order is hidden |
| Core skill | Planning several moves ahead | Spotting pairs that make 13, plus some planning |
| Luck | Almost none: nearly every deal is winnable | Lots: many deals can't be cleared |
| Length | 5–10 minutes | 2–5 minutes |
| Feel | Untangling a knot | Quick-fire matching |
| Brain skill | Working memory, sequencing | Mental arithmetic, visual scanning |

Pyramid also pairs well with Clear the Dungeon (`docs/clear-the-dungeon.md`): both are about sums,
but Pyramid is a short warm-up and Clear the Dungeon the planning game.

## Deals, scoring and difficulty

Score by cards cleared so an unwinnable deal still feels like progress; use solver-checked seeds
when a full clear should be possible.

- **Seeds:** the seed fixes the shuffle; same code, same deal.
- **Scoring:** cards cleared out of 52 (pyramid and draw pile). A full clear is a bonus, not the
  only win.
- **Solver:** the deck order is known to the solver, so it's a full-information search over a small
  state (28 pyramid cards plus a position in the draw pile). Precompute winnable seeds offline for
  an "always clearable" level.

| Level | Passes through the draw pile | Deals |
| --- | --- | --- |
| Easy | 3 | Solver-checked winnable |
| Medium | 1 | Solver-checked winnable |
| Hard | 1 | Any deal; score is cards cleared |

- **Solve button:** plays the solver's line (or the best line it found); recorded as revealed.
- **Hints:** the house cat highlights a pair that makes 13.

## UI on the phone and open questions

The pyramid's 7-card bottom row sets the card width: about 46px each across 360px, with the draw and
waste piles below.

- **Tap to pair:** tap one card, then its partner; a King goes with one tap. Selected cards lift slightly.
- **Dimmed covered cards:** covered cards are slightly darker, so she only scans what she can play.
- **Sum helper (easy only):** tapping a card shows the value it needs ("needs 7").
- **Look:** ivory cards stacked on the card table's baize.

**Open questions**

- [ ] Keep the sum helper, or is spotting the 13 the point?
- [ ] Standalone only, or a number game in the mystery too?
- [ ] Passes per level: is 3 on easy right?
