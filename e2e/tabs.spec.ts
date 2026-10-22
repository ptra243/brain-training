import { test, expect, newCase, openTab } from './fixtures.ts';
import { checkScreen } from './rules.ts';

test('home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Casebook' })).toBeVisible();
  await checkScreen(page, 'home');
});

for (const tab of ['Clues', 'Map', 'Grid', 'Jigsaw', 'Accuse']) {
  test(`casebook tab: ${tab}`, async ({ page }) => {
    // Expected failures (test.fail) flip to a failure once the layout is fixed, so the annotation can't go stale.
    test.fail(tab === 'Map', 'Real layout bug: map counters and weapons are 35px tall, under the 44px touch target rule.');
    test.fail(tab === 'Grid', 'Real layout bug: grid axis labels are 28px wide (rooms, weapons across) or 40px tall (suspect and weapon rows).');
    await newCase(page);
    await openTab(page, tab);
    await expect(page.getByRole('button', { name: tab, exact: true }).and(page.locator('[aria-current="page"]'))).toBeVisible();
    await checkScreen(page, tab);
  });
}

test('the logic grid fills the screen width and shows every square', async ({ page }) => {
  await newCase(page);
  await openTab(page, 'Grid');
  const box = await page.locator('table.logic-grid').boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(300);
  await expect(page.locator('table.logic-grid button.mark').last()).toBeInViewport();
});
