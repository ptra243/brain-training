import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { content } from '../src/content/index.ts';
import { newPlayCase, newQuickCase } from '../src/engine/caseRef.ts';
import { endBoard } from '../src/engine/caseBoard.ts';
import { boardInitial, cellsKey, makeRules, normCells, trayIds, truthPlacement } from '../src/game/board/boardSave.ts';
import { emptyProgress, sceneUnlocked, unlockedClueIds } from '../src/game/state.ts';
import { PLAY_VERSION } from '../src/game/saveGuards.ts';
import { expect, test } from './fixtures.ts';
import { centre, touchDrag } from './touch.ts';

const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');
const KEY = `${PREFIX}quick`;

const quick = newQuickCase(content, 'medium', 'normal', 'classic', () => 0.5);
const jigsawSave = { ref: { ...quick.ref, endBoard: true }, progress: emptyProgress(), historyId: 'h-e2e', playVersion: PLAY_VERSION };
const play = newPlayCase(content, () => 0.5);
const playSave = { ref: play.ref, progress: emptyProgress(), historyId: 'h-e2e', playVersion: PLAY_VERSION };

async function openNotebook(page: Page, save: unknown) {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: KEY, value: JSON.stringify(save) },
  );
  await page.goto('/#shelf');
  await page.getByRole('link', { name: /Your case, .*: continue/ }).click();
  await page.getByRole('button', { name: /^Notebook · / }).click();
  return page.getByRole('region', { name: 'Your notebook' });
}

test('a Play case shows both Grid and Jigsaw, and no You', async ({ page }) => {
  const notebook = await openNotebook(page, playSave);
  const tabs = notebook.getByRole('navigation', { name: 'Notebook pages' });
  await expect(tabs.getByRole('button', { name: 'Grid' })).toBeVisible();
  await expect(tabs.getByRole('button', { name: 'Jigsaw' })).toBeVisible();
  await expect(tabs.getByRole('button', { name: 'You' })).toHaveCount(0);
  for (const b of await tabs.getByRole('button').all()) {
    const box = (await b.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test('a Jigsaw-finish Quick case: Jigsaw tab, no Grid; a sticker placed by touch is in the classic save', async ({ page }) => {
  const notebook = await openNotebook(page, jigsawSave);
  const tabs = notebook.getByRole('navigation', { name: 'Notebook pages' });
  await expect(tabs.getByRole('button', { name: 'Jigsaw' })).toBeVisible();
  await expect(tabs.getByRole('button', { name: 'Grid' })).toHaveCount(0);
  await tabs.getByRole('button', { name: 'Jigsaw' }).click();
  await expect(tabs.getByRole('button', { name: 'Jigsaw' })).toHaveAttribute('aria-current', 'page');

  const tray = notebook.locator('.cb-tray');
  await expect(tray).toBeVisible();
  const pieces = tray.locator('.cb-tpiece');
  const before = await pieces.count();
  expect(before).toBeGreaterThan(0);
  // The drawer sits just above the tabs, two rows of 44px at most.
  const drawer = (await tray.boundingBox())!;
  const tabBox = (await tabs.boundingBox())!;
  expect(Math.abs(drawer.y + drawer.height - tabBox.y)).toBeLessThan(20);
  expect(drawer.height).toBeLessThan(140);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // Press a sticker onto its true place (real touch): the engine's own board says where that is.
  const progress = jigsawSave.progress;
  const unlocked = unlockedClueIds(quick.c, progress);
  const board = endBoard(content, quick.c, unlocked, sceneUnlocked(quick.c, progress), quick.c.games.filter((g) => !g.unlocksScene).length)!;
  const rules = makeRules(board, quick.c.levels.logic, false, quick.c.guests);
  const ids = trayIds(rules, boardInitial());
  const pid = ids.find((id) => cellsKey(truthPlacement(board, id).shape) === cellsKey(normCells(board.pieces.find((p) => p.id === id)!.shape)))!;
  const [row, col] = truthPlacement(board, pid).cells[0];
  const cell = notebook.locator(`.cb-bc[data-cbr="${row}"][data-cbc="${col}"]`);
  const square = tray.locator(`.cb-pc[data-cbpid="${pid}"]`).first();
  await cell.scrollIntoViewIfNeeded();
  await touchDrag(page, await centre(square), await centre(cell));
  const placed = (await notebook.locator(`.cb-board [data-cbpid="${pid}"]`).count()) > 0;
  expect(placed).toBe(true);
  await expect(pieces).toHaveCount(before - 1);

  // The classic save sees the move.
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
  expect(Object.keys(saved.progress.endBoard.save.placed)).toContain(pid);
});

test('a saved Grid tab opens Jigsaw in a Jigsaw case', async ({ page }) => {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), ['brain-training:shelf:notebook-tab', 'grid']);
  const notebook = await openNotebook(page, jigsawSave);
  await expect(notebook.getByRole('navigation', { name: 'Notebook pages' }).getByRole('button', { name: 'Jigsaw' })).toHaveAttribute('aria-current', 'page');
});
