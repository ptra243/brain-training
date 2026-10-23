# Dev pages (`#dev`)

`#dev` loads the case inspector and, below it, the portrait gallery. Her game
does not open this hash. A look check opens a preview URL instead of playing
through to the screen. A test that proves a click loads a save one real
action before that click (`e2e/CLAUDE.md`).

## Previews

A screen the save cannot show gets its own `#dev/<id>`, rendering the
component with sample lines. So does a screen a look check would otherwise
reach by solving puzzles. Register the id in `src/dev/previews.ts`, render it
in `DevPreview.tsx`, add it here and add a landmark to `e2e/previews.spec.ts`.
Sample names come from `src/content` (`suspectName`, `itemName`); buttons do
nothing and nothing is saved. An unknown id lists the real ones.

URL: `http://localhost:<port>/#dev/<id>` (on the server the brief names).
What a look check judges on each:

- `next-murder`: the stormy scene, scream and clock, with the title and the
  "Tap to go on" line clear of the art; nothing clipped.
- `escaped`: "The killer got away" dialog, centred, one "See the case" button.
- `guess-now`: the Guess now? dialog, with "Not yet" and "Guess now" side by
  side and easy to tell apart.
- `time-card`: the held "10:30" card with "1 game left" (the real one fades).
- `explore`: an explored round on the map at 9pm: floor plan, the "9:00
  (N games left)" header, room list, tab bar.
- `midnight`: the same round at midnight with the map locked: Midnight header,
  a disabled room, a greyed room list.
- `houses`: the lodge, courtyard house and steps stacked, each on the real map
  with nobody placed: footprint readable, void cells unpainted, door gaps
  (ivory with a brass dashed line) visible and not clipped, room labels
  readable at 360px, no sideways scroll.
- `portraits`: the portrait gallery on its own (light dev page).

A save cannot show a click's result, so a test that proves a click still
loads a save one action before the click. A save can show a campaign round,
midnight (enough games marked done), and a minigame mid-way. Build that save
on the run. Do not commit one.
