# The Housekeeper's hour (dispatch minigame): content catalogue

Status: design reference, nothing built in the app. Worked out with the owner 2026-11-01 to 2026-11-03
against a standalone prototype (claude.ai artifact "The Housekeeper's Desk", private to the owner).
This doc lists everything that can come up in the game and what can appear with what, so a case
generator (and content writers) can build it for any house and cast.

Related: `docs/story.md` (the evening, the cast, the storm), `docs/secrets.md` and
`docs/relationships.md` (story secrets, rolled blind), `docs/visual-theme.md` (the #shelf look),
`docs/portraits.md`, `src/content/index.ts` and `src/content/extraRooms.ts` (rooms, guests, weapons).

## The game in one paragraph

Only in runs where the Housekeeper is in the cast. It is the Housekeeper's testimony about the hour
before the murder. In a flashback she runs the house from the kitchen: every fifteen minutes a few
requests come in, she plans which of three hired staff goes to each, and watches them walk off and back
on the floor plan. Each comes back with a picture of the room and one line about what they noticed.
At 8:45 the staff finish. At 8:55 nobody is free, so she does one errand herself, and sees the
**key clue** with her own eyes. At 9:00 the murder happens. Back in the present she gives her statement
by filling in blanks with picture choices. The key clue always comes out; memory decides the score.

## Rules that shape all content

1. **Every clue is true** (CLAUDE.md). Anything drawn or said is consistent with the case.
2. **Nothing depends on the killer** (rule 5, `docs/theme-draft.md`). Requests, hunches, staff
   observations and anecdotes are rolled from the case seed and guest ids, never from `Case.murderer`.
   Only facts the engine already exposes as clues (placements, item locations) carry case information.
3. **Pictures carry what she must remember; text never does.** One short line per screen. A detail she
   is quizzed on is always visible in a picture.
4. **Only quiz what was signalled or chosen** (owner, 2026-11-03): the key clue, hunches she followed up
   (ticked in red pencil, "I'll remember that."), her own choices (who she sent where), and the one
   unmarked change between two visits to a room (the vanishing object). Nothing else is quizzed; it goes
   in the notebook as bonus notes.
5. **She can never get stuck.** The cat crosses out one wrong choice per blank; Solve fills the statement
   in and records `revealed`.
6. **No guest gender** except the Host, Hostess, Uncle, the heirs (daughter/son) and the Fixer
   (`docs/story.md`). The statement is first person ("I sent…", "I saw…"), so the Housekeeper is never
   "she" in copy. The prototype's "Mrs Hartley" is a placeholder; the app uses "the Housekeeper".
7. **Content is data** in `src/content/`; code never names a room, guest or weapon.

## Timeline (campaign round 1: murder at 9:00)

| Time | What happens |
|---|---|
| 8:00 | Round 1 opens: 2–3 requests |
| 8:15 | Round 2: 3–4 requests, one impatient guest |
| 8:30 | Round 3: the generator plus 1–2 requests, plus leftovers |
| 8:45 | The hired staff finish and leave. Whoever is at the generator is still out |
| 8:55 | The Housekeeper's own errand: the key clue |
| 9:00 | The murder (lights out if the generator was switched off) |
| 9:10 | Lights back: the generator was switched off by hand (or she goes out and finds it so) |
| Present | Her statement, played as one of the round's puzzles (9:00 to midnight on the campaign clock) |

Later rounds (midnight, 3am) are open: the staff have gone, so the game would need another frame.

## People

### The hired staff (never suspects)

They are agency staff for the weekend, not guests, so they never appear in the cast, the grid or the
accusation. They never carry case facts, only what they noticed.

| Staff (placeholder name) | Job | Good fit for | Notices | Icon |
|---|---|---|---|---|
| Sam | Bar | Drinks of any kind, food trays | **Gossip**: what people said, who argued, who asked what | speech bubble |
| Priya | Housekeeping | Rooms, beds, linen, chargers, tidying, fetching things | **Detail**: papers, objects out of place, labels | eye |
| Tom | Handyman | Fires, fuses, doors, pipes, the generator, heavy things, outdoors | **Physical**: wet or muddy things, forced locks, open windows, wear and tear | wrench |

Names, faces and pictures are content. The jobs and the three kinds of noticing are the system.

### Guests (`src/content/index.ts`, display names from `docs/story.md`)

What each guest plausibly asks for, what they carry in pictures, and what a hunch about them can ask.
The Housekeeper is the player in this game and never makes requests. The victim makes requests like
anyone else (they are alive until 9:00).

| Guest (id) | Typical requests | Props in pictures | Hunch hooks (rolled blind) |
|---|---|---|---|
| Host (`host`) | Study ready for the speech, a whisky, the fire lit, reading glasses, do not disturb | Speech notes, whisky glass, reading glasses | What's on the desk, who has been in to see them |
| Hostess (`hostess`) | Tea, flowers moved, a shawl fetched, a room aired, too cold | Teacup, shawl, flowers | What people say about them, where they've been |
| Fixer (`butler`) | Phone line checked, a document printed, the car brought round, a quiet room | Folder, car keys, phone | Papers they carry, who they're meeting |
| Lawyer (`financier`) | Somewhere private to call, paper and pens, the printer, black coffee | Briefcase, documents, phone | What's in the briefcase, the will |
| Uncle (`uncle`) | Brandy, the fire built up, old photo albums, an umbrella for a walk | Brandy glass, pipe, umbrella | Where they've been, what people say about the shares |
| Elder heir (`elder-heir`) | Black coffee, a laptop charger, the study after the Host, a printer | Laptop, files, coffee | Where she has been (the factory), what she's reading |
| Younger heir (`younger-heir`) | Snacks, the wifi, a phone charger, a drink, a lift | Phone, crisps, bottle | What people say about him, who he's talking to |
| Investor (`conjurer`) | A phone signal, sparkling water, a charger, a quiet room for a call | Phone, glass, tablet | Phone calls, papers about the deal |
| Detective (`detective`) | Tea, a newspaper, "just a few questions", the guest list | Notebook, magnifying glass, teacup | Where they've been snooping, what they've found |

Rule: a guest's own requests can use their stake (`docs/story.md`); a hunch's wording can use their
story secret (`docs/secrets.md`), which is rolled blind. Neither may depend on the killer.

## Rooms

All rooms from `src/content/index.ts` (every house) and `src/content/extraRooms.ts` (bigger houses).
The picture of a room is a printed plate in the room's tint with a few flat furniture shapes, people as
cut-out standees, and props as line icons. Furniture comes from the room's `things` list where possible.

| Room (id) | Furniture to draw | Weather feature | Display spots for weapons | Requests that start here |
|---|---|---|---|---|
| Kitchen (`kitchen`) | Stove, kettle, cupboard, table | Back door | Knife block, wrench under the sink, poison in a high cupboard | None: it's the base |
| Library (`library`) | Bookcase, armchair, fireplace, ladder | Window | Candlestick or vase on the mantel | Coffee or tea, fire, candles, fetch a book |
| Hall (`hall`) | Staircase, hatstand, mirror, telephone table | Front door | Vase or candlestick on the hall table, rope on the banister | Umbrella or coat, phone line, door banging, car keys |
| Study (`study`) | Bureau, desk, blotter, fireplace | Terrace door | Candlestick on the mantel, knife on the bureau (paper knife), poison in the cabinet | Drinks, fire, tidy for a meeting, paper and ink, glasses |
| Conservatory (`conservatory`) | Plants, fountain, bench, flowerpots | Glass walls | Rope coiled by the plants, wrench by the fountain pipes, poison (weedkiller) on a shelf, vase of lilies | Too hot or cold, fountain leaking, tea, flowers for a room |
| Bedroom (`bedroom`) | Bed, wardrobe, dresser, curtains | Window | Rope as a curtain tie-back, poison as a sleeping draught by the bed, candlestick or vase on the dresser | Hot water bottle, blankets, radiator, nightcap, charger, curtains stuck |
| Dining room (`dining`) | Table, sideboard, chairs | Window | Candlestick on the table, knife in the carving set, vase on the sideboard | Clear the table, more wine, a broken chair |
| Pantry (`pantry`) | Shelves, jars, flour sacks | None | Poison (rat poison) on the top shelf, knife on the bread board | Fetch something: biscuits, a lemon, ice |
| Cloakroom (`cloakroom`) | Hooks, coats, boots, bench | Side door | Rope coiled on a hook, wrench in the toolbox | Find my coat or wellies, the boot dryer |
| Games room (`games`) | Billiard table, chess table, piano | Window | Candlestick on the piano, vase on the mantel | Drinks, the billiard light, find the cards or chess pieces |
| Outside: generator shed | Shed, generator | Rain | None | The generator |

Rules:
- Requests only come from rooms in the case's house (`Case.houseId`).
- A weapon only appears on display in a room that has a display spot for it (table above).
- A room plate shows at most one display weapon at a time, plus the room's ordinary furniture.
- Decoration must never look like a weapon that isn't in the content (no swords: the prototype's
  sword was a stand-in and should become one of the six weapons or plain decor).

