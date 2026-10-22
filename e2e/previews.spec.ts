import { test, expect } from './fixtures.ts';
import { checkScreen } from './rules.ts';

// The #dev/<id> previews (src/dev/CLAUDE.md): each opens straight onto its screen and obeys the layout rules.

test('next-murder preview', async ({ page }) => {
  await page.goto('/#dev/next-murder');
  await expect(page.getByText("wasn't the killer")).toBeVisible();
  await checkScreen(page, 'preview next-murder');
});

test('escaped preview', async ({ page }) => {
  await page.goto('/#dev/escaped');
  await expect(page.getByText('The killer got away')).toBeVisible();
  await checkScreen(page, 'preview escaped');
});

test('guess-now preview', async ({ page }) => {
  await page.goto('/#dev/guess-now');
  await expect(page.getByText('Guess now?', { exact: true })).toBeVisible();
  await checkScreen(page, 'preview guess-now');
});

test('time-card preview', async ({ page }) => {
  await page.goto('/#dev/time-card');
  await expect(page.getByText('10:30')).toBeVisible();
  await checkScreen(page, 'preview time-card');
});

test('explore preview', async ({ page }) => {
  await page.goto('/#dev/explore');
  await expect(page.locator('.floorplan')).toBeVisible();
  await expect(page.locator('.case-title p')).toContainText('9:00');
  await checkScreen(page, 'preview explore');
});

test('midnight preview', async ({ page }) => {
  await page.goto('/#dev/midnight');
  await expect(page.getByRole('heading', { name: 'Midnight', level: 1 })).toBeVisible();
  await expect(page.locator('.room-list.greyed')).toBeVisible();
  await checkScreen(page, 'preview midnight');
});

test('portraits preview', async ({ page }) => {
  await page.goto('/#dev/portraits');
  await expect(page.locator('.pg-art svg').first()).toBeVisible();
  await checkScreen(page, 'preview portraits');
});

test('an unknown preview lists the real ones', async ({ page }) => {
  await page.goto('/#dev/nope');
  await expect(page.getByRole('link', { name: 'next-murder' })).toBeVisible();
});
