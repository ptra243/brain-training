import { test, expect, newCase, openTab } from './fixtures.ts';
import { checkScreen } from './rules.ts';

test('campaign: home, setup, start, campaign view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New campaign' }).click();
  await expect(page.getByRole('heading', { name: 'New campaign', level: 1 })).toBeVisible();
  await checkScreen(page, 'campaign setup');

  await page.getByRole('button', { name: 'Start the campaign' }).click();
  const rounds = page.getByRole('navigation', { name: 'Rounds' });
  await expect(rounds).toBeVisible();
  await expect(rounds.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true');
  await checkScreen(page, 'campaign view');
  await openTab(page, 'Clues');
  await checkScreen(page, 'campaign clues');

  // Back home, the campaign card offers to continue it.
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});

test('reload mid-case lands back in the same case with its progress', async ({ page }) => {
  await newCase(page);
  const title = (await page.getByRole('heading', { level: 1 }).innerText()).trim();

  await page.getByRole('button', { name: 'Get a clue' }).click();
  await page.getByRole('dialog', { name: 'Pick a game' }).locator('button.puzzle-row:not(.locked)').first().click();
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await page.getByRole('dialog', { name: 'Solve this puzzle?' }).getByRole('button', { name: 'Solve it' }).click();
  await page.locator('section.unlocked').getByRole('button', { name: 'Back to the casebook' }).click();
  await openTab(page, 'Map');
  await expect(page.locator('.floorplan')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Casebook' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await openTab(page, 'Clues');
  await expect(page.getByText(/^1 of \d+ games played/)).toBeVisible();
  expect(await page.locator('ul.clue-list > li').count()).toBeGreaterThan(0);
});
