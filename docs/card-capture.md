# Card Capture: idea

Exploratory, not designed. The owner's idea for a card game, added 2026-10-29: a small solo deck
builder played with a standard deck.

**Not a normal minigame.** She can play herself into a loss, and normal case minigames must always be
winnable (the Solve button rule in `CLAUDE.md`). Games she can lose go in one of two places, not yet
decided:

- **A standalone game for fun**, outside the cases, with no clue reward.
- **A hard-mode campaign where she can lose**, in which games like this one do unlock clues.

## Owner's rules

**Values.** Number cards are face value. J = 11, Q = 12, K = 13, A = 14. Jokers have no suit or colour.

**Set-up.** Every card of 4 or lower (the 2s, 3s and 4s) plus the 2 jokers make the player deck
(14 cards). Everything else (5 to A, 36 cards) is shuffled into the enemy deck.

**Win.** The enemy deck and the shop are both empty.

**Lose.** A face card (J, Q, K or A) lands in the enemy capture pile (the enemy discard), however it
gets there.

**Each turn has four phases:**

1. **Enemy.** The shop is a row of 4 face-up cards. If it has fewer than 4, slide the cards one slot to
   the right and reveal new ones from the enemy deck until there are 4.
2. **Discard.** Discard as many cards from hand as you like.
3. **Draw.** Draw up to 4 cards.
4. **Capture.** Capture one shop card with cards of the same suit whose total is equal to or greater
   than its value. A joker copies the suit and value of another card in hand. The captured card goes
   onto her discard pile, and so do the cards she used to capture it. When her draw pile runs out
   she shuffles her discard pile into a new draw pile, so the cards she captured can now be used to
   capture others. That is how her deck grows strong enough for the face cards.

The shop never pushes a card out by itself. Every action takes exactly one card out of it, so each
enemy phase finds 3 cards and reveals 1.

Instead of capturing, she can sacrifice in one of two ways:

- **Bury.** Sacrifice 2 cards to put a shop card on the bottom of the enemy deck. The 2 sacrificed
  cards go to the enemy discard, so sacrificing a face card loses. Thins her deck, and pushes a face
  card back to deal with later.
- **Give way.** Let the rightmost shop card capture a card she picks from her hand. Both go to the enemy discard,
  so giving way loses if the rightmost card is a face card, or if the card it takes is one she
  captured earlier.

**A dead end is possible.** If her hand is 4 face cards, she can't capture anything, and the rightmost
shop card is a face card, every move loses: a bury sacrifices 2 of her face cards, and giving way sends
the rightmost face card to the enemy discard. Real losses are part of the game.

## To settle

- How often a seeded deal reaches a dead end, and whether the cat should warn her a turn or two
  before (for example, before she captures too many face cards with too few number cards left).
- Is it solvable from a seeded deal, and how often? A seed sweep should show what share of deals can
  be won and how long a game runs, before picking difficulty settings.
- Standalone game or hard-mode campaign (see the top). For a campaign: what losing costs her (retry
  with a new deal, or the clue stays locked?), and whether other losable games join it. For a
  standalone game: where it lives in the app, and whether it keeps a win/loss record.
- Theme: standard suits, or the tarot minor arcana (wands, cups, swords, pentacles; page, knight,
  queen, king) to fit the hidden tarot layer, as the dog fight does in `docs/nosing-around.md`.
- How it relates to the dog deck builder (`docs/dog-deck-builder.md`): two separate games, or one
  replaces the other.
- Phone layout at 360px: a 4-card shop, a 4-card hand, the two piles and the enemy deck count.
