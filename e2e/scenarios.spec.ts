import { test, expect, tabBar } from './fixtures.ts';
import { checkScreen } from './rules.ts';

// The #dev/load/<id> scenarios (src/dev/scenarios.ts): each asks first, then opens the real game on its save.

async function load(page: import('@playwright/test').Page, id: string) {
  await page.goto(`/#dev/load/${id}`);
  await expect(page.getByRole('dialog', { name: `Load "${id}"?` })).toBeVisible();
  await page.getByRole('button', { name: 'Load it' }).click();
}

for (const id of ['campaign-start', 'campaign-midnight', 'campaign-last-round']) {
  test(`load ${id}`, async ({ page }) => {
    await load(page, id);
    await expect(tabBar(page)).toBeVisible();
    await checkScreen(page, `scenario ${id}`);
  });
}

test('load finished-runs', async ({ page }) => {
  await load(page, 'finished-runs');
  await expect(page.getByText('You caught the killer.')).toBeVisible();
  await page.getByRole('button', { name: 'Your record' }).first().click();
  await expect(page.getByRole('heading', { name: 'Your record', level: 1 })).toBeVisible();
  await checkScreen(page, 'scenario finished-runs');
});

test('cancel keeps the saved game and returns to the index', async ({ page }) => {
  await page.goto('/#dev/load/campaign-start');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'Dev pages' })).toBeVisible();
});
