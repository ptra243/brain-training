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
`<Game>.module.css` next to its component and are used as `styles.x`.

## Done

Commit 7909bba: Tarot match and the dog fight. Then Wordle, crossword and word search (2026-10-23),
plus the rule in `src/game/CLAUDE.md` and `e2e/CLAUDE.md` ("new game styles go in a CSS module").
Copy `TarotGame.module.css` / `NosingDog.module.css` as the pattern.

## Next

Move the other games one at a time (cat puzzle, sudoku, then the rest), one or two per commit.

## Watch

e2e uses about 33 class selectors (`locator('.x')`). Scoped names break them, so move those to roles,
labels or `data-testid`. Check each moved screen at 360px (`browser-check`).
