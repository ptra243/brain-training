import { expect, test } from './fixtures.ts';
import { checkScreen } from './rules.ts';

test('Shelf from Home opens the bookcase at the plain address; Classic from the bookcase goes back', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Casebook' })).toBeVisible();
  await page.getByRole('button', { name: 'Options' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Options' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Classic' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Shelf' }).click();

  await expect(page.getByText('Take a book off the shelf.')).toBeVisible();

  // The plain address now opens the bookcase, also after a fresh load.
  await page.goto('/');
  await expect(page.getByText('Take a book off the shelf.')).toBeVisible();
  const gear = await page.getByRole('button', { name: 'Options' }).boundingBox();
  expect(gear!.width).toBeGreaterThanOrEqual(44);
  expect(gear!.height).toBeGreaterThanOrEqual(44);

  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Shelf' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('dialog').getByRole('button', { name: 'Classic' }).click();
  await expect(page.getByRole('button', { name: 'New case' })).toBeVisible();
  await expect(page.getByText('Take a book off the shelf.')).toHaveCount(0);
  await expect(page).not.toHaveURL(/#shelf/);
});

test('#dev still opens the dev index when Shelf is chosen', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('brain-training-look', 'shelf'));
  await page.goto('/#dev');
  await expect(page.getByText('Take a book off the shelf.')).toHaveCount(0);
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect(page.locator('body.dev')).toHaveCount(1);
});

test('#dev index shows grouped sections and the filter narrows them', async ({ page }) => {
  await page.goto('/#dev');
  await expect(page.getByRole('heading', { name: /^Tools \(/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Load a game state \(/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Shelf: notebook \(/ })).toBeVisible();
  await checkScreen(page, 'dev index');
  await page.getByRole('searchbox', { name: 'Filter' }).fill('shelf-tin');
  await expect(page.getByRole('heading', { name: /^Shelf: shelf and extras \(1\)/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Tools \(/ })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Filter' }).fill('zzz-nothing');
  await expect(page.getByText('No dev page matches.')).toBeVisible();
});
