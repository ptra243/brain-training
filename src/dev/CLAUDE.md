# Dev pages (`#dev`)

`#dev` is an index listing every dev page with a link (built from
`DEV_PAGES` in `src/dev/previews.ts`). `#dev/cases` is the case inspector.
Her game does not open this hash. A look check opens a preview URL instead of playing
through to the screen. A test that proves a click loads a save one real
action before that click (`e2e/CLAUDE.md`).

## When to add or update one

Decide at the end of any task that adds or changes a screen or a game state:

- **New screen a save cannot show** (a scene, an ending, a dialog, a state
  that needs solving puzzles first): add a preview.
- **New game state that takes more than a couple of real actions to reach**
  (a mid-way minigame, a late campaign round, a finished run): add a scenario.
- **Changed a screen that already has a preview or scenario:** update its
  sample or builder in the same change, and its "what a look check judges"
  line below. A format or content change that breaks a builder shows up as a
  failing `e2e/scenarios.spec.ts`.
- **A screen her save reaches in one click:** neither; `browser-check` goes
  there through the save.

Add the id here so the index, the docs and `browser-check` agree.

## Previews

A screen the save cannot show gets its own `#dev/<id>`, rendering the
component with sample lines. So does a screen a look check would otherwise
reach by solving puzzles. Register the id in `src/dev/previews.ts`, render it
in `DevPreview.tsx`, add it here and add a landmark to `e2e/previews.spec.ts`. The index lists it
automatically.
Sample names come from `src/content` (`suspectName`, `itemName`); buttons do
nothing and nothing is saved. An unknown id lists the real ones.

URL: `http://localhost:<port>/#dev/<id>` (on the server the brief names).
What a look check judges on each:

- `hints`: a Hint button per house cat (each with its own cat head in the brass ring, label readable, 44px+), one open
  hint note (cat counter at the left, text wraps), and "The Butler is in the chair" with the portrait filling the
  brass ring (no coloured disc around the head); no sideways scroll.
- `next-murder`: the stormy scene, scream and clock, with the title and the
  "Tap to go on" line clear of the art; nothing clipped.
- `opening`: the campaign opening at the start: "Someone in this room is the culprit.", "0 of N spoken to", the
  guests in a 3-wide grid (counters 44px+, names readable), Skip; no sideways scroll.
- `opening-midway`: three guests spoken to and one guest sheet open: both portraits, greeting, victim line, beat 1
  and a clue card; nothing clipped.
- `opening-cat`: every guest spoken to, the cat's sheet open (cat portrait, intro, the "See what ... found" button).
- `opening-skip`: the skip summary dialog: clue count, the guests not spoken to, one button.
- `summation`: the summation at "3 of 7": floor plan with three counters placed (the newest ringed in its room, counters
  44px+ and not overlapping), the placement line ("X was in the Y with the Z."), the "You knew this", "You worked this out
  from your clues." or "You never found this out." line, Skip and Next side by side, 44px+; no sideways scroll.
- `summation-skip`: the same step with the "Are you sure?" dialog centred: "Keep watching" and "Skip" side by side.
- `escaped`: "The killer got away" dialog, centred, one "See the case" button.
- `guess-now`: the Guess now? dialog, with "Not yet" and "Guess now" side by
  side and easy to tell apart.
- `time-card`: the held "10:30" card with "1 game left" (the real one fades).
- `explore`: an explored round on the map at 9pm: floor plan, the "9:00
  (N games left)" header, room list, tab bar.
- `midnight`: the same round at midnight with the map locked: Midnight header,
  a disabled room, a greyed room list.
- `you-sheet`: the You sheet over the round: her portrait card, then the clock,
  room, clues-found and games-left lines; one close button; nothing clipped,
  no sideways scroll.
- `houses`: every layout (lodge, courtyard, steps, long house, T lodge) in all 8
  orientations (`lodge/r90`, `lodge/m`...), each on the real map with nobody
  placed; a tall plan is narrowed, not stretched: footprint readable, void cells unpainted, door gaps
  (ivory with a brass dashed line) visible and not clipped, room labels
  readable at 360px, no sideways scroll.
- `nosing-houses`: the Nosing around board at the start on the lodge, courtyard, steps, long house and T
  lodge (medium): squares and marks readable at 360px, no wall inside door-joined rooms, no sideways scroll.
- `case-board`: the real case board on a thin Play case (BKVNS, medium) padded with Noticed pieces: a room group and an
  Unknown group in the tray, labelled "Noticed in the <room>: ..." / "Noticed somewhere: ..." (tap one for its rules and its
  touching symbols), the How to play list with the Noticed line, "Clues on the board (N)" counting every clue with the
  puzzle's own ones blank; squares readable at 360px, no sideways scroll. Moves are not saved.
