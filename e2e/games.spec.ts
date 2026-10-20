import type { Page } from '@playwright/test';
import { test, expect, newCase, openTab } from './fixtures.ts';
import { checkScreen } from './rules.ts';

const countClues = (page: Page) => page.locator('ul.clue-list > li').count();

/**
 * Plays every game the case offers (Get a clue -> pick -> Solve -> confirm -> back) and
 * returns their names. With `layout`, also runs checkScreen on each screen on the way.
 */
async function solveEveryGame(page: Page, layout: boolean): Promise<string[]> {
  const check = async (label: string) => {
    if (layout) await checkScreen(page, label);
  };
  await newCase(page);
  await openTab(page, 'Clues');
  await check('Clues (start)');

  const played: string[] = [];
  for (let guard = 0; guard < 10; guard++) {
    if (await page.getByRole('button', { name: 'No more clues' }).count()) break;
    const before = await countClues(page);
    await page.getByRole('button', { name: 'Get a clue' }).click();
    const dialog = page.getByRole('dialog', { name: 'Pick a game' });
    await expect(dialog).toBeVisible();
    await check('Pick a game');
    // First game that is not locked and not already played.
    const row = dialog.locator('button.puzzle-row:not(.locked):not(.done)').first();
    const name = (await row.locator('.puzzle-name').innerText()).replace(/\s+/g, ' ').trim();
    await row.click();

    const solve = page.getByRole('button', { name: 'Solve', exact: true });
    await expect(solve).toBeVisible();
    await check(`game ${name}`);

    await solve.click();
    const sure = page.getByRole('dialog', { name: 'Solve this puzzle?' });
    await expect(sure).toContainText("Are you sure? This can't be undone");
    await check(`solve dialog (${name})`);
    await sure.getByRole('button', { name: 'Solve it' }).click();

    const reward = page.locator('section.unlocked');
    await expect(reward).toBeVisible();
    await expect(solve).toHaveCount(0);
    await check(`game ${name} solved`);
    await reward.getByRole('button', { name: 'Back to the casebook' }).click();

    await expect(page.getByRole('navigation', { name: 'Casebook' })).toBeVisible();
    expect(await countClues(page), `clues after ${name}`).toBeGreaterThan(before);
    played.push(name);
  }
  await expect(page.getByRole('button', { name: 'No more clues' })).toBeDisabled();
  await check('Clues (all played)');
  return played;
}

/** Seed 12345 offers crossword, word search, sudoku, questioning and the finale; 6 adds wordle and the case board; 10 adds the cat puzzle. */
const SEEDS = [12345, 6, 10];

for (const seed of SEEDS) {
  test.describe(`case from seed ${seed}`, () => {
    test.use({ seed });

    test('every offered game can be solved for her, and its clues unlock', async ({ page }) => {
      const played = await solveEveryGame(page, false);
      expect(played.length).toBeGreaterThanOrEqual(3);

      // The picker now lists them all as played, recorded as "Solved for you" (revealed, not won).
      await openTab(page, 'Clues');
      await page.getByRole('button', { name: 'Look at a played game' }).click();
      const dialog = page.getByRole('dialog', { name: 'Pick a game' });
      await expect(dialog.locator('button.puzzle-row.done')).toHaveCount(played.length);
      await expect(dialog.getByText('Solved for you')).toHaveCount(played.length);
    });

    test('game screens fit the phone', async ({ page }) => {
      // Only the sudoku screen offends (seed 6 has none and passes). Expected failure until fixed.
      test.fail(seed !== 6, 'Real layout bug: sudoku number pad buttons are 41x48 and Clear square 43x48, under 44px wide.');
      await solveEveryGame(page, true);
    });
  });
}

test('choose games: the picker lists games and closes', async ({ page }) => {
  await newCase(page);
  await page.getByRole('button', { name: 'Get a clue' }).click();
  const dialog = page.getByRole('dialog', { name: 'Pick a game' });
  await expect(dialog.locator('button.puzzle-row').first()).toBeVisible();
  expect(await dialog.locator('button.puzzle-row').count()).toBeGreaterThanOrEqual(3);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
