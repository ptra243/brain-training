# CSS Modules for game styles

Plan and status, moved from `docs/next-sessions.md`. Reads first: `src/styles.css` (one ~1,040-line
global sheet, sections marked `/* ---------- X ---------- */`), `src/game/CLAUDE.md`, `e2e/CLAUDE.md`,
commit 37870b2.

## Why

Global class names collide across games. In 37870b2 the dog fight reused `.tarot-card`, and its later
`.tarot-card svg { 22px }` rule shrank every Tarot match card's art. A scan on 2026-10-23 found 18
selectors with rules in more than one place, most of them harmless additions a few lines apart.

## Decided

CSS Modules (built into Vite, no new dependency), adopted gradually. Tailwind and CSS-in-JS were ruled
out as too big a move from the CSS-variable look. Shared pieces stay global in `styles.css`: colour and
type variables, buttons, hint notes, `Dialog`, layout. Each game's own styles move to a
`<Game>.module.css` next to its component and are used as `styles.x`. This migration moves the
current game's rules and restyles nothing. The cosy look is `#shelf` (`docs/visual-theme.md`) and is
out of scope here.

## Done

Commit 7909bba: Tarot match and the dog fight. Then Wordle, crossword and word search (2026-10-23),
plus the rule in `src/game/CLAUDE.md` and `e2e/CLAUDE.md` ("new game styles go in a CSS module").
Then the cat puzzle and sudoku (2026-10-23, with the number pad, statements and pencil notes; e2e
`.cell-notes` is now `getByTestId('cell-notes')`; checked at 360px).
Then interrogation (2026-10-23; `InterrogationGame.module.css`, e2e `.question` / `.transcript .exchange`
are now `getByTestId('question')` / `('exchange')`; 360px checked except the Lie tag and strikethrough,
which show only after a successful challenge).
Copy `TarotGame.module.css` / `NosingDog.module.css` as the pattern.
Number pad (2026-10-27): `NumberPad.module.css`, question-screen sizes baked in, e2e `.numpad` is
`getByTestId('numpad')`.
Speed round (2026-10-27): `NosingSpeed.module.css`. The `nosing-speed` card wrapper stays in
`NosingGame` until the shell moves. e2e `.speed-count` is `getByTestId('speed-count')`.
Nosing shell (2026-10-27): `NosingGame.module.css` (question, encounter, roll, messages, dice).
`.nosing` and `.nosing.tight` stay global. e2e uses test ids for the question, scroll, encounter,
roll, stakes and the speed wrapper.
Board and key (2026-10-27): `NosingBoardView.module.css` and `NosingKey.module.css`. Icon paint
stays global. The key's toggle is `button.toggle` so it beats the global `.secondary` button.
e2e uses test ids for the board, the purr mark, the dog mark and the info line.

## Shared pieces (settled 2026-10-27)

- **Number pad** gets `NumberPad.module.css`. Only the nosing question renders it, so the
  question-screen sizes (key and screen `min-height: 2.75rem`, gaps `0.4rem`) are the module's own
  rules. The `.nosing-speed .numpad*` rules are unused (speed never shows a pad) and go away with
  the move. The root has `data-testid="numpad"`.
- **Question text and the scroll area** are not a shared widget. `.question-text` and
  `.question-scroll` move into `NosingGame.module.css`. The speed round's sum is its own rule in
  `NosingSpeed.module.css` (it only borrowed the font). e2e uses a `data-testid` for the scroller
  and the question block.
- **Number grid** is one component used by the lock and the dog fight, so it gets
  `NumberGrid.module.css` (the `.grid-*` classes move with it). The dog's swap picker borrows those
  classes and imports the module. `.nosing.tight .grid-rows` moves into that module as
  `:global(.nosing.tight) .rows`. When this lands, drop the `.number-grid` example from the "classes
  two games use" line in `src/game/CLAUDE.md`: a shared component owns a module.
- **Lock actions** (the sticky button bar) are used by the lock and the dog fight. They move with
  `NosingLock.module.css`; the dog imports that class. Same change as the number grid, because the
  dog currently uses both.
- **Keep global:** `.nosing` and `.nosing.tight` (the page grid, card padding, hint-bar margin).
  `#dev/nosing-houses` uses `.nosing`. Also colour variables, buttons, `.card`, `.hint-bar`,
  `.small`, `Dialog`. The board icon paint (`.mi`, `.mi-*`, and the fills on those icons) stays
  global: one set of shapes, and the board and the key only override the ghost stroke via
  `:global(.mi-ghost)`.
- **Typing** matches the number pad: `TypingInput.module.css` owns `.typing` and `.typing-input`.
  The three word games set `.typing-host` on the board wrapper; they import `host` from that module.

## Next

Done this session: number pad, speed, the nosing shell, the board and the key. Still to do, one
piece per commit: number grid and lock together (the dog's borrowed classes in that same change),
then typing. e2e `checkScreen` is the 360px check. `browser-check` only where a preview exists
(`#dev/dogfight` for the grid). `#dev/nosing-houses` passed at 360×780 after the board move.

## Watch

e2e uses about 33 class selectors (`locator('.x')`). Scoped names break them, so move those to roles,
labels or `data-testid`. e2e `checkScreen` (360×780) covers each moved screen. `browser-check` only
where a preview already exists.
