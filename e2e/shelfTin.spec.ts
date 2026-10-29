import { readFileSync } from 'node:fs';
import { content } from '../src/content/index.ts';
import { newPlayCase } from '../src/engine/caseRef.ts';
import { PLAY_VERSION } from '../src/game/saveGuards.ts';
import { emptyProgress } from '../src/game/state.ts';
import { expect, test, type Page } from './fixtures.ts';
import { checkScreen } from './rules.ts';

const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');

const openTin = async (page: Page) => {
  await page.goto('/#shelf');
  await page.getByRole('link', { name: 'Choose your games' }).click();
  await expect(page.getByRole('region', { name: 'Tin of puzzle stickers' })).toBeVisible();
};
const stickers = (page: Page) => page.getByRole('region', { name: 'Tin of puzzle stickers' }).getByRole('button');
const liftedCount = async (page: Page) => (await stickers(page).evaluateAll((els) => els.filter((e) => e.getAttribute('aria-pressed') === 'true').length));
const names = (page: Page) => stickers(page).evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label')}|${e.getAttribute('aria-pressed')}`));

test('the tin shows nine stickers with a dealt hand of 3 to 5 lifted', async ({ page }) => {
  await openTin(page);
  await expect(stickers(page)).toHaveCount(9);
  const n = await liftedCount(page);
  expect(n).toBeGreaterThanOrEqual(3);
  expect(n).toBeLessThanOrEqual(5);
  await expect(page.getByTestId('tin-count')).toHaveText(`${n} of 7 lifted`);
  await expect(page.getByTestId('tin-case')).toHaveText(/^Logic [★☆]{3} · [457] guests$/);
  await checkScreen(page, 'sticker tin');
});

test('lifting up to 7, the 8th says to swap, pressing one down makes room', async ({ page }) => {
  await openTin(page);
  const all = stickers(page);
  for (let i = 0; i < 9 && (await liftedCount(page)) < 7; i++) {
    if ((await all.nth(i).getAttribute('aria-pressed')) === 'false') await all.nth(i).click();
  }
  await expect(page.getByTestId('tin-count')).toHaveText('7 of 7 lifted');
  await page.locator('[aria-pressed="false"]').first().click();
  await expect(page.getByRole('status').filter({ hasText: "That's 7. Press one down to swap." })).toBeVisible();
  await expect(page.getByTestId('tin-count')).toHaveText('7 of 7 lifted');
  await page.locator('[aria-pressed="true"]').first().click();
  await expect(page.getByTestId('tin-count')).toHaveText('6 of 7 lifted');
  await expect(page.getByRole('status').filter({ hasText: "That's 7" })).toHaveCount(0);
});

test('below 3 the button reads Lift N more and is disabled', async ({ page }) => {
  await openTin(page);
  while ((await liftedCount(page)) > 1) await page.locator('[aria-pressed="true"]').first().click();
  await expect(page.getByRole('button', { name: 'Lift 2 more' })).toBeDisabled();
  await page.locator('[aria-pressed="false"]').first().click();
  await expect(page.getByRole('button', { name: 'Lift 1 more' })).toBeDisabled();
});

test('shaking the tin deals a new hand of 3 to 5 with new stars', async ({ page }) => {
  await openTin(page);
  const before = await names(page);
  await page.getByRole('button', { name: 'Shake the tin' }).click();
  await expect(page.getByRole('status').filter({ hasText: /^A new hand of [345]\.$/ })).toBeVisible();
  const n = await liftedCount(page);
  expect(n).toBeGreaterThanOrEqual(3);
  expect(n).toBeLessThanOrEqual(5);
  expect(await names(page)).not.toEqual(before);
});

test('Stick them in builds the case and page 3 lists the lifted puzzles', async ({ page }) => {
  await openTin(page);
  const lifted = await stickers(page).evaluateAll((els) => els.filter((e) => e.getAttribute('aria-pressed') === 'true').map((e) => (e.getAttribute('aria-label') ?? '').split(',')[0]));
  await page.getByRole('button', { name: 'Stick them in' }).click();
  await page.getByRole('button', { name: 'Find a clue' }).click();
  await expect(page.getByRole('heading', { name: 'Find a clue' })).toBeVisible();
  for (const name of lifted) await expect(page.getByRole('button', { name: new RegExp(`^${name}, `) })).toBeVisible();
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), `${PREFIX}picks`);
  expect(saved).toHaveLength(lifted.length);
  expect(await page.evaluate((k) => localStorage.getItem(k) !== null, `${PREFIX}quick`)).toBe(true);
  await checkScreen(page, 'page 3 of a tin case');
});

test('with an unsolved Quick case, Stick them in asks first and Keep playing stays in the tin', async ({ page }) => {
  const { ref } = newPlayCase(content, () => 0.5);
  const value = JSON.stringify({ ref, progress: emptyProgress(), historyId: 'h-e2e', playVersion: PLAY_VERSION });
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: `${PREFIX}quick`, value },
  );
  await openTin(page);
  await page.getByRole('button', { name: 'Stick them in' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Start a new case?' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep playing' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Tin of puzzle stickers' })).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), `${PREFIX}quick`)).toBe(value);
  expect(await page.evaluate((k) => localStorage.getItem(k), `${PREFIX}picks`)).toBeNull();
});
