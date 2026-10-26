# The second killer (campaign, medium and hard): build plan

Design settled with the owner, 2026-10-23. Nothing is built yet.

## Idea

Night 1 ends with a lineup: the killer and the 1 or 2 decoys are rounded up in
one room ("I've ruled out everyone else except the people in this room").
She accuses. Whatever she answers, a second murder happens at midnight while
she is with the lineup, so the lineup is alibied. The second killer is one of
the guests she cleared at 9pm. The final accusation names both killers.

## Round up the suspects (the gate before the accusation)

On medium and hard, night 1 does not open on the accuse screen. It opens on
**Round up the suspects**: she moves guest counters into the lineup room, and
cannot go on until the room holds exactly the guests her clues still allow
(the killer and the decoys, which the round build already guarantees, whatever
puzzles she chose). Only then does the accuse screen open, and it lists just
the room: person and weapon. So the lineup is something she deduced and
knows, which the midnight alibi depends on.

- Pure deduction, no penalty: a wrong round-up costs nothing. A failed try says
  only that someone in the room is ruled out or someone is missing, never who
  (decided 2026-10-23: one line of feedback). If both are true it names the
  ruled-out guest first, so she removes before she adds.
- She can never get stuck: after 3 failed tries the cat nudges, and Solve
  (with the in-app "Are you sure?") fills the room and is recorded `revealed`.
- The "possible guests only" starting option does not apply to the round-up
  (it would hand her the answer); it still applies to the accuse screen.
- Easy keeps today's accuse screen.

## Rules

- **Difficulty.** Easy is the campaign as it is today (one killer, no lineup
  twist). Medium and hard get the twist. A new `twist` flag on `CampaignRef`
  is set only for newly started medium and hard campaigns; refs without it
  play and build exactly as before (like a missing `houseId`). Existing saves
  and the golden snapshot do not change.
- **Right guess on the lineup.** The first killer is caught, but the second
  murder still happens. A wrong guess leaves the first killer free and the
  second murder happens too. Either way night 2 starts the same.
- **Second victim.** A cleared guest (not in the lineup), seeded. The second
  killer is another cleared guest. The 12am field is the cleared guests minus
  the victim: 3 or 4 people (7 seated, a lineup of 2 or 3, one more victim).
- **Night 1 is unchanged** apart from the lineup scene at the end. No round 1
  puzzle is reopened.
- **Night 2 offers three labelled puzzles**, and she plays any `budget` of
  them (medium 2, hard 1; the word game stays free):

  | Puzzle | Aimed at | Effect |
  |---|---|---|
  | A | 9pm | Alone, picks the first killer out of the lineup |
  | B | 12am | Halves the 3 or 4 possible second killers |
  | C | 12am | B and C together pin the second killer |

  A's clues are testimony given looking back ("I saw X leave the study at ten
  past nine") or things the cats found moved. Every clue is true and a witness
  never vouches for themselves.
- **What a budget buys.** Medium: A plus one 12am puzzle (first killer nailed,
  second 1 in 2), or B plus C (second nailed, first 1 in 2 or 3). Hard: one
  puzzle, so one killer half or fully solved and a straight guess on the other.
- **Solve button** works as everywhere: it reveals both answers and is recorded
  as `revealed`.

## Generator checks (`roundProblems`, walked by `check-cases`)

1. The night 1 clues plus A leave exactly one lineup guest; A alone is enough.
2. B and C together leave exactly one second killer; neither alone does.
3. No clue rules a guest out early or has a witness vouching for themselves.
4. A's clues never reveal the 12am killer, nor B's and C's the 9pm one.
5. Every wrong-guess and right-guess path reaches a buildable night 2.

Own seed stream for the second killer, victim and night 2 (`-twist` seed text),
never inside the existing draw. Per `src/engine/CLAUDE.md`, the golden
snapshot must still pass unchanged; add twist refs to it on purpose, in the
same commit as any storage prefix bump.

## Holes found 2026-10-23, to settle with the owner before building

1. **A night 1 accusation is a free probe.** If she learns right or wrong, a wrong
   guess in a lineup of 2 eliminates one for free, and a right one makes puzzle A
   pointless. Proposal: in twist mode night 1 has no accusation; the round-up is
   its puzzle, the midnight murder follows, and the one accusation is the final one.
2. **Puzzle A is the best pick every time.** Medium A+B wins about 50%, B+C about
   33-50%; hard likewise. The tradeoff collapses. Balance it with a bot sweep in
   `check-cases`: the budget options must win within a few percent of each other.
   Knob (owner, 2026-10-23): the 12am puzzles may carry more clues per game than A
   (`clueShares` already allows 1-7 a game). Rough sums say it flips hard to favour B
   and strengthens A+B on medium, so set the counts per difficulty by the sweep, not by feel.
3. **The ending is undefined.** Fail state, tries at the final accusation, whether
   one killer right counts, and whether weapons are asked at all (hard cannot pin
   two killers and two weapons with 1 puzzle; proposal: free clues settle weapons).
4. Smaller: a second scene room and 12am layout for the second murder; save state
   for the round-up, tries and per-night puzzles; talk threads for the second
   victim and killer; run history and the closing card for two killers.

## Jumping between times (UI)

Every casebook view that is about where people were (floor plan, logic grids,
case board jigsaw, clue list) belongs to one night, so in twist mode there is a
**time switcher**: one segmented control, 9pm | 12am, pinned at the top of the
casebook and shared by all its tabs (44px high, fits 360px wide).

- Switching shows that night's plan, grid, board and clues, read-only for the
  night that is over (`ExploreMap` already has an "earlier night: you can look,
  but not walk about" mode; reuse it).
- A clue always lands in its own night. Winning a puzzle jumps to the night its
  clues belong to ("added to 9pm"), and the other time shows a dot while it holds
  a clue she has not looked at.
- The lineup is carried into 12am as free facts (the lineup is crossed off the
  12am grid, the victim is shown), so the midnight view starts already narrowed.
- The final accusation has two sections, one per night, each showing its own
  night's casebook beside it.
- Add a `#dev` preview for the switcher and the two-night casebook (see
  `src/dev/CLAUDE.md`), and a scenario that loads into night 2.

## Open points for later

- Wording of the lineup scene and the midnight scene (text, from her point of
  view, with the house cat's hint).
- Whether the run history and closing card count two killers (see
  `docs/run-history.md`).
- Talk and relationships: the second victim and second killer need threads
  (see `docs/relationships.md`).
