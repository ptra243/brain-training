# Nosing around (maths board game): design

Status: designed with the owner on 2026-10-21; first build (plain questions, speed round, lock) merged
on 2026-10-22. Next: the number grid and the dog (see "Next build"). The name is a working title.

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
2. The roll always stops first (the cat has not moved), so the screen can show the square the cat
   would land on. She taps Move to go. A re-roll bonus, if she holds one, can swap the roll here.
3. The cat moves. Passing over a square does nothing; landing on it triggers it.
4. If it's a question square, she answers on an in-app number pad (never the phone keyboard). On a wrong
   answer the cat shows the working.

## Squares

| Square | Right answer | Wrong answer |
|---|---|---|
| Ladder foot (obstacle) | The cat takes the shortcut forward | Walks on, no loss |
| Snake head (obstacle) | Stays put | Slides back; the obstacle is cleared for the rest of the run |
| Plain obstacle | A bonus for the lock | Back 2 squares (not below the first); the square it lands on does not trigger, and the obstacle stays open |
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
- **The dog (card battle, a snake encounter):** replaced by "Next build: the dog" below (playing cards,
  lives, beat or double the dog's number). Win: the dog runs off, with a good reward. Lose: the cat is
  chased back down the snake, and the dog is gone for the rest of the run (so the worst case stays
  bounded).
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

- Every level: a run takes a sensible number of turns (6–10 easy, 10–16 medium and hard), even
  when every snake is answered wrong (worst case = sum of snake lengths), and passes at least a set
  number of question squares.
- Every lock target is reachable with no bonuses.
- Every question's answer is a whole number in its level's range.
- Every room has its search square; ladders and snakes only sit in rooms their content allows.

## Decided in the build session (2026-10-21)

- **Where it appears:** a Play stand-in like tarot, on its own seed (`${seed}-nosing-game`, after the
  tarot stand-in), `NOSING_SHARE = 0.2`, only for a slot whose share is 3 or more clues; it takes that
  slot's clues. Pickable in Choose games as letter `N`, added at the end of `PICK_ORDER`; its level roll
  goes last in `PLAY_ROLLED`. Not in presets or the campaign yet. Existing cases don't change.
- **Clue split:** share 1 → lock 1 + search 0; 2 → 1 + 1; 3 → 1 + 2; 4 → 2 + 2; 5 → 2 + 3; 6 → 2 + 4; 7 → 2 + 5. Shares 1 and 2 only happen to a picked Nosing around; the Quick play stand-in needs a share of 3 or more. With 0 search clues every room's search square gives a bonus; the lock room is still a clue room (never the scene room), so `clueRooms` is the search-clue rooms plus the lock room.
- **The path winds** (this replaces the row-by-row path above): a seeded self-avoiding walk over the
  board's squares that visits every room and lingers in the clue rooms. One search square per search
  clue, each in its own clue room; the lock is the last square, in a clue room. Clue rooms are never the
  scene room. Rooms with no clue are passed through and get a search square that gives a bonus.
- **First build:** plain questions and the speed round. Pick-your-card, the dog, estimate, scales and
  pattern come later.
- **Lock tiers** (all exact with no bonuses, checked by a solver; large = 25, 50, 75, 100):

  | Level | Numbers | Target | Rule |
  |---|---|---|---|
  | Easy | six from 1–10 | 20–99 | reachable with 3 numbers or fewer |
  | Medium | five from 1–10 + one large | 100–299 | |
  | Hard | four from 1–10 + two large | 300–699 | the shortest exact way needs 4 numbers or more |

## Board tuning (prototype, 2000 cases per level)

The path is a randomised depth-first walk that fills the current room first (fewest onward moves
first, random ties), then steps into a room not yet entered. It starts on an edge square, has a budget
of 3000 steps, and must visit every room. The board takes up to 600 attempts (`-0`, `-1`, …). An
attempt fails when the path fails, when the lock's room is the scene room, or when any check below
fails. Every one of the 6000 cases built, at about 3.5ms each in Node.

| Level | Squares | Dice | Path | Ladders (gain) | Snakes (drop) | Obstacles + speed rounds | Turns | Questions she meets |
|---|---|---|---|---|---|---|---|---|
| Easy | 1×1 | 1 | 28–33 | 2 (3–6) | 1 (3–6) | 5 + 1 | 6–10 | at least 3 |
| Medium | 2×2 | 2 | 80–90 | 3 (5–9) | 2 (4–8) | 25 + 2 (4 cat finds) | 10–16 | at least 3 |
| Hard | 2×2 | 2 | 80–90 | 3 (5–9) | 4 (5–9) | 25 + 2 (4 cat finds) | 10–16 | at least 3 |

- One search square per room, plus a question square on every ladder foot and snake head. Ladder
  tops, snake tails, the first square and the last square are plain squares.
- **The turn and question checks are exact.** They search every mix of right and wrong answers, with
  the rolls fixed by seed and turn: the fewest turns, the most turns and the fewest question squares
  landed on. Bonuses (extra steps, a re-roll) only shorten a run, so they are left out of the upper
  bound. Hard makes up its difficulty with harder questions and more snakes; its turns come out the same.
- Prototype: `nosing-path.ts` in the session scratchpad. The implementer rebuilds it from this section.

## Build spec

Decisions for the first build, filling the gaps above. Code names are suggestions; keep them unless a
better fit turns up in the code.

### Modules

| File | What it is |
|---|---|
| `src/games/mentalMaths.ts` | Question kinds per level: `question(seed, level, kind?)` returns `{ kind, text, answer, working: string[], choices: [number, number, number] }`. Choices hold the answer plus two near misses, shuffled by seed. `questionHint(q, step)`: step 0 gives the first line of working, step 1 the three choices, step 2 the answer. |
| `src/content/nosingQuestions.ts` | Household wording per question kind, with placeholders (`{a}`, `{b}`), several per kind. |
| `src/games/speedRound.ts` | `speedQuestions(seed, level)` gives 40 quick sums, `speedReward(level, right)` gives the tier reward, `SPEED_SECONDS = 60`. |
| `src/games/lock.ts` | The lock: `buildLock(seed, level)`, `solveLock(numbers, target)` (exhaustive; returns the shortest exact way), `lockAccepts(lock, value, closeEnoughCount)`, `lockHint`. |
| `src/games/nosingBoard.ts` | Board, path, ladders, snakes, square kinds, rolls and the exact bounds (`nosingBounds`). |
| `src/content/nosing.ts` | Cat ladders and snakes, each with the room ids it may sit in (or "any"); bonus names and copy; lock objects; "the cat found something" lines; search lines. |
| `src/games/nosing.ts` | The run: `nosingInitial()`, `nosingStep(puzzle, state, move)`, `nosingView(puzzle, state)`, `nosingSolve`, `nosingHint`. The state is only her moves; the view is replayed from them. |

### Question kinds

- **Easy:** add or subtract within 100, times tables up to 10×10, minutes on a clock (for example
  "quarter past to ten to: how many minutes").
- **Medium:** two-digit × one-digit, change from a bill, simple percentages (10%, 25%, 50% of a round
  amount), 24-hour times (the gap in minutes, or 3pm as 15).
- **Hard:** two- and three-step sums, fractions of amounts (3/4 of 120), times worked backwards
  ("the train arrives at 14:10 after 85 minutes: when did it leave, as hhmm").
- Every answer is a whole number from 0 to 9999. A clock answer is a number of minutes, or `hhmm` as
  one number.

### Squares and bonuses

- **Kinds of square:** plain, ladder foot, snake head, obstacle, search (one per room), speed round,
  cat find. Counts are in the tuning table. Cat finds: easy 2, medium and hard 6, on plain squares.
- **Bonuses:** `steps` moves the cat 3 squares on; landing that way triggers nothing. `spareTry` adds
  one lock try. `torch` shows one number that the stored way doesn't use (the stored way uses at most
  5 numbers). `note` makes the first step of the stored way for her. `reroll` lets her swap a roll she
  has just made, once; the new roll comes from `${seed}-reroll-${turn}`, and it is her choice, so it
  sits outside the turn bounds. `closeEnough` widens the lock by 10% of the target, stacking, capped at 30%.
