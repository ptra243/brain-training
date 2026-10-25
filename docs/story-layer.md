# Story layer: making the campaign play like a whodunnit film

Status: proposed 2026-10-25 from a review of the campaign; nothing built. Each idea below is a
`docs/next-sessions.md` entry. Goal: the campaign should feel like a replayable visual novel that plays
like a whodunnit film, with the puzzles as the detective work.

## What already works (keep it)
- **Three rounds are three acts.** A wrong accusation makes the accused the next body, so stakes rise and
  her mistakes cost something.
- **The decoy guarantee is the drawing-room scene.** Each round before the last ends with 2 or 3 people
  still possible, so the accusation is a real call.
- **Face to face is the confrontation**, and innocent and guilty look alike until the last line.
- **Atmosphere**: the clock to midnight, walking the house, the rain-and-lightning scene, guests stuck
  overnight.
- **Rule 5** keeps it fair and replayable. Every idea here keeps it: anything shown before the verdict is
  blind to the killer, and only text after the verdict reads it.

## Gaps, in priority order
1. **Campaign opening** (`docs/campaign-opening.md`, settled) plus a dinner prologue (below).
2. **The summation ending** (below). No engine change.
3. **Everyone has a secret** (`docs/secrets.md`): the "aha" at the reveal.
4. **Act breaks between rounds** (below). No engine change.
5. **Weapons that matter** (`docs/weapons.md`, for "Hunting the weapon" in `docs/next-sessions.md`): one
   weapon all night (today it's rolled each round), each body a sign that narrows it, and a story per weapon.
6. **Clue moments** (below), then Confidants (`docs/theme-draft.md`) for replay.

## The summation ending
Poirot walks through how it happened; today the ending is a rotating confession line.
- After a correct accusation (and after "got away"), replay the night on the explore map: each guest's
  counter slides to the room they were really in, one line per guest ("The Housekeeper was in the
  pantry with nothing in hand"), the killer last, in the scene room with the weapon.
- Each step cites the clue that proved it when she had one ("You knew this: the cat found..."), else
  "You never found this out". The truth is all in the `Case` (`Solution`), so it is fully generated.
- In a campaign, one short summation per round she played, the final round in full.
- With secrets built, each innocent's step adds their clearing line and the killer's adds the motive.
- "Got away" gets the same replay, so she learns how she could have solved it. Reduced motion: still
  frames, tap to step.
- Settle: does Quick play get it too (probably yes, it only reads the solved case), length at 7 guests,
  skip button.

## Act breaks between rounds
The next-murder scene is the same every time. Add a short scene after it, before the next round:
- The survivors around the new body, 3 or 4 lines. One names the guest she accused ("You pointed at
  {victim}. Now look."), one says "{victim} must have known something", and the cat notices something.
- Lines picked by each guest's mood for the new round (`moodFor`) and the victim, never the killer.
  A cold guest blames her; a warm one comforts her.
- Content: a pool of blame, grief and suspicion lines with `{victim}` and `{other}`, in
  `src/content/talk.ts`.

## Dinner prologue
Before the body (the campaign opening starts at the body): 4 or 5 lines at dinner, the establishing shot.
- Two or three seated relationship pairs (`docs/talk-threads.md` part C) needle each other; the victim
  says one line, so she has met them before they die; thunder ends it.
- Uses pair thread beat 1 where it exists, so no new content model. Skippable with the opening.

## Clue moments
Clues read like a logic grid ("X was not in the library").
- When a puzzle unlocks a clue, show it first as a one-line scene: testimony in the speaker's voice with
  their portrait; evidence through the cat with a physical detail ("a wet glove in the conservatory"). The
  casebook keeps the plain statement for the grid.
- Needs per-clue-type line templates in `wording.ts` style with the same facts, and the fact check to
  confirm a moment never says more or less than its clue.

## Replay
- Seeds give new puzzles, but 6-line pools repeat within a few campaigns: grow the pools first
  (Theme content session).
- Confidants (5 chapters per guest across campaigns) are the main replay hook.
- An endings gallery in the run record ("4 of 10 killers' motives seen"), once secrets and endings exist.
