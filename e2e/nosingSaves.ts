import type { Page } from '@playwright/test';
import { expect } from './fixtures.ts';
import { content } from '../src/content/index.ts';
import { nosingLadders, nosingSnakes } from '../src/content/nosing.ts';
import { caseFor, type CaseRef } from '../src/engine/caseRef.ts';
import { buildNosing, nosingSeed, type NosingPhase } from '../src/games/nosing.ts';
import { drive } from '../src/games/nosingSweeps.ts';

/** Casebook -> Clues -> Get a clue -> Nosing around (the game must be in the list and not done). */
async function pickNosingClue(page: Page) {
  await page.getByRole('navigation', { name: 'Casebook' }).getByRole('button', { name: 'Clues' }).click();
  await page.getByRole('button', { name: 'Get a clue' }).click();
  const dialog = page.getByRole('dialog', { name: 'Pick a game' });
  await dialog.locator('button.puzzle-row:not(.locked):not(.done)', { hasText: 'Nosing around' }).first().click();
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
export async function openNosingAt(page: Page, phase: Exclude<NosingPhase, 'open'>) {
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
    house: content.house,
    seed: nosingSeed(spec.seed),
    level: spec.level!,
    sceneRoom: c.sceneRoom,
    clues: spec.clues.slice(),
    ladders: nosingLadders,
    snakes: nosingSnakes,
  });
  const run = drive(puzzle, 'hints', (v) => v.phase === phase);
  if (run.v.phase !== phase) throw new Error(`the hint bot never reaches '${phase}' (seed ${spec.seed}); it ended ${run.v.finished}`);

  save.progress.games.nosing = { status: 'playing', data: run.s };
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: raw!.key, value: JSON.stringify(save) });
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Casebook' })).toBeVisible();
  await pickNosingClue(page);
}