- **Who gets which bonus:** each obstacle, cat find and non-clue search square gets its bonus from the
  seed when the board is built, so she can see what's on offer before she answers. Speed round tiers
  (right answers → reward): easy 4 → 1 bonus, 6 → 2, 9 → 2 plus `steps`; medium and hard 5 → 1,
  8 → 2, 12 → 2 plus `steps`. Tier bonuses are drawn from the seed.
- A snake's question shows where a slip would send the cat. Each snake triggers at most once and then
  fades. A ladder taken stays drawn.

### The lock

(First build. The next build moves it onto the number grid; see "Next build".)

- She builds a number in steps: pick two of the tiles she has, then + − × ÷. The result becomes a new
  tile, and the two she used are spent. Only whole, positive results are allowed (÷ only when it
  divides exactly; − only when the result is above 0). "Undo" takes back a step. "Try this number"
  submits the newest tile, which must be built from at least two numbers.
- She has 3 tries, plus one for each `spareTry`. A wrong try costs one; an exact or close-enough
  try opens the lock. With close enough, the cat's bout of inspiration plays the stored exact way
  first, and that is `won`. If she runs out of tries, the cat shows the way and the lock opens as
  `revealed`, so she is never stuck.
- `lockHint`: step 0 says which two tiles to combine first, step 1 makes that step for her, step 2
  shows the whole way. Following hints always opens the lock.