## Weapons (`src/content/index.ts`)

| Weapon (id) | Picture | Natural display spots | Missing looks like |
|---|---|---|---|
| Knife (`knife`) | Carving or paper knife | Kitchen block, dining carving set, study bureau, pantry board | An empty slot in the block, a gap in the carving set |
| Rope (`rope`) | Coiled rope or cord | Hall banister, conservatory, bedroom tie-back, cloakroom hook | A curtain hanging loose, an empty hook |
| Candlestick (`candlestick`) | Fancy brass candlestick | Library, study or games room mantel, dining table, hall table, dresser | A gap between the other mantel things |
| Wrench (`wrench`) | Pipe wrench | Kitchen sink, conservatory pipes, cloakroom toolbox | An empty space in the open toolbox |
| Poison bottle (`poison`) | Small labelled bottle | Pantry top shelf, conservatory shelf, bedside, study cabinet, kitchen cupboard | A ring in the dust where it stood |
| Vase (`vase`) | Tall vase | Hall table, dining sideboard, library mantel, conservatory, dresser | A water ring, flowers lying on the table |

## Requests

Each request is a card: the asker's face, the room, a picture of what's wanted, and two to four words.
`Fits` is which staff jobs count as a good fit; two jobs means either is right (owner, 2026-11-02).
Medium and Hard hide the job; Easy shows a job label.