- `motives`: a talk simulator (Guest, Card, Reading, Thread, Victim, Mood, Games finished, Case solved, Start over,
  Hear all, Reset), each control 44px+ and fitting 360px; the greeting changes with Mood; beats appear one per tap
  up to the ready count; {victim} shows the chosen name; the source line names the thread in use; no sideways scroll.
- `shelf-ribbons`: the #shelf puzzle book open on Case, ribbons dropped (two ribbons in a row of three, a gap
  where Case lies in the crease): book runs to the left edge with a 20px left page, 6px felt right, header 16/10px
  inset; satin ribbons readable and 44px+; no sideways scroll.
- `shelf-campaign`: the #shelf campaign book open on Room for a sample chapter-one campaign (honey oak): title "Chapter one: 9pm",
  the dropped ribbons Room, Plan, Answer (44px+) hang over a clear header band (clock "9:00 (N games left)" at the left, three lit
  candles at the right, `aria-label` "3 accusations left") and not over "You are in the ..."; then the room's look lines, "Here with
  you: ...", "Things to try" rows (puzzle label, "The inkwell"-style name, "N clues · until 10:20") and "Walk to" buttons (44px+)
  with "No time taken."; the notebook strip at the foot. Answer is the printed form (see `shelf-campaign-answer`). No sideways scroll.
- `shelf-campaign-midnight`: chapter two in the midnight-green palette (deep green felt and cover, pale green paper, dark ink): two
  candles lit and one blown out (thin smoke), the clock past 9:00, the room with a done row (green tick, "N clues found"), the other
  picked object open and the rest saying "No puzzles left tonight" (faded, disabled); ribbons and text readable on the green
  paper; no sideways scroll.
- `shelf-campaign-plan`: the chapter-one campaign book turned to Plan: a "Plate I / The house tonight" head, the hint line, the
  floor plan with red `!` marks, the body mark, her marker and guest counters in the rooms she has entered (the scene, the body's room,
  and two she walked into), the "Shaded rooms are empty tonight" line; room taps 44px+ as in the classic map; no sideways scroll.
  Tapping a room walks (not saved in a sample); a guest in her room opens the talk spread, one elsewhere the notebook page.
- `shelf-campaign-talk`: the talk spread over the chapter-one book, open on a guest who has a questioning game: a full-screen green
  baize table, the name as a serif heading with a 44px Close at the right, two ivory cards ("You" and the guest, art filling the card, caption
  readable), tabs Talk / Minigame / Clues (44px, Talk underlined in brass), the Talk tab with greeting, one filled pip, the one line
  heard and a "Go on…" or idle line; nothing clipped, the notebook strip hidden, no sideways scroll. Minigame shows the puzzle label
  with "Unlocks N clues." and a Play button; Clues has one line and "Open their page" (both 44px+). Sample: buttons do nothing saved.
- `shelf-campaign-answer`: the chapter-one campaign book turned to Answer: "The answer / Fill in the blanks", today's two-line hint, the
  printed form "It was [guest in pencil] in the [room], with the [blank]." (blanks 44px+ tall, the guest in the Caveat hand), a
  "Fill both blanks first" red pill button (disabled until a weapon is picked), no rank line; no earlier tries yet in chapter one. Picking
  the weapon and handing in asks "Guess now?" (a pop-up) while her clues point at several people, then opens the questioning (sample
  buttons write nothing). No sideways scroll.
- `shelf-campaign-question`: the questioning over the chapter-one book (a held wrong accusation, two questions asked): the green baize table,
  the accused's name as a serif heading, two ivory cards ("You" and the accused), then the classic questioning below on the baize: the
  chair line, "What X said" with two exchanges and Challenge buttons, Ask, "Their story holds", Solve, "Skip to the verdict" (all 44px+),
  the evidence list. No Close button and Back/Escape do nothing; nothing clipped; no sideways scroll.
- `shelf-campaign-later`: the "later that night" scene over chapter two (midnight palette behind it): a dark table, three big candles in
  a row (two lit with a glow, the third blown out with a wisp of smoke; with motion welcome its flame shrinks away first), the heading
  "X wasn't the killer", "Later that night, X is found dead. The killer is still among the guests, and you have 2 accusations left."
  and a gold "On to midnight" button (48px). Continue, Back and Escape close it; no sideways scroll.
- `shelf-campaign-caught`: the campaign book after the killer was caught in chapter two (midnight palette), turned to its closing page:
  "The answer / Case closed", one crossed-out red line for chapter one, "It was X in the Y, with the Z." with the names in the Caveat hand,
  "Solved in 2 accusations.", the effort line, a secondary "See the night again" and the red "Back to the shelf" (both 48px); the notebook
  strip at the foot with no Accuse buttons; no sideways scroll.
