# Clear the Dungeon — game design

Draft, 2026-10-28. Copied from the Claude Doc
https://claude.ai/artifact/PDSMJuPNBFHvaFnZVipDkk; this file is the working copy from here on.

## Summary

A one-deck solitaire where she defeats 12 face cards using number cards, reskinned as cracking
witnesses at the card table. It's a planning game with very little slack: exactly 6 spare cards
across the whole deal. It fits the site as a self-contained 5–10 minute game that uses the card
table setting directly, and it can feed the mystery later.

Original design: [Clear the Dungeon](https://docs.google.com/document/d/1BBPusx0Q_UM7vo8i5Yzuk7UyrWBf3PvjdDsx_h-qHwQ/edit?tab=t.0)
by Mark S. Ball (© 2019, v1.3.0). Game mechanics are fair to reuse; the name, rules text and art
are not, so ours is a reskin with its own name and look.

## Rules of the original

A 54-card deck splits into 12 monsters (J, Q, K) and a 42-card power deck (A–10 plus two jokers).

1. **Setup:** shuffle the 12 face cards into 4 columns of 3, face down; flip the top card of each.
   Shuffle the power deck.
2. **Draw:** take 3 cards from the power deck. Each must be played or discarded before the next draw.
3. **Attack:** a monster needs exactly 3 cards. The first two must sum to at least its power
   (J 11, Q 12, K 13), any suit. The third, the trigger, must match the monster's suit, any rank.
4. **Defeat:** the monster falls when the trigger lands; it and its 3 cards go to the clear pile,
   and the card beneath is flipped.
5. **Jokers:** worth 10 and any suit, so they work as an attack card or a trigger.
6. **Damage bar:** every card not played goes here. A 7th card there loses immediately.
7. **Win and score:** clear all 12 before the power deck runs out. Score = cards left in the power deck.

**Variations in the rules doc**

| Variation | Effect |
| --- | --- |
| Boomer-ace | Aces are worth 11; an ace used as a trigger returns to the hand |
| Power reserve | First draw is 5; keep 2 face up as a one-time reserve, usable any time; each left at the end scores 1 |
| Special abilities | Defeated kings become one-use items: K♥ puts a hand card on the bottom of the deck, K♦ looks at the bottom card and may move it to the top, K♠ doubles an attack card, K♣ draws one card |
| Dungeon layouts | Different starting arrangements of the 12 face cards |

## The maths and winnability

The deal has exactly 6 cards of slack, so raw deals are often unwinnable and we only ship deals a
solver has won.

| Quantity | Value |
| --- | --- |
| Power deck | 42 cards (40 number cards + 2 jokers) = 14 draws of 3 |
| Cards to clear all 12 | 12 × 3 = 36 |
| Spare cards | 42 − 36 = 6; a 7th discard loses |
| Pressure needed | 4 × (11 + 12 + 13) = 144, from 24 pressure cards: at least 6 a card on average |
| Pressure available | number cards sum to 220, jokers 20: about 5.7 a card on average |

The last two rows are the real puzzle. Pressure cards must average higher than the deck does, so
she has to save high cards for pressure and spend low cards as triggers. A 3 of hearts is a perfect
trigger for a heart monster and nearly useless as pressure.

Two more things make deals tight: only 4 monsters are face up at a time, and each suit has 10
number cards to cover 3 triggers plus its share of pressure.

## Detective reskin

The face cards become guests she has to crack, and the suits become kinds of evidence.

| Original | Our version |
| --- | --- |
| Monster (J, Q, K) | A guest holding something back; the badge shows how hard they are to crack (11, 12, 13) |
| Two attack cards | Pressure: questions and observations that add up |
| Trigger card (matching suit) | Evidence of the right kind, which makes them talk |
| Suits | Motive, means, opportunity, alibi (echoing the tarot readings' targets) |
| Damage bar | Suspicion: "the room is getting nervous"; 7 and everyone clams up |
| Kings' abilities | Allies she's won over, each a one-off favour |
| Jokers | A lucky break: counts as 10 or any kind of evidence |

In the mystery, cracking a guest could yield a clue, so a won deal feeds the casebook like any other
game. Standalone, it's just the planning game.

## UI on the phone

Portrait at 360px: guests across the top, an attack row under each, the hand fanned along the bottom.

**Layout, top to bottom**

1. Guests: 4 columns, top card face up, the rest showing as a stacked edge. Each face-up card
   carries a badge with its crack value.
2. Attack slots: three mini-slots under each guest. Two pressure slots, then an evidence slot
   printed with the suit icon it needs.
3. Status strip: power deck count, suspicion (damage) as 6 pips that fill, allies earned.
4. Hand: 3 cards fanned at the bottom; drag up onto a slot, or tap a card then a slot.

**Borrowed from Royal Card Clash** (a digital variant, seen in a video)

- The target number on the card, counting down as pressure goes on ("4 left"), so she never adds
  up in her head.
- A slot under each enemy, making "where does this go?" obvious and showing half-finished attacks.
- A fanned hand within thumb reach.
- The top discard stays playable until covered: a candidate easy-mode rule.

**Changed from it**

- They show 3 columns; we keep 4 with overlapping cards, or drop to 3 and redo the deck maths.
- Their HP values (15, 25) imply chip damage. We keep the original two-cards-then-trigger rule.
- Their ad-gated reshuffle and discard buttons become the allies' favours.
- Pixel-art dungeon becomes the card table: green baize, ivory cards, cream-paper guest portraits.

## Generation, scoring and open questions

Deals are seeded like every other game, and only deals a solver has won are shipped.

- **Seeded deals:** the seed fixes the order of both decks, so the same code is the same deal.
- **Solver:** the deck order is known to the solver, so it's a full-information search. Prune any
  branch that reaches a 7th discard; cache seen positions. This should take milliseconds a deal.
  If it doesn't find a win within a node budget, skip the seed.
- **Seed list:** for the daily or Quick play pick, precompute winnable seeds offline and store them
  as a small list, so nothing is solved on her phone.
- **Scoring:** cards left in the power deck, plus 1 per unused reserve card. A loss still shows how
  many guests she cracked.
- **Solve button:** plays the solver's line to the end and records the game as revealed.
- **Hints:** the house cat nudges toward a good next card, taken from the solver's line.

**Open questions**

- [ ] Power reserve on by default, or as an easy level?
- [ ] Keep 4 columns, or 3 with adjusted deck maths?
- [ ] Allies (king abilities) always on, or a harder variant?
- [ ] Top discard playable as an easy-mode rule?
- [ ] Standalone only at first, or a clue game in the mystery from the start?
- [ ] Its name in our theme.
