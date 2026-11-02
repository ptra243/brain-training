import { readFileSync } from 'node:fs';
import { content } from '../src/content/index.ts';
import { newPlayCase } from '../src/engine/caseRef.ts';
import { emptyProgress, reduce } from '../src/game/state.ts';
import { PLAY_VERSION } from '../src/game/saveGuards.ts';
import { roomName } from '../src/game/names.ts';
import { expect, test } from './fixtures.ts';
import { checkScreen } from './rules.ts';

// A saved Quick case with three games won (so it has clues), built on this run with the app's own engine.
const { ref, c } = newPlayCase(content, () => 0.5);
let progress = emptyProgress();
for (const g of c.games.slice(0, 3)) progress = reduce(c, progress, { type: 'game-finish', kind: g.kind, status: 'won', data: null });
const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: `${PREFIX}quick`, value: JSON.stringify({ ref, progress, historyId: 'h-e2e', playVersion: PLAY_VERSION }) },
  );
  await page.goto('/#shelf');
  await page.getByRole('link', { name: /Your case, .*: continue/ }).click();
  await page.getByRole('button', { name: 'Find a clue' }).click();
  await page.getByRole('button', { name: /^Notebook · / }).tap();
  await page.getByRole('navigation', { name: 'Notebook pages' }).getByRole('button', { name: 'Grid' }).tap();
});

const strip = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /^Clues · / });
const sheet = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Clues and house' });

test('a grid name filters the sheet, and Open their page reaches the subject', async ({ page }) => {
  await expect(strip(page)).toHaveText(/^Clues · \d+ of \d+ to use$/);
  await checkScreen(page, 'grid sheet closed');
  await page.locator('th[scope="row"] button').first().tap();
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page).getByText('Showing clues about')).toBeVisible();
  await checkScreen(page, 'grid sheet clues');
  const box = await sheet(page).boundingBox();
  expect(box?.height).toBeLessThanOrEqual(241);
  await sheet(page).getByRole('button', { name: 'Show all' }).tap();
  await expect(sheet(page).getByText('Showing clues about')).toHaveCount(0);
  await page.locator('th[scope="row"] button').first().tap();
  await sheet(page).getByRole('button', { name: 'Open their page' }).tap();
  await expect(page.getByRole('button', { name: '‹ Grid' })).toBeVisible();
});

test('the House face shows the plan, and a room tap filters the clues to that room', async ({ page }) => {
  await page.getByRole('button', { name: 'House', exact: true }).tap();
  await expect(sheet(page)).toBeVisible();
  await checkScreen(page, 'grid sheet house');
  await sheet(page).locator('.tile', { hasText: roomName(c.rooms[0]) }).first().tap();
  await expect(sheet(page).getByText('Showing clues about')).toBeVisible();
  await expect(sheet(page).getByText(`the ${roomName(c.rooms[0])}`).first()).toBeVisible();
  await expect(sheet(page).locator('.floorplan')).toHaveCount(0);
});

test('Back closes the sheet before the notebook', async ({ page }) => {
  await strip(page).tap();
  await expect(sheet(page)).toBeVisible();
  await page.goBack();
  await expect(sheet(page).getByRole('button', { name: 'Close' })).toHaveCount(0);
  await expect(strip(page)).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Notebook pages' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: /^Notebook · / })).toBeVisible();
});
