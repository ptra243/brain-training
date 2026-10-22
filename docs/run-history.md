# Run history

Settled 2026-10-22. One record of finished Quick play cases, and one of finished campaigns.
The current case and the current campaign stay as they are. Cases do not change, so the
storage prefix stays.

## What is recorded

A run is written once, when it ends.

- **Quick play:** she solves the case (both parts of the accusation right).
- **Campaign:** she catches the killer, or the killer gets away.

Starting a new case or campaign over an unfinished one leaves no row. Looking back at a
finished one does not add a second row. The one case or campaign already finished on this
phone is recorded the next time the app loads it. Anything replaced before that is gone.

## What a row keeps

A short snapshot. The case is still rebuilt from its code; the row does not copy her moves.

| | Quick play | Campaign |
|---|---|---|
| Which one | the case ref (title and code come from it) | the campaign ref |
| When | the local calendar date (`YYYY-MM-DD`) | the same |
| Accusations | how many she made | which round it ended on (1, 2, or 3); wrong-weapon tries |
| How it ended | solved; the first accusation is `accusations === 1` | `caught` or `escaped` |
| Hints | one total | one total, summed across the rounds |
| Solved for her | puzzles she pressed Solve on | the same, across the rounds she played |

An escaped campaign ended on round 3. A catch on round 1 has no wrong person. Wrong people
are `round - 1` on a catch, and 3 when the killer got away.

A wrong-weapon try is an accusation of the killer with the other weapon. `correct === 1` is
not enough: that is also the right weapon and the wrong person. Count it from the round's
killer and weapon at the time the row is written.

## Hints

One press of the Hint button, summed from the counters already in the save:

- the map and grid (`gridHints.count`)
- cats, crossword, sudoku, tarot, and nosing (`data.hints`)
- the case board puzzle and the end board (`hintCount`)

Wordle, word search, and questioning have no hint button. The joker's free peek stays out
of the total. Solve is not a hint.

`won` is a puzzle she solved. `revealed` is a puzzle solved for her. A puzzle still open
is neither.

## What she reads

One copy function, tested, shared by the closing card, the row, and the totals. Sentence case.

**Hints.** "You asked for 4 hints." One is "1 hint." Zero is "You didn't ask for a hint."

**Puzzles**, as a second sentence:

- One or more solved for her: "1 puzzle was solved for you." / "N puzzles were solved for you."
- None solved for her, at least one solved herself, and every puzzle in the case finished:
  "You solved every puzzle yourself."
- None solved for her, at least one solved herself, and some puzzles still unplayed:
  "You solved the puzzles you played yourself."
- None finished: no second sentence.

On a campaign, a puzzle she never had the budget to open counts as unplayed, so the third
sentence is the usual one.

**Closing card.** Quick play already says "Solved on the first accusation" or "Solved in
3 accusations." The campaign cards already say she caught the killer, or that the killer
got away. Under that line, add the hint sentence and the puzzle sentence.

**Campaign row heading.** Rounds are 9pm, midnight, and 3am, all one night, so the row
uses the clock: "You caught the killer at 9pm." / "at midnight." / "at 3am." Escaped:
"The killer got away." When she named the killer with the wrong weapon at least once:
"1 wrong weapon, which cost nothing." / "2 wrong weapons, which cost nothing."

## Your record

One screen, "Your record", opened by a button of that name on the Quick play card and on
the Campaign card. Reopening the app lands on home, as with the other side screens.

Two sections. Each has a totals sentence, then the rows, newest first. An empty section
says "No finished cases yet." or "No finished campaigns yet."

**Quick totals.** "12 cases solved. 4 on the first accusation. You asked for 37 hints, and
5 puzzles were solved for you." Leave out "on the first accusation" when that count is 0.
The hint and puzzle sentences follow the rules above, joined into this line.

**A Quick row.** The case title. Then "22 Oct · Solved on the first accusation" (or
"Solved in 3 accusations"). Then the hint and puzzle sentences.

**Campaign totals.** "3 campaigns. You caught the killer twice, once at 9pm. The killer
got away once." Name a 9pm catch only when there was one: "once at 9pm", "both at 9pm",
or "2 of them at 9pm". Then the hint and puzzle sentences for the stored totals.

**A campaign row.** "Medium campaign K7QF2". Then "22 Oct · You caught the killer at
midnight." Then the hint and puzzle sentences, and the wrong-weapon sentence when the
count is at least 1.

The list keeps the newest 30 of each. Totals are stored beside the list and keep growing
when a row drops off.

## Save

A new `history` key beside `quick` and `campaign`, same prefix. A damaged blob is dropped
and the game still runs. The error screen's clear leaves `history` in place.

Each finished save carries an optional `historyId`. Write the id onto the save first, then
append the row if that id is not already in the list, so a reload cannot record the run
twice. A save from before this feature has no id: the boot that loads a finished case
mints one. Quick play needs the case's game list; a campaign needs each round's killer
and weapon. Both are available once the saved case has been built.

## Left out

Time played. A per-puzzle hint list. Grid marks, wrong guesses inside a puzzle, and
questioning strikes. The joker peek.

## Build order

One layer per brief. The snapshot's tests are the contract for the later layers.

1. **Snapshot** (`src/game/runRecord.ts`, tests beside it). Pure. From a finished Quick
   save and its case, or a finished campaign and its rounds: the row, the hint total,
   `won` / `revealed`, wrong-weapon tries, and the sentences. No React.
2. **Save** (`storage.ts`, `saveGuards.ts`, the boot in `App.tsx`). The `history` key,
   guards, `historyId`, totals, the cap of 30, append-once, and backfill of the one
   finished save already on the phone. A malformed-history test. `clearSaves` still
   removes only `quick`, `campaign`, and `screen`. Add the key to the saves bullet in
   `src/game/CLAUDE.md`.
3. **Screens.** The closing line on the Quick verdict (`AccusePanel`) and on the
   campaign caught and got-away cards (`CampaignView`). The record screen, and the
   button on `Home` and `CampaignCard`. `npm run e2e` for the button, an empty record,
   and a finished case showing the line. Then a `browser-check` at 360px.
