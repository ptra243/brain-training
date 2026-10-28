import type { Page } from '@playwright/test';
import { expect } from './fixtures.ts';
import { content } from '../src/content/index.ts';
import { houseOf } from '../src/content/houses.ts';
import { nosingLadders, nosingSnakes } from '../src/content/nosing.ts';
import { caseFor, type CaseRef } from '../src/engine/caseRef.ts';
import { buildNosing, nosingHint, nosingSeed, nosingStep, nosingView, type NosingPhase, type NosingView } from '../src/games/nosing.ts';
import { drive } from '../src/games/nosingSweeps.ts';

/** Casebook -> Clues -> Get a clue -> Nosing around (the game must be in the list and not done). */
async function pickNosingClue(page: Page) {
  await page.getByRole('navigation', { name: 'Casebook' }).getByRole('button', { name: 'Clues' }).click();
  await page.getByRole('button', { name: 'Get a clue' }).click();
  const dialog = page.getByRole('dialog', { name: 'Pick a game' });
  await dialog.locator('button.puzzle-row:not(.locked):not(.done)', { hasText: 'Nosing around' }).first().click();
  await dialog.locator('.puzzle-help button.primary').click();
  await expect(page.getByRole('heading', { name: 'Nosing around', level: 1 })).toBeVisible();
}

/** Home -> Choose games (Nosing around ticked) -> Start -> Clues -> Get a clue -> Nosing around. */
export async function openNosing(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Choose games' }).click();
  await expect(page.getByRole('heading', { name: 'Choose games', level: 1 })).toBeVisible();
  const rows = page.locator('button.pick-row');
  const nosing = rows.filter({ hasText: 'Nosing around' });
  if ((await nosing.getAttribute('aria-pressed')) !== 'true') await nosing.click();
  // Three games at least: add others until there are enough.
  for (const name of ['Wordle', 'Crossword', 'Word search', 'Sudoku']) {
    if ((await rows.and(page.locator('[aria-pressed="true"]')).count()) >= 3) break;
    const row = rows.filter({ hasText: name });
    if ((await row.getAttribute('aria-pressed')) !== 'true') await row.click();
  }
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Casebook' })).toBeVisible();
  await pickNosingClue(page);
}

/**
 * Opens Nosing around already at `phase`: starts a case through the real UI, then rewrites
 * her quick save with moves the 'hints' bot made (built here with the app's own engine) and
 * reloads. The save is made on every run, so a format or prefix change can't leave it stale.
 */
export async function openNosingAt(page: Page, phase: Exclude<NosingPhase, 'open'>, also: (v: NosingView) => boolean = () => true) {
  await openNosing(page);
  const raw = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith(':quick'));
    return key ? { key, value: localStorage.getItem(key) } : null;
  });
  expect(raw, 'a quick save exists').not.toBeNull();
  const save = JSON.parse(raw!.value!) as { ref: CaseRef; progress: { games: Record<string, unknown> } };

  const c = caseFor(content, save.ref);
  const spec = c.games.find((g) => g.kind === 'nosing');
  if (!spec || spec.kind !== 'nosing') throw new Error('the case has no Nosing around game');
  const puzzle = buildNosing({
    house: houseOf(c),
    seed: nosingSeed(spec.seed),
    level: spec.level!,
    sceneRoom: c.sceneRoom,
    clues: spec.clues.slice(),
    ladders: nosingLadders,
    snakes: nosingSnakes,
  });
  // Drive stops before it moves on a dog fight, so a stop on phase dog still sees the opening deal.
  // A short board can jump over a speed square: try the hint bot, then random bots.
  const stop = (v: NosingView) => v.phase === phase && also(v);
  const land = phase === 'dog' ? (v: NosingView) => v.phase === 'dog' : stop;
  let run = drive(puzzle, 'hints', land);
  for (let salt = 0; !land(run.v) && salt < 100; salt++) run = drive(puzzle, 'mixed', land, String(salt));
  if (!land(run.v)) throw new Error(`no bot reaches '${phase}' (seed ${spec.seed})`);
  // A challenge or a bonus hand can be a later turn. This one save plays the hint bot; the scans do not.
  if (phase === 'dog' && !stop(run.v)) {
    for (let turn = 0; turn < 8 && run.v.phase === 'dog' && !run.v.dog?.over && !stop(run.v); turn++) {
      let s = run.s;
      for (let k = 0; k < 3; k++) {
        const h = nosingHint(puzzle, s);
        if (!h) break;
        s = h.state;
      }
      const next = nosingStep(puzzle, s, { t: 'play' });
      if (next === s) break;
      run = { ...run, s: next, v: nosingView(puzzle, next) };
    }
  }
  if (!stop(run.v)) throw new Error(`no bot reaches '${phase}' (seed ${spec.seed})`);

  save.progress.games.nosing = { status: 'playing', data: run.s };
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: raw!.key, value: JSON.stringify(save) });
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Casebook' })).toBeVisible();
  await pickNosingClue(page);
}