- `shelf-campaign-escaped`: the got-away scene on the dark table: three candles all out (the first just blown out, a short fade), "The killer
  got away", "X was the third body. By dawn, Y was gone, with the Z." and a gold "See the case" button (48px). Back, Escape and the button go on
  to the night's replay.
- `shelf-campaign-earlier`: chapter two with chapter one open to read (the Room page, honey oak): title "Chapter one: 9pm", a "Chapters" list of
  two 44px buttons (the one on the pages outlined in red, "tonight" under the other), the line "You are reading an earlier chapter" with a
  "Back to tonight" button, two candles lit and one out as chapter one stood, guests as plain names (no Talk), no Walk to; only finished
  objects are open. Answer shows "9pm: the wrong person" and the verdict line in red pencil.
- `shelf-new-case`: the New case book on a fresh sample Play case (fixed seed, nothing saved), opening not yet seen: the
  body line, the story paragraph and the button that goes on to Find a clue; notebook strip at the foot; no sideways
  scroll. The real book builds its case when opened ("Laying out the cards…" until it arrives).
- `shelf-find-a-clue`: the same book on a sample hard Quick start case (it has a finale) with one game won (a word
  game: "No new clues"), one won with 2 hints (5 clues), one solved by the cat, the rest open. Each line is a puzzle label (140x60, at its own slight
  tilt, page ring) beside its story line (3-4 lines, no clipping): green tick top-right on the won ones, a brown
  paw pill "2" bottom-left on the hinted one, a gold paw sticker on the cat's; under the story "N clues found" (or "No new clues"),
  "N clues found · 2 hints" or "The cat solved it · N clues"; the finale a gold padlock label, "Locked", faded,
  with its page ring; lines 76px, 44px+; stickers not cut off at the page edge; "Hide finished (3)" at the foot;
  no sideways scroll; the list starts right under the heading (dropped ribbons overlap its first card) and its last button clears the notebook strip.
  The ribbons start dropped, so the first tap on the page only tucks them.
- `shelf-puzzle`, `shelf-puzzle-won`, `shelf-puzzle-revealed`: a puzzle page (full-width paper, 360px) open over the
  book on the sample case (nothing is saved): header with a ribbon chevron, the game name, Solve (not once finished),
  "level · N clues", one rule line, then the game; the won and revealed pages keep the board and add the clue
  heading, "Solved by <cat>" (revealed only), the clue cards and "Turn back to page 3" (after a real win the board stays alone for one second first; these open already finished, so show everything at once). Wrapped help is two lines at
  most; no sideways scroll; buttons 44px+.
- `shelf-notebook`, `shelf-notebook-grid`, `shelf-notebook-subject`: the #shelf notebook over
  the sample case (three games won, one guest placed, one cross). Closed: a 52px kraft strip at the foot with spiral
  rings and one hand-written line ("Notebook · N of M to use"), the book above it not hidden behind it. Open
  (header and a sliver of the book stay under a scrim): kraft cover with rings, "Pull down to put away", the page on
  squared paper, three 48px tabs along the bottom (Clues, Grid, Guests; a Play case also has Jigsaw; no You tab in Quick cases; the current one underlined in red);
  Grid: Hint button and the whole grid readable (weapons as line icons, rooms as vertical words, 30px cells); subject: back link, counter and
  name, placement line, clue cards, "What they said", "Move their counter" with the rooms, then a red-outlined 48px "Accuse the X with the Y" button (the guest is given a weapon); no sideways scroll at 360px. A sample never saves the tab.
- `shelf-notebook-grid-clues`, `shelf-notebook-grid-house`: the notebook on Grid with the pull-up sheet open above the tabs
  (about 240px on Clues, scrolls inside, a Clues / House / Close bar of 44px buttons; the grid's guest rows stay visible
  above it). House: the sample case's floor plan, read-only, with the placed guest and weapons, room names in dark ink on
  a paper chip, shaded empty rooms listed under it; the whole plan fits above the tabs; no sideways scroll; buttons 44px+.
- `shelf-notebook-jigsaw`: the notebook open on a Jigsaw-finish Quick sample (two games won, three stickers placed at
  their true spots). Tabs You, Clues, Jigsaw, Guests (no Grid); the sticker page on squared paper: board, Hint/Undo/Check
  /Restart, and the sticker sheet pinned as a drawer just above the tabs (2 rows of 44px, scrolls sideways); no sideways
  page scroll at 360px.
- `shelf-map`, `shelf-map-subject`: the #shelf book turned to Map on the sample case (three guests and a weapon placed,
  nothing saved). Map: "Plate II" head, the floor plan with counters and weapons on it, room names in dark ink on a paper chip (readable where a long name runs past a narrow room), the tray, the legend; no
  Accuse bar; notebook strip at the foot. Subject: a placed guest ringed in brass on the plan, still fully visible
  above the notebook, which covers the lower half on that guest's page (back link, placement line, clues, "Move their
  counter" with a 44px button per room, the current one marked, then a red-outlined "Accuse ... with the ..." button); no talk; no sideways scroll.
