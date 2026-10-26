# Visual theme: library, puzzle book and notebook

Status: design exploration, nothing built. Mockups in `docs/mockups/` (open `index.html`) and on the
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

1. **Check real screens before building.** Screenshot at 360 × 780 and compare with the mockups:
   `#dev/explore` (campaign map at 9pm), `#dev/houses` (other floor plans), `#dev/nosing-houses`,
   `#dev/time-card`, `#dev/midnight`, and `#dev/load/campaign-start` for a live round. Look at how
   the floor plan, grid and Jigsaw fit once the book frame is gone, and how much scrolls.
2. **Pick the palette** (honey oak is ahead), then fold it into the CSS variables in `src/styles.css`.
3. **Map and grid are now in different books.** She switches between them a lot; confirm with her
   that one tap on the notebook is quick enough.
4. **Tabs at the top are a reach on the S26.** Accepted because the bottom belongs to the notebook;
   revisit if she struggles.
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

## Suggested build order

1. Palette and fonts in `src/styles.css` (no layout change).
2. Library Home replacing `Home.tsx` and `CampaignCard.tsx`, guest book for Your record.
3. Puzzle book and notebook frame in `Casebook.tsx`: tabs, edge-to-edge plates, the drawer restyled
   as the notebook.
4. Page 3 and puzzle pages replacing the `GetClue.tsx` dialog; room pages in `ExploreMap.tsx`.
5. Sticker styling for the Jigsaw (`src/game/board/`).
6. Sticker rewards, then sticker branches (engine change, see above).

Each step needs a `#dev` preview at 360 × 780 and a `browser-check` pass.
