# Face to face: questioning the accused (campaign)

Settled design, 2026-10-21. Campaign only for now; Quick and preset cases keep their finale as it is.

## What she sees

- **She accuses any time** (as in `docs/exploration-mode.md`: one guess per round, the "your clues still
  point at 3 people" warning, midnight forces it). She picks who and the weapon, as now, from the Accuse
  tab or the map.
- **Then the accused is questioned.** The hard-case finale questioning (her casebook is the evidence)
  opens with the guest she named in the chair. She asks up to 6 questions and can present clues against
  an answer, or say their story holds.
- **No strikes, no clues.** The verdict was fixed when she accused; the questioning only plays it out.
  Wrong evidence gets a retort ("That doesn't contradict anything."), Solve shows the lie (recorded as
  `revealed`). It unlocks no clues. A "Skip to the verdict" link is always there.
- **Endings:**

  | Accused | In the questioning | Then |
  |---|---|---|
  | Innocent | Every answer is true; nothing she presents works. When she stops, a rotating line: "It all lines up. Maybe they're innocent." | The next-murder scene: they are the next body |
  | Killer, right weapon | One answer is a lie; she catches it with her clues. A rotating confession. | Case closed |
  | Killer, wrong weapon | She catches the lie. A rotating dodge: "Fine, I was there. But you'll never pin that on me." | **The round ends.** With nothing to hold them on, she lets them go; a seeded innocent guest (not a decoy) is the next body. It uses up one of her 3 guesses. |

- The innocent and killer scenes look the same until the last line (same number of answers, same
  buttons), so the questioning never gives the verdict away early. Not that it could change it.

## Rules

- **The accused always answers.** Today `buildInterrogation` picks the speaker at random; this needs a
  fixed speaker option.
- **Only the killer lies.** An innocent's questioning has no lie: 6 true answers.
- **The lie never names the weapon.** Filter weapon-holding lies, the same way true answers already
  skip `suspect-room` and `suspect-item`.
- **Evidence is the clues she has found so far.** She may accuse early with few clues. If none of them
  disproves any lie (prefer pairs, then one clue, as `finaleSetup` does), the killer cracks: a
  confession line with no lie to catch.
- **Own seed stream** (for example `<round seed>-face-<guest>`), built from the round and her found
  clues. Rounds, the golden snapshot and saves don't change; no storage bump for this part.
- **Built in the case worker** (`caseJobs.ts`, behind the Shuffling overlay): the finale search runs
  the solver over up to 60 candidate lies with 7 guests.
- Closing lines (innocent, confession, dodge, retort) are content in `src/content/talk.ts`, picked by a
  seeded index, never `Math.random()`. Placeholders are fine until the theme content session.

## The engine change: a wrong weapon ends the round

Today the right person with the wrong weapon costs nothing (`src/engine/campaign.ts`,
`src/game/campaign.ts` verdict `wrong-weapon`). New rule: it ends the round like a wrong guess, and the
next body is a seeded pick among the innocent guests who are not decoys. `campaignRound` currently
assumes every victim is someone she accused; it needs a "killed while the killer walked free" victim.
Old saves have no such victim, so their rounds must rebuild the same. Generator change: run
`check-cases`, and `check-cases:full` once in the main session; `check-cases` must walk the new
path too. Update the accuse hint copy (a wrong weapon now costs a round) and the campaign rule in
`src/engine/CLAUDE.md`.

## Pieces

1. Engine: the wrong-weapon rule and victim pick (`campaign.ts`, tests, check-cases paths). Main session.
2. Engine: `buildInterrogation` options (fixed speaker, no lie, no weapon lies, crack fallback) and a
   `face` case job. Implementer.
3. UI: the questioning after the accusation, endings, then the existing next-body / escaped / case
   closed flow; both accuse paths (tab and map). Implementer, then `npm run e2e` and a browser-check.
4. Content: placeholder line pools. Implementer.

Open for later: whether Quick and preset hard cases move their finale to the accusation too.
