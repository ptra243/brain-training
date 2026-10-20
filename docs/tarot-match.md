# Tarot match

A concentration (memory match) minigame that replaces "Tell me again", which was dropped after
playtesting: it didn't feel like a puzzle, was tedious, and the changed fact was too hard to spot.
She doesn't enjoy memory games much, so the game is built to be easy and forgiving.

## Board

- Pairs come from the case: each suspect has an arcana card and each item has a face card.
- Deal order, stopping when the board is full:
  1. The reward clue's own cards: its suspect, its weapon, and its room if it names one. Always
     on the board. The board shows what is involved, never whether it was there or not.
  2. Suspects and items from other clues, found or not.
  3. Minor arcana suit cards (cups, wands, swords, pentacles) as pure decoys, only if the case runs
     out. They carry no case data. The theme file lists the extra card art.
- The culprit and the weapon may be dealt (as clue or filler cards).
- Nothing on a card names its suspect or item. The arcana never appears on the case board, so
  she'd have to remember it herself; any tarot meaning is an easter egg only.
- Pairs scale with difficulty (about 6, 8, 10), plus one joker, sized for 360px wide: 4 across,
  cards about 75px wide, 13 / 17 / 21 cards, last row centred.
- Case sizes (`src/engine/settings.ts`): easy and medium 4 suspects + 4 weapons (8 pairs), hard 5 + 5
  (10), big cast 7 suspects + 5 weapons (12). Rooms are a third face-card type if more are needed.
- A miss costs nothing and tries are not counted.

## Joker (free peek)

- Flipping the joker removes it from the table and turns one random unmatched card face up.
- That card stays face up until she matches it. She still picks two cards each turn.
- When it is matched, a new random unmatched card turns face up for free.
- With no unmatched cards left, nothing flips.

## Hints and Solve

- Cat hint: a random card she has already seen shows as a transparent ghost. Copy says what the
  cat did.
- Solve button with a `Dialog` ("Are you sure? This can't be undone") reveals the board and still
  unlocks the clues. Recorded as `revealed`, not `won`.

## Art

- Start with public-domain tarot scans (1909 Rider-Waite-Smith, from Wikimedia Commons; check the
  licence of the exact scan set before using it). Fall back to original SVG symbols if they don't
  suit the look.
- If the scans clash with the green baize and ivory look, sit the cards on a "playmat" panel
  instead of restyling the cards.
- Art is theme content in `src/content/`: a card is an id plus an image, and code never names a
  card. One shared card back.
- Resize and compress the images (about 150px wide, webp) so the PWA stays small, and check they
  can be told apart at about 75px wide.

### Card back

- Drawn in CSS/SVG, not a scan: a deep burgundy field (clearly different from ivory faces and
  the green baize) with a brass border and a simple repeating diamond or star pattern.
- One back for every card; the joker uses it too, so she has to find the joker.
- Colours are variables at the top of `src/styles.css`; the pattern lives in the card component.
- Short CSS flip animation, off under reduced motion.
- The cat's hint ghost is a faded face drawn over the back.

## Open points

- Which scan set, and the total image weight (22 major arcana plus the suit cards used as decoys).

- Which cards count as "seen" for the cat hint (any flipped card, or only ones since the last
  shuffle).
- Exact pair counts per difficulty, to check on a phone.
- Whether a room in the reward clue gets its own pair (assumed yes).
- Seed the deal from the case ref (rule: same ref = same case).
