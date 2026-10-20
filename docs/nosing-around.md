# Nosing around (maths board game): design

Status: designed with the owner on 2026-10-21, not built. The name is a working title.

A snakes-and-ladders game played on the floor plan. She follows the house cat through every room;
squares ask mental-maths questions; the last square is a numbers puzzle that opens a lock and gives
the clues. It is the "long" minigame and can carry more clues than the others.

## The board

- **The board is the floor plan.** Each floor plan cell is split into an N×N block of squares, so the
  house keeps its shape and rooms. The path runs boustrophedon (left to right, then right to left, row
  by row) from the front door (square 1) to the last square, passing through every room.
- **Split by level:** easy 1×1 with one die; medium and hard 2×2 with two dice. At 360px, 2×2 on the
  6-wide manor is 12 squares across (about 27px). That is fine: she never taps the board, only the dice
  and the number pad, which keep the 44px rule. 3×3 is too small.
- Works for any house built by `houseFromLayout`, including the two-storey houses later (stairs become
  the big ladder).

## A turn

1. She rolls. The roll comes from the game's seed plus the turn number, so a reload can't re-roll and
   the same case always plays the same rolls.
2. The cat moves. Passing over a square does nothing; landing on it triggers it.
3. If it's a question square, she answers on an in-app number pad (never the phone keyboard). On a wrong
   answer the cat shows the working.

## Squares

| Square | Right answer | Wrong answer |
|---|---|---|
| Ladder foot (obstacle) | The cat takes the shortcut forward | Walks on, no loss |
| Snake head (obstacle) | Stays put | Slides back; the obstacle is cleared for the rest of the run |
| Plain obstacle | A bonus for the lock | Walks on, no bonus |
| Search (one per room) | Finds a clue now | The clue waits for the lock |
| "The cat found something" | A free bonus, no question | (no question) |
| Plain | Nothing | |

- **Snakes:** before answering, the question shows where a slip would take the cat. The square it slides
  to doesn't trigger (no chains). Each snake can trigger at most once, so the run always ends.
- **Ladders and snakes are cat things, and content.** Ladders: along the bookshelves, the dumbwaiter, the
  cat flap, behind the walls, the banister. Snakes: chased by the dog, the cook's broom, chasing a mouse,
  a ball of wool, knocking over a vase. Each house's content says which can go in which room; the
  generator places them to fit. Drawn as a paw-print trail (ladder) and a loose strand of red wool
  trailing back (snake), which fades once used.
- **Bonuses** (names are content): extra steps; a spare try at the lock; a torch (shows one number
  she won't need); a note from the cat (one free step of the lock's working); a re-roll (the new roll
  still comes from the seed).
- Optional choice per question: pick one of two cards, a short sum or a harder one for a better bonus.

## The lock (last square)

- A numbers puzzle: make the target from six numbers with + − × ÷ (Countdown style; don't use that
  name in the UI). What's locked is content, picked per case: a safe, a suspect's phone, a writing desk.
- The generator checks that the target can be reached with **no bonuses**, so a bad run is harder, never
  impossible. Bonuses only make it easier.
- Opening it gives the main clue (1–2) plus any search clues still waiting. **Every clue is guaranteed**;
  right answers only get them sooner.

## Levels

- **Easy:** add and subtract up to 100, times tables, minutes on a clock; 1×1 board, one die, few or no
  snakes; lock with a small target.
- **Medium:** two-digit by one-digit, change from a bill, simple percentages, 24-hour times; 2×2, two dice.
- **Hard:** several steps, fractions of amounts, times worked backwards; 2×2, two dice, more and longer
  snakes; bigger target.
- Questions are dressed as household facts (clocks, the larder, train times, bills); templates are
  content. Every answer is a whole number in the level's range.
- No timers.

## House rules this must keep

- Puzzle first: the answers are numbers, never names. Solve button (in-app `Dialog`) moves the cat to
  the end, opens the lock, gives every clue, recorded as `revealed`.
- Hints from the cat: break the sum down, then three choices, then the answer. Pure `…Hint()` with a
  test that following hints always wins. Save the hint count.
- Same ref = same case: board, rolls, questions and lock all from the seed; only her answers are saved.
- Joins on its own seed stream after the draw (copy `boardSlot` / `TAROT_SHARE`), Play level roll last
  in `PLAY_ROLLED`, so existing cases don't change. Golden snapshot must stay the same.
- Carries more clues than other games: search squares 2–4 plus the lock 1–2 (each game holds at most 7);
  in a case it can stand in for two shorter games. Decide how that fits `clueShares` / `playShares`.

## Checks for `check-cases`

- Every level: a run takes a sensible number of turns (e.g. 6–10 easy, 15–20 medium and hard), even
  when every snake is answered wrong (worst case = sum of snake lengths), and passes at least a set
  number of question squares.
- Every lock target is reachable with no bonuses.
- Every question's answer is a whole number in its level's range.
- Every room has its search square; ladders and snakes only sit in rooms their content allows.

## Open questions for the build session

- Exact turn ranges and how many ladders/snakes per level (needs experiments).
- Does it go in the rotation as a stand-in (like the board and tarot), and at what share?
- Pick-your-card: in or out for the first build?
- How the lock's six numbers and target scale per level.
