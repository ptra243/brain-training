import type { Page } from '@playwright/test';
import { test, expect } from './fixtures.ts';
import { checkScreen } from './rules.ts';

/** Home -> Choose games (Nosing around ticked) -> Start -> Clues -> Get a clue -> Nosing around. */
async function openNosing(page: Page) {
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
  await page.getByRole('navigation', { name: 'Casebook' }).getByRole('button', { name: 'Clues' }).click();
  await page.getByRole('button', { name: 'Get a clue' }).click();
  const dialog = page.getByRole('dialog', { name: 'Pick a game' });
  await dialog.locator('button.puzzle-row:not(.locked):not(.done)', { hasText: 'Nosing around' }).first().click();
  await expect(page.getByRole('heading', { name: 'Nosing around', level: 1 })).toBeVisible();
}

const typeNumber = async (page: Page, n: number) => {
  const pad = page.locator('.numpad').first();
  for (const d of String(n)) await pad.getByRole('button', { name: d, exact: true }).click();
  await pad.getByRole('button', { name: 'OK', exact: true }).click();
};

test.describe('nosing around', () => {
  test('Solve opens the lock, shows the way and unlocks the clues', async ({ page }) => {
    await openNosing(page);
    await expect(page.getByRole('button', { name: 'Roll', exact: true })).toBeVisible();
    await checkScreen(page, 'nosing: first roll');

    await page.getByRole('button', { name: 'Solve', exact: true }).click();
    await page.getByRole('dialog', { name: 'Solve this puzzle?' }).getByRole('button', { name: 'Solve it' }).click();
    await expect(page.locator('section.unlocked')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The cat shows the way' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Solve', exact: true })).toHaveCount(0);
    await checkScreen(page, 'nosing: solved');
  });

  test('play with the cat\'s hints: roll, answer, speed round, the lock', async ({ page }) => {
    test.setTimeout(180_000);
    await openNosing(page);

    const roll = page.getByRole('button', { name: 'Roll', exact: true });
    const move = page.getByRole('button', { name: 'Move', exact: true });
    const question = page.locator('.nosing-question');
    const speedStart = page.getByRole('button', { name: /^Start the \d+ seconds$/ });
    const tryNumber = page.getByRole('button', { name: /^Try this number/ });
    const unlocked = page.locator('section.unlocked');
    const hintButton = page.getByRole('button', { name: /for a hint$/ });
    /** The pad's OK button is fully on screen without scrolling. */
    const padOnScreen = async (scope: string) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      const box = await page.locator(scope).getByRole('button', { name: 'OK', exact: true }).boundingBox();
      expect(box, `${scope}: OK button`).not.toBeNull();
      expect(box!.y + box!.height, `${scope}: OK inside 780px`).toBeLessThanOrEqual(780);
    };
    const checked = new Set<string>();
    const checkOnce = async (label: string) => {
      if (checked.has(label)) return;
      checked.add(label);
      await checkScreen(page, label);
    };

    for (let guard = 0; guard < 120; guard++) {
      await roll.or(move).or(question).or(speedStart).or(tryNumber).or(unlocked).first().waitFor();
      if (await unlocked.isVisible()) break;

      if (await roll.isVisible()) {
        await checkOnce('nosing: roll');
        await roll.click();
      } else if (await move.isVisible()) {
        await move.click();
      } else if (await question.isVisible()) {
        // Ask the cat three times: the working, three choices, the answer.
        await hintButton.click();
        await hintButton.click();
        await expect(page.getByRole('group', { name: "The cat's three choices" })).toBeVisible();
        await checkOnce('nosing: question with choices');
        await padOnScreen('.nosing-question');
        await hintButton.click();
        const note = await page.locator('.hint-note').innerText();
        const answer = Number(/answer: (\d+)/.exec(note)?.[1]);
        expect(Number.isInteger(answer), note).toBe(true);
        await typeNumber(page, answer);
      } else if (await speedStart.isVisible()) {
        await checkOnce('nosing: speed round start');
        // Fake the clock from here so the 60 seconds pass at once.
        await page.clock.install();
        await speedStart.click();
        await expect(page.getByRole('timer')).toBeVisible();
        await checkOnce('nosing: speed round');
        await padOnScreen('.nosing-speed');
        await page.clock.runFor(61_000);
      } else if (await tryNumber.isVisible()) {
        await checkOnce('nosing: lock');
        // The cat's hints: first which two tiles, then it joins them for her.
        for (let k = 0; k < 12 && !(await tryNumber.isEnabled()); k++) {
          await hintButton.click();
          await hintButton.click();
        }
        await checkOnce('nosing: lock with a number made');
        await tryNumber.click();
      }
    }
    await expect(unlocked).toBeVisible();
    await expect(unlocked.getByRole('button', { name: 'Back to the casebook' })).toBeVisible();
    await checkScreen(page, 'nosing: won');
  });
});
