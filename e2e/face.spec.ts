import { test, expect, openTab } from './fixtures.ts';
import { checkScreen } from './rules.ts';

// Face to face: after an accusation in a campaign the accused is questioned before the verdict shows.

async function accuseFirstGuest(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New campaign' }).click();
  await page.getByRole('button', { name: 'Start the campaign' }).click();
  await expect(page.getByRole('navigation', { name: 'Rounds' })).toBeVisible();
  await openTab(page, 'Accuse');
  // With the fixture's seed the first guest is not the killer.
  await page.getByRole('group', { name: 'Who' }).getByRole('button').first().click();
  await page.getByRole('group', { name: 'With what' }).getByRole('button').first().click();
  await page.getByRole('button', { name: 'Make the accusation' }).click();
  await page.getByRole('dialog', { name: 'Guess now?' }).getByRole('button', { name: /guess/i }).click();
}

test('accusing an innocent opens the questioning; skipping goes to the next-body scene', async ({ page }) => {
  await accuseFirstGuest(page);
  await expect(page.getByRole('heading', { name: /is in the chair$/ })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await checkScreen(page, 'face to face');

  await page.getByRole('button', { name: 'Skip to the verdict' }).click();
  await expect(page.getByRole('dialog', { name: /wasn't the killer$/ })).toBeVisible();
});

test('asking a question and saying the story holds shows a closing line, then the verdict', async ({ page }) => {
  await accuseFirstGuest(page);
  await page.locator('.question').first().click();
  await expect(page.locator('.transcript .exchange')).toHaveCount(1);
  await page.getByRole('button', { name: 'Their story holds' }).click();
  await expect(page.locator('.face-line')).toBeVisible();
  await checkScreen(page, 'face to face, ending');
  await page.getByRole('button', { name: 'On to the verdict' }).click();
  await expect(page.getByRole('dialog', { name: /wasn't the killer$/ })).toBeVisible();
});

test('a reload during the questioning replays it and keeps the accusation', async ({ page }) => {
  await accuseFirstGuest(page);
  await expect(page.getByRole('heading', { name: /is in the chair$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /is in the chair$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Skip to the verdict' }).click();
  await expect(page.getByRole('dialog', { name: /wasn't the killer$/ })).toBeVisible();
});
