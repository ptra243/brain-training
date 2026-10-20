# Tarot match: free-peek card feels inconsistent (handover)

Reported by the owner after playing the build (commit `84e7c34`), 2026-10-21. Read
`docs/tarot-match.md` (Joker section) first, then `src/games/tarot.ts` (`flip`, `resolveTurn`,
`peekFree`, `peekFresh`) and `src/game/games/TarotGame.tsx` (the `ready` effect, `LOOK_MS`).

## What was seen (owner's words, tidied)

With the joker flipped and a free peek card up:
1. For the first few turns only one tap is needed or possible: she "can only flip 1 card".
   After a while it behaves normally (two taps per turn).
2. She found the partner of the free card and it would not match when she tapped it as the first
   of her two flips. After trying it a few times it did match.
3. Later it went back to "only flipping 1 card", twice.

## What the code does today (read, not yet reproduced)

The peek has two hidden modes, switched by `peekFresh` and invisible on screen:
- **Fresh** (right after the joker or after a re-peek): the peek is already her first pick. One tap
  on any other card makes the pair `[peek, tapped]` and starts the 900 ms resolve. This looks like
  "I can only flip one card". Tapping the peek itself does nothing.
- **Not fresh** (after a miss that used the peek): taps are ordinary picks, and she must tap the
  peek herself to pair it.
- A turn that did not involve the peek leaves it fresh; a match of the peek re-peeks (fresh again).

So the mode changes under her without any sign, which fits all three reports:
1. Fresh mode: one tap = whole turn.
2. In fresh mode, tapping the partner as her "first flip" is silently treated as the second pick
   against the peek, so the pair she expected (partner + peek, or partner + another card she
   meant) is not what happens; in non-fresh mode the partner is a plain first pick and she then has
   to tap the peek, which she doesn't expect to need.
3. A new peek turns up after a match, so it is fresh again.

Not ruled out: a real engine or UI bug (for example a stale `picked` or the `ready` effect in
`TarotGame.tsx` blocking taps during the 900 ms look, `if (finished || ready) return`). The
no-deadlock and hint-following tests pass, so a plain state deadlock is unlikely, but they don't
cover the UI timing. Reproduce first: load Play case `T2FRA` (medium) via `#dev`, flip the joker,
and log `data.picked`, `data.peek`, `data.peekFresh` on each tap.

## Decision to make (design, keep in the main session)

The two-mode rule is too hard to read. Options:
- **A. One rule, shown on screen.** The peek is always a visibly selected first pick (strong ring,
  "Free" tag) until she taps another card. After a miss it stays selected as the first pick again.
  She can't pair two ordinary cards while a peek is up, but it's one rule. Tapping the selected
  peek could deselect it (then two ordinary picks work), which is the free choice the owner asked
  for.
- **B. Peek is just a face-up card.** No special pick. She taps the peek and its partner like any
  other pair. Simplest, but loses "counts as your first pick", which the owner asked for.
- **C. Keep two modes but show them:** the "Free" tag and glow only while fresh, plain face-up
  after a miss. Cheapest, still two rules.

Recommendation: A with tap-to-deselect. Settle it with the owner, update the Joker section of
`docs/tarot-match.md`, then write one implementer brief.

## Implementer brief (once the option is chosen)

- Engine and tests in `src/games/tarot.ts` / `tarot.test.ts`: drop or rework `peekFresh`; tests for
  peek + partner, peek + miss + retry, deselect (if A), re-peek after a match, never a blocked tap.
  Hint-following must still always win.
- UI in `TarotGame.tsx` and `styles.css`: the peek's selected state follows the rule exactly; the
  joker pill's note text matches it.
- Add a UI-level check of the resolve timing, or have `browser-check` drive: joker, then 10 turns in
  a row, reporting every tap that had no effect.
- Run `npm test`, `check-cases`, `npm run build`. `golden.json` must not change.
