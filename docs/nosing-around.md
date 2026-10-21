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
  still comes from the seed); close enough (the lock accepts an answer within 10% more of the target).
- Optional choice per question: pick one of two cards, a short sum or a harder one for a better bonus.

## Encounters

Every question square is an **encounter**: a small self-contained puzzle with tiered outcomes. A plain
maths question is the simplest one. Each encounter kind is its own pure module in `src/games/` (seeded,
with its own hint function and tests), so any of them can later be promoted to a game of its own.

- **Plain question:** right or wrong, as in the squares table.
- **Speed round:** quick sums against a sand timer (about 60s); it ends when time runs out. Tiers set
  the reward (e.g. 5 right: one bonus; 8: two; 12: two plus extra steps; scaled by level). Below the
  lowest tier she just walks on: the timer only sizes the reward, never costs her anything. The only
  timer in the game. No cat hints during the round.
- **The dog (card battle, a snake encounter):** the cat has a seeded deck of number and operator cards;
  the dog has a health dial. Each round: **attack**, make the largest number she can from her hand,
  that's the damage; **defend**, the dog rolls an attack number and she makes one that meets or beats
  it, and hitting it **exactly** gives her an extra card next turn. Win: the dog runs off, with a good
  reward. Lose: the cat is chased back down the snake, and the dog is gone for the rest of the run (so
  the worst case stays bounded). Hints: the cat suggests a good combination, then the best one. Trains
  biggest-product thinking (attack) and hitting a target (defend, practice for the lock).
- **Estimate:** "how many jars on the larder shelf?"; the closer, the bigger the reward.
- **Balance the scales:** pick weights so both pans match.
- **Pattern:** the next number in a sequence (the clock chimes).

Which encounter sits on which square is decided by the generator per level; the turn-range checks
must account for each encounter's worst case.

## The lock (last square)

- A numbers puzzle: make the target from six numbers with + − × ÷ (Countdown style; don't use that
  name in the UI). What's locked is content, picked per case: a safe, a suspect's phone, a writing desk.
- The generator checks that the target can be reached with **no bonuses**, so a bad run is harder, never
  impossible. Bonuses only make it easier.
- **Close enough:** each of these bonuses widens what the lock accepts by 10% of the target, stacking,
  capped at 30% (target 347: one bonus accepts 313–381). Her answer must use at least two numbers. When
  she's close but not exact, the cat has a bout of inspiration first: it shows an exact way to reach the
  target, step by step, ending on the real number. Only then does the lock open, since a lock needs the
  exact number. That counts as `won`. Solve still shows the exact answer as `revealed`.
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
- No timers, except the speed round (where the timer only sizes the reward).

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