### Clues

- The game's clues split as in "Clue split". Search clues go to the clue rooms in path order. A
  search clue unlocks the moment she answers its square right; otherwise it waits for the lock.
  Opening the lock gives the lock clues plus every waiting clue.
- Solve (in-app `Dialog`) moves the cat to the end, opens the lock, gives every clue and is recorded
  as `revealed`. A run won using hints is still `won`. Save the hint count.

### Saved data

Her moves in order: `{ t: 'roll' }` (the first roll of a turn stops; the second moves), `{ t: 'reroll' }`, `{ t: 'answer', value }`,
`{ t: 'speed', right }`, lock steps `{ t: 'combine', a, b, op }`, `{ t: 'undo' }`, `{ t: 'try' }`,
plus `hints` and `solved?: 'revealed'`. If she reloads in the middle of a speed round, the round starts
again with the same questions.

## Next build: the number grid and the dog

Built 2026-10-22 (the grid, the lock on it, the dog fight); the speed round below is still to do.

Talked through with the owner on 2026-10-22, before she had played the first build. The grid is one
shared piece: the lock moves onto it, and the dog fight is played on it. Later the cat-vs-dog game can
grow into a deck builder of its own (see the "dog card battle" entry in `docs/next-sessions.md`); this
build is the side game, with fixed decks and no building.

### The number grid

Replaces the lock's "pick two tiles, then an operator" steps. Rows take away the need for brackets.

```text
        [ 25 ][ × ][ 4 ]              = 100
  [ + ] [ 7 ][ × ][ 3 ][ − ][ 1 ]     =  20  → 120
  [ × ] [ 2 ]                         =   2  → 240
```

- She places number cards and operator cards into slots by tap or drag. A row is number, operator,
  number, operator, number: **at most 3 numbers a row**, so five 44px slots plus the row-operator slot
  fit 360px. Up to 3 rows.
- **Inside a row**, × and ÷ go before + and −, as in real maths. Each row shows its total live at its
  right edge.
- **Between rows**, the operator in the slot left of a row joins it to the running total from the top
  down: `(row 1 op row 2) op row 3`. The running total shows beside each row, so she always sees where
  she stands. The answer is the last running total.
- Only whole, positive results count (÷ only when exact, − only above 0), checked for each row and each
  running total; a slot that breaks the rule shows red and the total waits.
- Cards she doesn't place are fine. The answer must use at least two numbers (as the lock today).
- **Operators:** the lock gives a fixed palette of + − × ÷ that never runs out. The dog fight deals
  operator cards that are spent when placed, the row-operator slots included.
- **Solver:** a pure module (suggested `src/games/numberGrid.ts`) that evaluates a grid and lists every
  value reachable *in the grid's shape* from a hand (numbers plus an operator palette or operator
  cards), with one way for each. The lock generator checks its targets with it, so every lock is still
  exact with no bonuses **on the grid**; the dog uses it to find her best, the dog's plays and the hints.
- **Saves:** her lock moves change shape (place and clear a slot instead of `combine`), so old saves of
  a lock in progress need a storage prefix bump or a reading of the old moves. Lock numbers and targets
  may change where a target can't be made in the grid's shape: dump some cases before and after.
- Lock hints become: step 0 fills the first row of a stored way, step 1 fills all but the last row,
  step 2 the whole way.

### The dog

A fight on a snake head, played with tarot cards: the cat and the dog each have **3 lives**. Turns alternate, the cat attacks
first.

- **Cards: the tarot minor arcana** (cups, wands, swords, pentacles; faces already in
  `src/content/tarotArt.ts`), small numbers, so it feels like quick arithmetic rather than the lock.
  Easy: 40 cards (ace = 1, 2–10, no court cards). Medium and hard: all 56 (page = 11, knight = 12,
  queen = 13, king = 14). The major arcana stay out of this game; they're saved for the deck builder.
  Each side has its own seeded shuffle; a used deck reshuffles from the next seed. Card ids and values
  come from content, never named in code.