| Request (picture: words) | Fits | Rooms | Who asks |
|---|---|---|---|
| cup: Black coffee | Bar | Library, study, dining, games | Lawyer, Elder heir, Investor, Detective |
| teacup: Tea | Bar | Library, conservatory, bedroom | Hostess, Detective |
| glass: A whisky / brandy | Bar | Study, library, games | Host, Uncle |
| bottle: More wine | Bar | Dining, games | Anyone |
| cup: Hot chocolate | Bar | Study, bedroom | Host, Younger heir |
| tray: Something to eat | Bar | Games, library, bedroom | Younger heir, Uncle |
| ice: Ice and lemons (fetched from the pantry) | Bar, Housekeeping | Any | Anyone |
| bulb: Lights flickering | Housekeeping (candles), Handyman (fuse) | Any | Anyone |
| snowflake: Freezing | Handyman (fire), Housekeeping (blankets) | Library, study, bedroom, conservatory | Hostess, Uncle, Younger heir |
| snowflake: Too cold to sleep | Housekeeping (hot water bottle), Handyman (radiator) | Bedroom | Anyone |
| fire: Fire lit | Handyman | Library, study, games | Host, Uncle |
| notes: Study ready for the speech | Handyman (fire), Housekeeping (tidy) | Study | Host |
| phone: Phone won't charge | Housekeeping (charger), Handyman (socket) | Bedroom, library | Younger heir, Investor, Elder heir |
| signal: No phone signal | Handyman | Hall, study | Investor, Lawyer, Fixer |
| umbrella: An umbrella | Handyman | Hall, cloakroom | Uncle, anyone going out |
| boots: My wellies | Housekeeping | Cloakroom | Anyone going out |
| door: Door banging | Handyman | Hall, conservatory, study (terrace) | Anyone |
| drop: A leak | Handyman (pipe), Housekeeping (bucket) | Conservatory, bedroom | Anyone |
| flowers: Flowers moved | Housekeeping | Conservatory to any room | Hostess |
| book: Fetch a book | Housekeeping | Library | Detective, Uncle |
| paper: Paper and pens | Housekeeping | Study, library | Lawyer, Fixer |
| printer: The printer | Handyman | Study | Lawyer, Elder heir, Fixer |
| plate: Clear the table | Housekeeping | Dining | Hostess |
| chair: A broken chair | Handyman | Dining, games | Anyone |
| cards: Find the cards | Housekeeping | Games | Investor, Younger heir |
| glasses: Reading glasses | (her own errand) | Study | Host |
| bolt: Check the generator | Handyman | Outside | Nobody (the lights dim) |

