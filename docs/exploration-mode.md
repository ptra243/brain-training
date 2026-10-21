# Exploration mode: settled design and build plan

Status: designed 2026-10-21, nothing built. Reverses "She doesn't move around the house" in
`docs/talk-threads.md`: she is the detective, walking the house between murders. Bigger generated houses
are shelved (see Later).

## Settled
- **Built on the campaign.** The campaign already guarantees what each round needs: before the last round,
  the free clues plus any one puzzle leave exactly the killer and 1 or 2 innocent decoys (no clue rules a
  decoy out), and the last round pins down killer and weapon. Exploration is how she plays a round.
- **Quick play is completely unchanged** ("Play cases", `c.sceneGiven`): same manor, same cases (golden
  untouched), same drag-and-drop map, same screens. Everything below applies to the campaign only.
- **Same house, same cases.** The campaign keeps the current manor and the engine builds the same rounds,
  so this is a UI change only: no storage bump, and it can ship mid-campaign.
- **A round opens with a body.** The body is found, the scene is marked on the map, and the clock starts in
  the evening. The Clues tab starts the round with only what she knows (earlier rounds' clues stay; they
  are still true) and fills as she earns clues.
- **The map is the main screen.** Map is the first tab and fills most of the screen. A marker shows the
  room she is in. Tapping another room moves her there (the marker slides). Moving costs no time.
- **Rooms with a puzzle get a mark.** A stylised exclamation mark on the map over each room that still has
  an unplayed puzzle (an object or a guest's questioning). It goes once the room's puzzles are done.
- **The room list replaces the drag tray.** Below the map, everything in her room:
  - *Something to look at*: flavour only (`houseDetails` plus per-room lines). Shows a line. No time.
  - *An object with a puzzle*: one of the round's minigames, placed in a room and named from that room's
    words (Wordle answers already come from room `objects`, crossword and word search from `things`).
    Finishing or revealing it moves the clock on.
  - *A person*: a guest in the room. Opens their screen: tarot card art as the portrait, then the talk
    interface from `SuspectSheet` (greeting, pips, "Anything else?"), and "Question them" when they have a
    questioning game (moves the clock on like any puzzle). Talking costs no time. With no beat ready, the
    guest has nothing more to say for now and she can read back what they've told her (the talk log).
  - Victims leave the room lists and their questioning games go with them.
- **Guests stay put all round.** Each guest is in one room for the whole round, picked on its own seeded
  stream and unrelated to the truth (they move between rounds). Weapons are never listed in rooms.
  Nothing seen on the map is a clue until sightings are built (see Later).
- **The clock is the round's puzzle budget.** Every round starts at the same time (9pm, a constant to tune)
  and each finished or revealed puzzle moves the clock on by (minutes from the start to midnight) / (the
  round's puzzle budget), so the last puzzle she can play strikes midnight. Budget 4 means 45 minutes a
  puzzle (9:45, 10:30, 11:15, midnight); budget 3 means an hour. The top of the round shows just the
  current time with help text beside it: "10:30 (2 games left)". After each puzzle a card shows the new
  time the same way and closes itself after about 1.5 s. The time is worked out from games done; the only
  new saved move is her room (`progress.at`).
- **One guess per round, any time.** She can accuse whenever she likes, however much time is left. A right
  guess solves the case. A wrong one jumps to the next murder (as now, the accused is the next body). While
  her clues still allow more than one killer, the Accuse tab says so before she confirms ("Your clues
  still point at 3 people. Guess now?"). At midnight without a guess, the round is out of time: the Accuse
  tab opens and the round can't end until she names someone, then the scene plays. Until she does, she can
  still use the Clues, Grid and Jigsaw tabs to cross-reference. The map shows but does nothing: tapping a
  room doesn't move her, and the room list (things, puzzles, people) is greyed out. The campaign's rounds
  stay as the engine builds them. In the last round the guess is final.
- **The next murder.** A full-screen scene: a window with rain, a lightning bolt, the room lit by the
  flash, a clock at twelve, a jagged speech bubble screaming. Only the bolt and the flash animate; at most
  3 flashes a second; with reduced motion, the still picture only. Tap to continue into the next round.
- **The campaign gets its own map.** A new explore map component replaces `MapPanel` in campaign rounds
  only; `MapPanel`, its drag-and-drop, map hints and the map/grid link in `state.ts` stay for Quick play.
  Campaign rounds keep Grid and Jigsaw for deduction, with the cat's grid hints. Earlier rounds (looking
  back) show the explore map read-only.

## Later
### Bigger houses, generated per seed (shelved)
About 10x12 squares (about 32 px each at 360 px) split into 9 to 12 contiguous rooms, room types from a
pool of about 16 in `src/content/`, on their own seed stream. A round still uses at most 5 rooms. Campaign
only. Needs first: the house becomes an input to the case instead of `content.house` (about ten files,
Grid cases too; a refactor that must keep every case identical), a bottom-sheet room list (the map leaves
about 200 px), a bigger flavour pool per room type, and a campaign storage bump timed between campaigns.

### Sightings as clues (proposals, not settled)
Guests then move during the round and their positions become part of the truth, with `check-cases`
proving rounds stay fair (still 2 or 3 suspects at midnight) and not trivial.
- **One room an hour.** Guests move at most one room per hour, so "she saw X in the Study at 11pm" means
  X was in the Study or next door at the murder.
- **The missing object.** A weapon seen in a room at 9pm and gone at 10pm was taken by someone in that
  room then: a holder clue from two looks.
- **Absence.** "Nobody passed the hall after eleven" or "Y was never in the east wing tonight".
- Sightings are earned by walking, not puzzles: decide whether walking then needs to cost time.

## Build order
1. **Exploration in campaign rounds**: explore map with marker and puzzle marks, room list, person screen
   with portrait and "nothing more to say", moving, the time header and card, accuse any time with the
   warning, the midnight lock, Map first. Pure `roomContents(c, round)` in TS with tests; React stays
   thin. e2e for the flow at 360 px.
2. **The next-murder scene** (SVG and CSS only) between rounds.
3. Later: bigger houses, sightings as clues, walking through doors, `visit`-triggered beats, talk part B.
