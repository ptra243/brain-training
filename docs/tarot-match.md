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

## Decisions (settled 2026-10-20)

- **Play cases only, as a stand-in on its own seed stream.** Adding it to `ROTATION` or to the Play
  game draw would change every other case, which the "don't change existing cases" rule forbids.
  Copy `boardSlot` in `generate.ts`: draw the games exactly as today, then decide on a seed of its own
  (`${seed}-tarot-game`) whether tarot replaces one drawn Play game (a share `TAROT_SHARE` in
  `gameKinds.ts`, about 0.25), and which. Only cases that get tarot change; all others stay identical.
  Its level roll goes last in `PLAY_ROLLED` (`caseRef.ts`). Bump `PLAY_VERSION` in
  `src/game/storage.ts`, since the Play cases that get tarot change.
- **Seeded.** The deal (card order, joker position, decoys) comes from the spec's `seed` through `Rng`,
  never `Math.random()`. The cat hint and the joker's free peek are also drawn from a `Rng` seeded from
  the spec seed plus a count of hints/peeks used, so a saved game replays the same.
- **Seen cards** for the cat hint: any card she has flipped face up since the game began, still
  unmatched. If none, the cat says it hasn't seen anything yet.
- **Rooms get a pair** when the reward clue names one (yes).
- **Pairs per level:** easy 6, medium 8, hard 10 (plus the joker: 13 / 17 / 21 cards). If the game's
  clues need more distinct suspects/items/rooms than the level allows, the board grows to fit, capped
  at 12 pairs (the big cast's size). Check on a phone at 360px before settling the sizes.
- **Art for the first build:** original SVG symbols, one per card, made as theme content. Scans come
  later as a content swap, since a card is only an id plus an image. This avoids the licence and
  weight questions blocking the game.

## Implementer brief

Build the tarot match minigame as a Play-case game. Read `src/games/CLAUDE.md`, `src/game/CLAUDE.md`
and `src/engine/CLAUDE.md` first. Split into three pieces so each can be reviewed alone.

**1. Engine and puzzle logic (no React), `src/games/tarot.ts` + tests**
- `TarotSpec` (`kind: 'tarot'`, `unlocksScene: false`, `pairs`, plus `GameBase`) in `src/engine/types.ts`;
  add `'tarot'` to `RotatingKind`/`GameKind`, to `CLUE_SOURCE` (testimony) in
  `gameKinds.ts`. It must not be added to `ROTATION`.
- `buildTarot(deck, clueCards, pairs, rng)`: pure. Takes the case's reward-clue cards (suspect, weapon,
  room if named), then other clues' cards, then decoy minor-arcana cards, up to `pairs`. Returns the
  shuffled board (two of each card, plus one joker). Nothing on a card names its suspect or item.
- State and moves as pure functions: `flip`, `resolveTurn` (match stays up, miss turns both back
  down at no cost), joker (removed on flip, turns one random unmatched card face up; re-peeks when
  that card is matched; nothing if none are left), `tarotHint` (ghost of a seen unmatched card),
  `tarotSolved` (reveals everything).
- Tests: same seed gives the same board; the reward clue's cards are always on it; every card has
  exactly one partner; the joker rules above; following hints always reaches a win; no card id
  contains a suspect, item or room name.

**2. Wiring, `settings.ts`, `caseRef.ts`, `registry.tsx`, `storage.ts`**
- Add its level to `MINIGAMES` in `settings.ts` (pairs 6 / 8 / 10) and its roll last in `PLAY_ROLLED`.
- `tarotSlot` in `generate.ts`, modelled on `boardSlot`: its own seed, `TAROT_SHARE`, replaces one
  drawn Play game only when that game's clue share can be dealt as a board within the pair cap;
  otherwise -1. Runs after the board stand-in, never inside the draw. Other modes never reach it.
- The golden snapshot test (see `docs/next-sessions.md`, "Golden case snapshots") must be in place and
  passing before this piece; afterwards only the Play snapshot may be regenerated.
- Registry entry: name "Tarot match", blurb "Turn the cards over and find the pairs."; `build` makes
  the board once.
- Bump `PLAY_VERSION`. Dump a few existing non-Play cases and presets before and after and diff them:
  they must be identical.
- `check-cases` covers all three levels.

**3. UI and content, `src/game/games/TarotGame.tsx`, `src/content/`, `src/styles.css`**
- Card back in CSS/SVG per the "Card back" section; flip animation off under reduced motion.
- 4 columns, cards about 75px wide, last row centred, 44px touch targets, no sideways scroll at 360px.
- Hint button (`HintButton`/`HintNote`) with the cat's copy; Solve with a `Dialog`, recorded as
  `revealed`.
- Card art is theme content in `src/content/`: an id plus an SVG; code never names a card.
- Check the screen through the `browser-check` agent.

Delegate all three pieces to the `implementer` agent, one brief each. I keep the review of the dump-and-diff.
