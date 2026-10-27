# Visual theme: library, puzzle book and notebook

Status: the live app stays as it is. The new look is built on `#shelf`, one screen at a time, in the
"Shelf UI, beside the current game" session. Mockups in `docs/mockups/` (open `index.html`) and on the
"Library home" design canvas (https://claude.ai/artifact/JwRfscWuZEQGKRbbjx8yb2). The canvas also holds
the three palette variants and the shared palette screens, which don't export to plain HTML.

Goal: make the app feel like a game rather than menus. Today Home is a stack of cards with seven
buttons, and Get a clue is button → dialog list → Choose → Play.

## Leaning towards (not yet decided)

- **Home is the library.** Bookcases with a Quick play shelf, a Campaign shelf and a record shelf.
  Her case in progress sticks out of the shelf with a ribbon; new case and new campaign are books
  sealed with wax; Choose your games is a deck lying on the shelf; solved cases arrive as new books.
  The record is the guest book (not a rosette, not two "Your record" buttons).
- **Tapping a book takes it to the table.** The baize card table stays as the surface the books
  lie on, so today's colours carry over.
- **Two books in a case.** The *puzzle book* holds the case: the opening, the map as a printed plate,
  the puzzle pages, and the answer form (Answer, or Stickers for Jigsaw-finish cases). The *notebook*
  (kraft, top-bound, spiral) holds her working: found clues and the logic grid on graph paper. Only
  one is open at a time; the notebook peeks up from the bottom like today's clue drawer.
- **Two edge pulls in a case (owner, 2026-10-27).** Swipe up from the bottom for the notebook.
  Swipe down from the top and the ribbon bookmarks (Case, Map, Puzzles, Answer or Stickers) slide
  out from behind the page and flop down over it; tap one to jump to that page. Proposed details:
  - Both pulls start only on a strip at the edge (the notebook's peek, the ribbon tips peeking about
    14px below the header), never anywhere on the page, so dragging on the map and grid is untouched.
  - The ribbon tips can also be tapped, so she can always find them without knowing the gesture.
  - The drop: ribbons slide down from behind the page one after another (about 60ms apart), with a
    small overshoot and settle (about 350ms each), the current page's ribbon brass. Swipe up, tap the
    page or pick a ribbon to tuck them away. Reduced motion: they just appear.
  - `overscroll-behavior-y: none` under `body.shelf` so a pull down doesn't trigger Chrome's
    pull-to-refresh. The gesture starts below the status bar, so it doesn't fight Android's
    notification shade.
  - Mockup starting point: `docs/mockups/library-home/CaseRibbons.dc.html` (ribbons at rest).
  - **Picking a ribbon turns the page (owner, 2026-10-27).** The ribbons follow book order (Case,
    Map, Puzzles, Answer or Stickers). Going forward, the page lifts from the right edge and turns
    over to the left; going back, it turns from left to right. The ribbons tuck away as the page
    turns. Proposed: about 450ms with a slight curl and shadow, and a quick flick of a few leaves
    when she skips more than one section. Picking the page she's already on just tucks the ribbons.
    Reduced motion: a short crossfade. It only happens on a ribbon tap, never a swipe, so it doesn't
    bring back the page-turn swiping rejected below.
- **Jigsaw is a sticker page** at the back of the puzzle book: loose pieces are die-cut stickers on a
  sheet, pinned pieces are printed on the page, the outline hint is the dotted silhouette sticker
  albums already print. A refused drop curls and lifts back to the sheet.
- **Find a clue is choose-your-own-adventure.** Quick play: page 3 offers each puzzle as a line of
  story plus game, level and clue count, ending "turn to page 24". Campaign: the room page is the
  choice ("You are in the hall": a newspaper crossword, the Butler polishing a clean banister), each
  showing the time it takes ("until 10:20"); walking costs no time, as now.
- **Icons are stickers**: vintage paper labels (scrap, luggage labels, bookplates) rather than glossy.
  Fixed tilt per icon. Reward stickers stay round and glossy so they never look like Jigsaw pieces.
- **Cosy palette.** Three variants mocked at 360 × 780: honey oak (lightest, the favourite so far),
  rose and walnut, midnight green (night campaign rounds). Patterned wallpaper, lamp glow, mixed
  dusty spine colours, the cat asleep on the bookcase, a teacup and candle.

## Review findings already applied to the mockups

Map, grid and sticker plates run edge to edge (no book border, no side tabs); counters 36px; sticker
squares about 40px; grid labels in a printed font with full room names, handwriting only for marks
and notes; the side thumb index was dropped (it duplicated page 3); one shared tab set (Case, Map,
Answer or Stickers); Nosing around follows the cat; the record shelf shows the guest book only.

## Still open

1. **Check real screens before building.** Checked at 360 × 780 on 2026-10-27: `#dev/explore`,
   `#dev/houses`, `#dev/nosing-houses`. The floor plan fits an edge-to-edge plate (tallest is the
   Steps turned, about 360 × 432, about 128px spare in a 560px plate). A few room names paint past
   the plan edge (Dining room on the T lodge, about 17px). Nosing boards fit a full-phone page
   (328px square now, about 300px spare under an 80px header). The campaign room list (534px) does
   not belong on the plate. Still to check: `#dev/time-card`, `#dev/midnight`, `#dev/load/campaign-start`,
   the grid and the Jigsaw.
2. **Pick the palette** (honey oak is ahead). Apply it only under `body.shelf`, never in the `:root`
   variables in `src/styles.css`, until the owner makes `#shelf` the address the app opens on.
3. **Map and grid are now in different books.** She switches between them a lot; confirm with her
   that one tap on the notebook is quick enough.
4. **Tabs at the top are a reach on the S26.** Answered by the ribbon pull-down (above): a swipe
   down from anywhere along the top edge, so she doesn't have to reach for a small tab.
5. **Bottom of screen, one owner per page:** notebook peek on map and grid, sticker sheet on the
   sticker page (notebook moves to a header icon), nothing else.
6. **Sticker sheet height at 36–40px squares** may need its own scroll, or to sit under the notebook.
7. **Story line pools per game** (picked by the case seed, like the openings) so page 3 doesn't
   repeat after ten cases. Lines are flavour: never a case fact, never killer-dependent.
8. **Fonts must ship with the app** (EB Garamond, Caveat): the mockups load Google Fonts, and the
   PWA plays offline.
9. **Shadows and SVG filters**: keep them on stickers; check scrolling on her phone.

## Unexplored ideas

- **Sticker branches, later.** Solving a puzzle (or pressing Solve) gives a sticker; a foil one for
  solving without help. Pages then say "Have the key sticker? Turn to 31." Works with what exists
  (the finale already waits for the other games; progress already records won and revealed). Rules:
  never lock a needed clue (only extras: a bonus clue, a funny scene, a campaign shortcut), never
  depend on who the killer is, and it changes cases, so dump and diff plus a storage prefix bump.
- **Stickers as a collection**: the casebook cover and guest book fill up like a scrapbook (the
  weapon, the room, the killer's card after a solve).
- **The secret lever book**: an odd black book on the shelf swings the bookcase open; a way to
  discover tarot mode, which `docs/theme-draft.md` lists as undecided.
- **Spine colours from the case code**, so her shelf is unlike anyone else's.
- **Campaign as chapters**: 9pm, Midnight and 3am as chapters of one book; candles for accusations
  left, blown out on a wrong one; the clock face on the shelf shows the round.
- **Case start as breaking a wax seal**, and the book opening on the victim and the opening lines.
- **Campaign setup as the book's title page**, difficulty as three ribbon bookmarks instead of
  pickers.
- **Her own notes**: let her type into the notebook (the mockup's handwriting is decoration).
- **The invitation theme**, kept for edges only: a "regrets" card after a wrong accusation ("The Uncle
  sends his regrets. He won't be joining you for dessert."), a thank-you note on solving, the guest
  book. Most of its charm is copy, so it can be layered on later.
- **Rejected for now**: tarot spread as Home (gives the hidden layer away; maybe the tarot-mode skin),
  evidence board (noir, generic), house cutaway as Home (most art; every house differs), page-turn
  swiping (fights dragging on the map and grid).

## Settled: a second shell

The new look is `#shelf` (and `#shelf/...`). The address with no hash still loads `App`. Until the
owner switches that default, this work must not change the current shell.

- Do not edit `src/styles.css`, `Home.tsx`, `Casebook.tsx`, `CampaignCard.tsx`, `GetClue.tsx`,
  `ExploreMap.tsx`, the game CSS modules, or any other file the current game renders, in order to
  restyle it.
- `src/main.tsx` may gain one branch, the same way `#dev` is branched, and add a `shelf` class on
  `body`. Nothing else there.
- New screens are new files. Their colours apply only under `body.shelf`.
- A screen that is not drawn yet is a short page on `#shelf`. It does not fall through into today's
  components.
- Reading her save, to draw the book that sticks out, is fine. Do not write the save from `#shelf`
  until that screen is the real one and the action is the same as today (continue or start).
- The first screen is the honey-oak bookcase the owner picked on 2026-10-27
  (`docs/mockups/shots/honey-oak-shelf.png`): cream dotted wallpaper, one wooden bookcase,
  Quick play / Campaign / Your record, the cat, teacup and candle. `docs/mockups/library.html`
  is the earlier dark shelf and is not the one to build. Later screens come from `docs/mockups/`,
  one at a time.
- **Build from the source, not the screenshot.** The honey-oak screens come from the "Library
  home" design canvas (https://claude.ai/artifact/JwRfscWuZEQGKRbbjx8yb2), copied into
  `docs/mockups/library-home/`. `CosyLibrary.dc.html` is the bookcase and `CosyTable.dc.html` the
  case page at the table; the `honey` entry in each file's `palettes` holds the exact colours.
  Copy sizes, colours and the EB Garamond headings from there; `LibHoney`/`TableHoney` just pick
  the honey palette.

## Suggested build order

1. The `#shelf` route and the honey-oak bookcase (`docs/mockups/shots/honey-oak-shelf.png`). Done (2026-10-27). New case and the saved case book play a CSS open (lift, grow, stiff cover) onto a still case page: blurb, three clue choices, ribbons for Case, Map, Puzzles and Answer. The choices do nothing yet. Other books still open "This page isn't drawn yet."
2. Each later mockup as its own screen on `#shelf`, still leaving today's game alone.
3. Only when she is ready: make the app open on `#shelf`.

Each new screen needs a look check at 360 × 780. Sticker rewards and sticker branches stay later,
and they change cases, so they are not part of this shell.