Rules:
- A round never has two requests from the same guest.
- A guest is in one room per round. A second request from them later may come from another room.
- The generator request comes in round 3 and keeps whoever goes out through the murder.
- One guest per evening is impatient: skip them and they do it themselves (no clue, a grumpy line).
- Unassigned requests carry over to the next round with a grumble; at 8:45 they are lost.
- Wrong fit: a funny anecdote, the job takes twice as long (that person misses the next round and
  reports a round late), and the staff member still notices their own kind of thing.

## What staff notice (bonus clues)

When a staff member comes back, the room picture shows who was there, with what, and one drawn detail
of their kind of noticing; their speech bubble points at it. These are **story flavour**, rolled from
the seed, the guest and the room, never from the killer. They go into the notebook, not the casebook,
and are not quizzed (except a hunch payoff).

| Kind | Templates (drawn detail → bubble) | Rooms it suits |
|---|---|---|
| Detail (Housekeeping) | Two envelopes on the desk → "FAMILY and BUYER"; a contract with a sticky note → "Sign tonight"; a second phone → "Not theirs"; a notebook hidden → "They hid it"; an open, empty safe → "Empty"; a letter in the bin → "Screwed up"; a guest list with names crossed out | Study, library, bedroom, dining |
| Gossip (Bar) | "{A} and {B} were arguing"; "{A} asked me who's on the guest list"; "{A} says it's going to a stranger"; "{A} asked how the generator works"; "{A} offered to buy {B}'s share"; "{A} said {B} has always been loyal" | Any room with two people, or one person who talks |
| Physical (Handyman) | Wet or muddy shoes by the fire; a forced latch; a window wide open; a cold chair; a worn track in the rug; dust on cuffs (factory cocoa dust); wellies already on | Any; weather features need a window or door |

Rules:
- A gossip line can only name guests in the case.
- A physical detail about a guest (wet shoes, mud) must not contradict a placement clue, since the
  engine's clues are about 9:00. A detail never places a guest in a room at 9:00.
- A detail that hints at a secret uses the guest's rolled secret (`docs/secrets.md`).
- A staff member never vouches for a guest's whereabouts at 9:00 (they have gone by then).

## Hunches

One per round, shown above the jobs: the guest's face and a short question. Following it means
sending the right kind of noticer to the job that guest asked for. The payoff is a red-pencil tick on
the picture and "I'll remember that.", and it is quizzed. Hunches are rolled blind, one guest per
round, never the same guest twice in an evening.

| Question (by kind) | Pays off with | Example payoff |
|---|---|---|
| "Where's {guest} been?" (physical) | Handyman | Red cocoa dust on their cuffs: they've been at the factory |
| "What are people saying about {guest}?" (gossip) | Bar | {guest} asked how to switch the generator off |
| "What's {guest} hiding?" (detail) | Housekeeping | An open, empty safe; a second phone; a letter |