- **Operator deck**, separate, weighted toward +: 5 +, 3 ×, 1 −, 1 ÷ (easy: the ÷ becomes a +).
  Its own seeded shuffle.
- **Each turn** she draws 5 number cards and 3 operator cards and builds one number on the grid.
  Placed cards are spent; unplaced cards go back.
- **Attack:** the dog plays its number first (shown as its play, e.g. "9 × 4 + 2 = 38"). Meet or beat
  it: the dog loses 1 life. Reach **double** it: the dog loses 2.
- **Defend:** the dog plays its number. Meet or beat it, or the cat loses a life. Hit it **exactly**:
  one extra number card next turn.
- **The dog's play:** it has its own hand (5 numbers, 3 operators from the same decks' rules) and picks
  at random (seeded) from its plays that are **neither its best nor its worst**, and only from plays
  she can answer with her current hand:
  - attack: at most her best; about a third of the time at most half her best, so a double is there;
  - defend: at most her best; prefer one she can hit exactly about half the time.
  If no play qualifies, the dog's hand is redealt from the next seed (`-1`, `-2`, …). So a weak hand
  meets a weak dog, and every round can be won.
- **Hints** (the cat): attack: whether a double is possible, then a play that beats it, then the best
  play. Defend: whether an exact hit is possible, then a play that meets it, then the exact play when
  there is one. Following hints wins every round, so it always wins the fight; test that.
- **Win:** the dog runs off, and she gets a good reward (two bonuses, drawn from the seed). **Lose:** the
  cat goes down the snake and the dog is gone for the run. Losing never costs more than the snake, so
  the turn bounds hold.
- Her moves only (placements, end turn); dog plays and draws are replayed from the seed. Pure module
  (suggested `src/games/dogFight.ts`) so it can be promoted to a minigame of its own later.

### Speed round: fill in the blank

Also from 2026-10-22, the owner's idea; can go in the same build or right after.

- No keypad: each question shows a sum with a blank and **4 cards** to tap: `7 × _ = 56`, `_ − 9 = 14`,
  and sometimes the operator, `7 _ 8 = 56`.
- Wrong cards are near misses: one table off (7×7 for 7×8), ±10, or the result of the wrong operation.
- A wrong tap costs 3 seconds off the timer, so tapping at random can't climb the tiers.
- Plain board questions could use 4 cards the same way and retire `NumberPad`; decide when building.

### Settled (2026-10-22)

- **One dog per run on every level**, on a snake head picked from the seed; the dog replaces that
  snake's question. On easy it is the only snake, with the 40-card deck and no ÷.
- **The dog stops her passing.** Landing only on the square met it in about 1 run in 6, so any move onto
  or past the dog's square stops there for the fight. Win: she carries on to where the move would have
  taken her. Lose: she slides down that snake. The turn bounds model the stop.
- **Both start on 3 lives.** A first try with the dog on 2 ended most fights in one turn: her best is
  usually a multiply-everything grid, so a play from the dog's middle range was nearly always doubleable.
  So on attack the dog now plays in strict tiers. A third of the time it plays at most half her best, so
  a double is there. Otherwise it plays above half her best and at most her best, so it can only be
  beaten. It redeals rather than cross tiers. The operator deck may lose a × to keep fights about
  arithmetic, decided by tuning runs (see `dogCards.ts`).
- **Old saves:** no prefix bump (that would wipe the campaign). On load, a nosing save holding old
  `combine` lock moves keeps its board moves and drops its lock moves, so she starts the lock again.
- **Speed round fill-in-the-blank** comes after the dog, as its own brief.
- Smaller calls made while splitting the build:
  - Cards go in by tap: tap a card, then a slot. Tapping a filled slot clears it. Drag can come later.
  - Each row's total and running total sit on a small line under the row, so the six slots keep 44px
    at 360px.
  - Lock `note` fills the first row of the stored way, never the whole way. For a one-row way it places
    the first two numbers and their op.
  - An attack that falls short costs nothing; only a failed defence costs the cat a life.
  - The dog's reward is two bonuses drawn from the seed, never `steps`, so the turn bounds are unchanged
    (a win keeps the cat on the snake head, a loss is the slip).

## To check on the phone

- The board shrinks to a 3.5rem strip during questions; check it still reads.
- The fullest question screen fits 360 × 780 with only about 6px to spare.
