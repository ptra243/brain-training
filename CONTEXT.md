# Brain Training

Glossary for the game and its two shells. Words only; how things are built lives in the docs and
folder `CLAUDE.md` files.

## Shells

- **Current shell**: the game the address with no hash opens today (Home, the case screen, tabs).
- **Shelf**: the new shell on `#shelf`, a cosy library. It plays the same cases with the same save
  as the current shell, so a case started in one continues in the other.
- **Library**: the Shelf's home screen, one bookcase with Quick play, Campaign and Your record.
- **Casebook**: the current shell's case screen only. Not the Library, not the puzzle book.
- **Look**: her choice of which shell the address with no hash opens, Classic (the current shell) or
  Shelf. Picked from the options menu in either shell; not part of a case's save.

## A case on the Shelf

- **Puzzle book**: the case's printed text, in sections: Case, Map, Puzzles, then Answer. The same
  four in every Quick case.
- **Notebook**: her working, kept apart from the puzzle book: found clues, the finish, and the
  subject pages ("You", the clock and where she is, only in the campaign). It peeks up from the bottom of the screen.
- **Finish**: the last puzzle before she answers, in the notebook tab where her working comes
  together: the logic **Grid**, or the **Jigsaw** (her clues as pieces to fit) in a Jigsaw-finish
  case. A Quick start case has one or the other; a Play case (Quick play) has both, as the classic
  Casebook does.
- **Subject page**: the notebook page for one guest or one weapon: where she placed it, the clues
  naming it, and (in a campaign) what they said. Quick play has no talk: a questioning is a puzzle,
  reached from the Find a clue page like any other. Tapping it on the map opens it.
- **Ribbon**: a bookmark for one puzzle book section. Pulled down from the top edge; tapping one turns
  to that section.
- **Plate**: a full-bleed printed page with no book border: the map.
- **Opening**: the first page of the Case section (the victim, the blurb). Read once.
- **Find a clue page** (page 3): the choose-your-own-adventure page that offers each puzzle as a line
  of story ("turn to page 24"). Her hub once the opening is read.
- **Puzzle page**: one minigame printed in the puzzle book, with the cat's hint and Solve.
- **Campaign book**: one book for a campaign, a **chapter** per round. Its hub is the **room page**
  (where she is, who and what is there). Ribbons: Room, Plan, Answer.
- **Face-to-face spread**: her portrait and a guest's on the table, for talking and after an
  accusation.
- **Deck**: the game cards she picks from before a case is dealt.
- **Guest book**: her record; one entry per finished run, signed by the killer when she solved it.
- **Won page**: the puzzle page once won or solved, with the clue written in.

## Card Capture

A solo card game she can lose (`docs/card-capture.md`).

- **Parlour games**: the Shelf book of games that stand on their own, outside the cases. Not the
  puzzle book.
- **Deal**: one game of Card Capture, from one deal code. Not a run (a run is a campaign).
- **Hand**: the cards she holds; kept between turns.
- **House**: the enemy's face-down cards, left of the hall.
- **Hall**: the 4 face-up cards she can capture or bury. Cards enter on the left and move right
  toward the door. Not the shop, not a room.
- **Door**: the enemy's discard pile, right of the hall. A face card at the door loses the game.
- **Face card**: one of the 10 guest cards (values 11 to 14), drawn as the guest's portrait. Not a
  standard J, Q, K or A.
- **Discard**: putting cards from her hand on her own discard pile. Free and safe.
- **Sacrifice**: putting her cards at the door. Unsafe: a face card there loses.
- **Capture**: taking a hall card with same-suit cards that add up to its value or more. Not "buy".
- **Bury**: sacrificing 2 cards to put a hall card back under the house.
- **Give way**: letting the rightmost hall card take a card from her hand; both go to the door.