Rules: the hunch's job must not be the obvious fit for the right noticer at least once an evening
(that's the trade-off), and a hunch payoff is never a case fact.

## The key clue (her own errand)

At 8:55 one request comes in when nobody is free; she goes herself. The picture is her own view, with
the clue in it and a red-pencil tick ("Take a good look before you go"). This is the game's one
guaranteed clue for the casebook (owner, 2026-11-02), delivered like any other minigame's clue.

| Errand | Where | What she sees (from the case's clues) |
|---|---|---|
| Reading glasses / a cup of tea for {guest} | Study, library, bedroom | Through the window or door: {suspect} in {room} (placement) |
| Turning down the beds | Bedroom corridor | {suspect} going into {room} (placement) |
| Locking the back door | Kitchen to garden | {suspect} outside / by {room} (placement) |
| Laying the breakfast table | Dining | {weapon} on display in {room}, or missing from it (item location) |

Rules: the errand's clue is one of the case's existing clues chosen by the engine (never by the killer),
so it is true by construction. The statement asks it with picture choices of the guests (or weapons).
A wrong answer gets "No… I remember now." and the clue is recorded anyway.

## The vanishing object

The one unmarked visual test (owner, 2026-11-03). A room visited twice shows the same display spot
with a weapon the first time and without it the second.

Rules:
- Only happens if two jobs in the evening go to the same room (the generator decides one round; the
  generator never counts). If she never goes back, it isn't asked and the ending hints "Something there
  might have changed."
- The weapon must be one the case allows to have left that room by 9:00: any weapon whose 9:00 room
  (if known from the solution) is not this room. It need not be the murder weapon (rule 5). On Hard it
  can be a red herring that turns up elsewhere.
- The display spot shows two or three other ordinary objects (clock, photo frame) so the gap isn't
  obvious; the statement offers those objects plus the weapon as picture choices.

## Funny anecdotes

Every request has one line per wrong-fit staff member, shown in red pencil and repeated (up to two) as
"I should mention:" asides in the statement. They're never quizzed. Patterns that work:
- The bar person treats a job like a drink: "opened it with a cocktail flourish", "brought it on a
  silver tray with a garnish", "filled the hot water bottle with mulled wine".
- The handyman treats it like a repair: "opened the brandy with a spanner", "brought a spirit level",
  "microwaved it in the trophy mug".
- Housekeeping treats it like tidying: "lit the fire with the paper they were still reading", "fanned
  the fire with the magazine", "made the hot chocolate with water".

Rules: anecdotes are about the staff, never about a guest's guilt; they may mention the guest asking.

## What can appear with what (summary)

- A guest appears at most once per round, in one room, and only in rooms of the case's house.
- The victim appears like anyone else before 9:00; nothing marks them.
- Staff never appear in the casebook; guests never do jobs.
- A weapon is on display only in a room with a spot for it, and only one per picture.
- A request's picture matches its words; its fits come from the requests table.
- A bonus detail never states where anyone was at 9:00 and never contradicts a clue.
- The key clue is always an existing case clue; the vanishing object never contradicts the solution.
- Hunches, details, gossip and anecdotes are rolled from the seed and ids only (rule 5).
- Quizzed items: her first dispatch, hunch payoffs, the generator dispatch, the vanishing object (if
  seen twice), the key clue. Nothing else.

## Difficulty

| | Easy | Medium | Hard |
|---|---|---|---|
| Rounds | 2 | 3 | 4 (from 7:45) |
| Jobs per round | 2–3, never more than staff | 3–4 | 4–5 |
| Job labels on requests | Shown, right person outlined | Hidden | Hidden |
| Requests that fit two jobs | None | Some | Most |
| Wrong person | Anecdote only | Anecdote and misses a round | Same |
| Impatient guests | None | One | Two |
| People and props per picture | 1–2 people, one prop | 1–2 people, 1–2 props | Up to 3 people, more props |
| Vanishing object | Near-empty display | Among a clock and frame | Among more things, or two changes |
| Statement | 3 blanks, 3 choices | 4–5 blanks, 3–4 choices | 6 blanks, 4 near-miss choices |
| Key-clue picture | One person in view | One person, some furniture | Two people in view, one is the clue |

## Statement (what gets asked)

First person, short lines, picture choices (faces, rooms, objects). In order:
1. "At eight o'clock I sent [face] to the {room}." (her own choice)
2. One line per hunch she followed up (picture choices of the detail).
3. "Back in the {room} at half past eight, something was gone from the {spot}: [object]." (if seen twice)
4. "When the lights dimmed, I sent [face] out to the generator." (if she sent someone)
5. Key clue: "At five to nine… I saw [face] {where}." (always)
6. Given: "Five minutes later the lights went out, and {someone} screamed."

A wrong answer shows the remembered picture with the detail circled in red pencil.

## Open questions

1. **Hired staff vs the Fixer.** This doc assumes the three dispatched staff are agency hires and never
   suspects, so the Fixer (the Butler's slot) stays a guest. Confirm.
2. **Where the staff go at 8:45.** `docs/story.md` says the storm cuts the road. The prototype says
   they "head home"; with the road cut they would go to the staff cottage on the estate instead.
3. **Later campaign rounds** (midnight, 3am): what the Housekeeper's game is once the staff have gone.
4. **Arrivals and before dinner** (luggage to rooms, earlier requests) were discussed as earlier phases
   of the day; not in this hour-long version.
5. **Which engine clue the key errand uses**, and how it's reserved so no other minigame gives it.
