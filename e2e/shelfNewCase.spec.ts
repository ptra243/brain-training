import { readFileSync } from 'node:fs';
import { content } from '../src/content/index.ts';
import { newPlayCase } from '../src/engine/caseRef.ts';
import { emptyProgress } from '../src/game/state.ts';
import { PLAY_VERSION } from '../src/game/saveGuards.ts';
import { expect, test } from './fixtures.ts';

const { ref } = newPlayCase(content, () => 0.5);
const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');
const KEY = `${PREFIX}quick`;

test('New case builds a real case, shows its opening and saves it as the Quick case', async ({ page }) => {
  await page.goto('/#shelf');
  await page.getByRole('link', { name: 'New case' }).click();
  await expect(page.getByRole('button', { name: 'Find a clue' })).toBeVisible();
  await expect(page.getByText(/was found dead after dinner/)).toBeVisible();
  const saved = await page.evaluate((k) => localStorage.getItem(k), KEY);
  expect(saved).not.toBeNull();
  await page.getByRole('button', { name: 'Find a clue' }).click();
  await expect(page.getByRole('button', { name: /^Notebook/ })).toBeVisible();
  // Back on the shelf the new case is her case in progress.
  await page.getByRole('button', { name: 'Back to the shelf' }).click();
  await expect(page.getByRole('link', { name: /Your case, .*: continue/ })).toBeVisible();
});

test('with an unsolved Quick case, New case asks first and Keep playing leaves the save alone', async ({ page }) => {
  const value = JSON.stringify({ ref, progress: emptyProgress(), historyId: 'h-e2e', playVersion: PLAY_VERSION });
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: KEY, value },
  );
  await page.goto('/#shelf');
  await page.getByRole('link', { name: 'New case' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Start a new case?' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep playing' }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe(value);
  await expect(page.getByRole('button', { name: 'Back to the shelf' })).toHaveCount(0);
});