- `shelf-answer`, `shelf-answer-solved`: the #shelf book turned to Answer on the sample case (nothing saved). Form:
  "THE ANSWER / Fill in the blanks", a yellow slip ("1 of 2 right. Keep digging."), the wrong try struck through in red,
  a fresh "It was ___ in the <room>, with the ___." with 44px blanks, "Right now: Sharp eye" (the rank for the next try)
  above a disabled "Fill both blanks first" button; tapping a blank opens a list of 44px names. Solved: pencil verdict,
  the rank ("Sharp eye", big red pencil) under it, "Solved in 2 accusations", effort line, a secondary 48px "Walk through
  the night" button (opens the replay) above "Back to the shelf". No sideways scroll; the notebook strip stays at the foot.
- `shelf-night`: the #shelf ending on its own: a paper page (red spine edge, "The night, as it was") with the floor plan
  and one step ("3 of N") that shows a "Your clue: ..." line, the placement line, Skip and Next side by side (48px). Text
  readable on paper, counters 44px+, no sideways scroll; the page covers the whole screen.
- `shelf-clue-slip`: the #shelf book with the notebook strip at the foot, which plays the clue-slip moment on load:
  three small cream slips (no text) fly from the upper middle of the screen into the strip one after another, the strip
  gives one short wiggle, and the line changes from "no clues yet" to "N of N to use" only when the last one lands. A
  "Play again" button (44px) remounts the book to see it again. Slips must be gone afterwards; no sideways scroll.
- `shelf-labels`: the #shelf puzzle labels on the felt: all nine games at easy, medium and hard (140 x 60 cream cards, border
  navy for words, green for logic, plum for people, the 26px drawing at left, the name in small caps at right, wrapping to two
  lines, rust stars); a label with no level (no stars) and one with a page ring; won (green tick), won with 2 hints (tick and
  brown paw pill), solved by the cat (gold paw sticker), lifted (brass tick, bigger shadow); the finale gold with a padlock,
  "Locked" and open. Stickers hang over the corners without being clipped; slight different tilts; no sideways scroll at 360px.
- `shelf-tin`: the #shelf sticker tin screen open on a fixed code (nothing read or saved): green felt, brass-edged red
  tin with its lid tipped back, nine stickers 2 across on a blue-grey sheet (5 rows, labels 140 x 60 at slight tilts, the
  game's level in stars); four lifted (raised, bigger shadow, brass tick); under it "4 of 7 lifted" and "Logic ★★☆ · N guests",
  then Shake the tin and the gold Stick them in, both 50px; the whole screen fits 360 x 780 with no scrolling and no
  sideways scroll; sticker overhang (brass ticks) is not cut off at the sheet's edge.
- `shelf-guest-book`, `shelf-guest-book-empty`: the #shelf guest book (sample history, nothing read or saved): a cream book
  with a red spine edge, a "Guest book" heading, the Quick and campaign totals in blue-black handwriting, then entries newest
  first (serif title, handwritten lines on ruled paper); a solved or caught run ends with the killer's name signed larger and
  slightly tilted, an escaped campaign with "left before dessert" in red; "Back to the shelf" link at the top (44px+). Empty:
  "No one has signed yet." Nothing clipped, no sideways scroll at 360px.
- `portraits`: the portrait gallery on its own (light dev page).
- `dogfight`: the dog fight board in each state, with a cat helper picker
  (light dev page).
- `cases` (not a preview): the case inspector.

A save cannot show a click's result, so a test that proves a click still
loads a save one action before the click. A save can show a campaign round,
midnight (enough games marked done), and a minigame mid-way. Build that save
on the run. Do not commit one.

## Scenarios (`#dev/load/<id>`)

A scenario writes a save, then opens the real game on it, so you can play from
that state. Each builds its save on the run with the engine and the app's own
functions (`src/dev/scenarios.ts`), never a committed file. Loading asks first
(an in-app `Dialog`) because it replaces the game saved in this browser. e2e
builds the same states from the same builders; add a test to
`e2e/scenarios.spec.ts` for each new one.

- `campaign-opening`: a new campaign, round 1, the opening scene not started.
- `campaign-start`: a new campaign, round 1, the opening already done (opens on the casebook), nothing played.
- `campaign-midnight`: round 1 with every puzzle played, map locked.
- `campaign-last-round`: round 3 after two wrong accusations; the next wrong
  one lets the killer escape.
- `finished-runs`: Home with a solved Quick case and a caught campaign, both
  in Your record.

Not yet: a Nosing around game mid-way. The bot that plays it
(`src/games/nosingSweeps.ts`) imports `node:assert`, so it must be split
into a browser-safe module first.
