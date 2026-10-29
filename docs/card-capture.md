# Card Capture: idea

The owner's idea for a card game, added 2026-10-29: a small solo deck builder played with a standard
deck. The first build's design is settled (grilled 2026-10-29); only the 360px layout is left, as a
mockup at the start of the build.

**Not a normal minigame.** She can play herself into a loss, and normal case minigames must always be
winnable (the Solve button rule in `CLAUDE.md`). Settled 2026-10-29: the first build is **a standalone
game for fun** on the Shelf, with no clue reward and no solver (the rules are self-contained and a
loss is allowed). A **hard-mode campaign where she can lose**, in which games like this unlock clues,
may come later; the guest faces and the Easter egg below belong to it.

**First build:** a standard 52-card deck plus 2 jokers, standard suits. Each deal is a seeded shuffle
(same code, same deal), any shuffle, not filtered for winnability. Every turn ends with exactly one
action: capture, bury or give way (no passing). The 4 face-up cards are **the hall**.

## Owner's rules

**Values.** Number cards are face value. J = 11, Q = 12, K = 13, A = 14. Jokers have no suit or colour.

**Set-up.** Every card of 4 or lower (the 2s, 3s and 4s) plus the 2 jokers make the player deck
(14 cards). Everything else (5 to A, 36 cards) is shuffled into the enemy deck.

**Two discard piles.** Her own discard pile is safe for any card. The enemy discard (the door) is
where cards she **sacrifices** go, and a face card there loses.

**Win.** The enemy deck and the hall are both empty: every card was captured, or sacrificed with no
face card reaching the door. Buried cards come back, so every face card must be captured in the end.

**Lose.** A face card (J, Q, K or A) lands in the enemy discard, however it gets there.

**Each turn has four phases:**

1. **Enemy.** The hall is a row of 4 face-up cards, laid out left to right: the enemy deck (the
   house) on the left, the hall, then the enemy discard (the door) on the right. If the hall has fewer
   than 4, slide the cards right and reveal new ones on the left until there are 4. The first enemy
   phase just deals 4. So the rightmost card is always the one that has waited longest.
2. **Discard.** She keeps her hand between turns. Here she may discard any of it, all or none, onto
   her own discard pile, free and safe (face cards included).
3. **Draw.** Draw up to 4 cards.
4. **Capture.** Capture any one hall card with cards from her hand of the same suit whose total is
   equal to or greater than its value (several cards may add up; a joker and the card it copies both
   count, so joker + 4♠ is 8♠). A joker copies the suit and value of another card in hand
   (never the other joker). The captured card goes
   onto her discard pile, and so do the cards she used to capture it. When her draw pile runs out
   she shuffles her discard pile into a new draw pile, so the cards she captured can now be used to
   capture others. That is how her deck grows strong enough for the face cards.

The hall never pushes a card out by itself. Every action takes exactly one card out of it, so each
enemy phase finds 3 cards and reveals 1.

Instead of capturing, she can sacrifice in one of two ways:

- **Bury.** Sacrifice 2 cards from her hand to put any hall card on the bottom of the enemy deck. The 2 sacrificed
  cards go to the enemy discard, so sacrificing a face card loses. Thins her deck, and pushes a face
  card back to deal with later.
- **Give way.** Let the rightmost hall card capture a card she picks from her hand. Both go to the enemy discard,
  so giving way loses if the rightmost card is a face card, or if the card it takes is a face card
  she captured earlier.

**A dead end is possible.** Free discarding lets her throw away a bad hand and draw again, so a hand
of 4 face cards is not stuck on its own. It is a dead end when nothing she can draw captures, she
holds fewer than 2 number cards to bury with, and the rightmost hall card is a face card: every move
then sends a face card to the door. Real losses are part of the game.

## Later: the guests as face cards (campaign version)

The owner's idea (2026-10-29): use the guests' portraits as the face cards. A standard deck has 16
(J, Q, K, A in four suits) but there are 10 guests, so the enemy deck would swap the 16 for 10 guest
cards: 5 to 10 in four suits (24) plus 10 guests is 34 cards, near the 36 it has now.
Each guest gets a suit and a value (11 to 14) in `src/content/`, never in code. A first guess at
values, by standing in the house:

| Value | Guests |
|---|---|
| 14 | The Host, the Hostess |
| 13 | The Financier, the Detective, the Uncle |
| 12 | The Conjurer, the Elder heir, the Younger heir |
| 11 | The Butler, the Housekeeper |

Alternative: in a hard-mode campaign, only the guests seated at that case are face cards (7, or 8
with the victim), so each case's deck has a different cast.

In the campaign the killer and a few decoys show up more often (say 2 cards each, 1 for everyone
else), so the game feels haunted by the guilty. The deck is then a clue in itself: she can count
portraits. So the killer and the decoys must show up exactly as often as each other, making the deck
say "one of these" and never single out the killer.

The owner's answer (2026-10-29): the campaign already guarantees that the first night's clues narrow
it to 2 or 3 suspects (the killer and the 1 or 2 decoys of the night-1 lineup, `docs/second-killer.md`).
So the boosted guests are exactly that lineup, and the deck tells her nothing the first night doesn't.
It's an Easter egg, not a clue: a quiet nod for her to notice, never pointed out in the copy. If she
plays it before winning those clues she may spot the shortlist early; that's fine (owner, 2026-10-29),
since telling the killer from the decoys still takes the clues.

The 2 jokers carry her own portrait and the cat's (both already drawn, `docs/portraits.md` "The
player and the cat"; the cat's coat follows the case's cat). They copy any card in her hand: she and
the cat are the two who can stand in for anyone.

The story fits too: a captured guest has come over to her side, and a guest reaching the enemy
discard has slipped away from the house, which loses the game.

## On the Shelf (settled 2026-10-29)

- **Its home:** a new book on the bookcase, **Parlour games**, that holds games not (yet) in the
  cases. Card Capture is the first.
- **Its page:** before starting, the book turns to the game's own page: the rules in short and her
  last 5 **deals** (one game from one deal code; "run" stays the campaign's word). Each shows the date,
  won or lost, face cards captured out of 16, and **Replay** (same code, same deal). Its history
  stays out of Your record and the guest book.
- **The table:** one full-bleed page like the map, green baize: house, hall and door across the top,
  her hand at the bottom.
- **A turn on screen:** the enemy phase plays itself with a short slide. She marks cards to discard,
  then taps Draw (discard and draw are one step; nothing marked keeps her hand). Then she picks cards
  and taps a hall card to capture or bury it, or taps Give way.
- **Saving:** her moves are saved and the deal rebuilt from its code, so she can leave and come back.
  One game at a time; a new deal mid-game asks "Are you sure?" (`Dialog`).
- **No undo** once an action is confirmed; anything before that can change.
- **Losing moves warn first:** a sacrifice or give way that sends a face card to the door asks in a
  `Dialog` ("This sends the K♥ to the door. You'll lose."). No strategy hints from the cat.
- **The dog deck builder** stays a separate idea; decide after she has played both.

## To settle

- Later, for a campaign version: tarot suits, the guest faces, what losing costs her, and whether
  other losable games join it.
- Phone layout at 360px: a 4-card hall, a 4-card hand, the two piles and the enemy deck count.
