import { test, expect, newCase, openTab } from './fixtures.ts';
import { checkScreen } from './rules.ts';

// Only the Butler has a drawn portrait in the current content; everyone else keeps their initials.

test('map tray: the Butler counter shows a portrait, another guest keeps initials', async ({ page }) => {
  await newCase(page);
  await openTab(page, 'Map');
  const butler = page.locator('.tray .counter[data-suspect="butler"]');
  await expect(butler).toBeVisible();
  await expect(butler).toHaveClass(/has-portrait/);
  await expect(butler.locator('svg')).toHaveCount(1);
  await expect(butler).toHaveAttribute('aria-label', 'The Butler');

  const other = page.locator('.tray .counter:not([data-suspect="butler"])').first();
  await expect(other).not.toHaveClass(/has-portrait/);
  await expect(other.locator('svg')).toHaveCount(0);
  await expect(other).toHaveText(/^\S{2}$/);

  // Her sheet from the tray shows the portrait head too.
  await butler.click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.locator('.counter.static.has-portrait svg')).toHaveCount(1);
  await checkScreen(page, 'butler sheet');
});

test('campaign person dialog: the Butler shows the large portrait card with the role name', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New campaign' }).click();
  await page.getByRole('button', { name: 'Start the campaign' }).click();
  await expect(page.getByRole('navigation', { name: 'Rounds' })).toBeVisible();

  const rooms = page.locator('.floorplan .tile-hit');
  const row = page.locator('.person-row', { hasText: 'The Butler' });
  const n = await rooms.count();
  for (let i = 0; i < n && (await row.count()) === 0; i++) await rooms.nth(i).click();
  await expect(row, 'the Butler is in some room').toHaveCount(1);
  await expect(row.locator('.counter.has-portrait svg')).toHaveCount(1);

  await row.click();
  const person = page.getByRole('dialog', { name: 'Talking to The Butler' });
  const cards = person.locator('.portrait.portrait-card');
  await expect(cards).toHaveCount(2);
  const you = person.locator('.portrait-card', { hasText: 'You' });
  const butler = person.locator('.portrait-card', { hasText: 'The Butler' });
  await expect(butler.locator('svg')).toHaveCount(1);
  await expect(butler.getByText('The Butler')).toBeVisible();
  const youBox = (await you.boundingBox())!;
  const butlerBox = (await butler.boundingBox())!;
  expect(youBox.x).toBeLessThan(butlerBox.x);
  await checkScreen(page, 'person screen with portrait');
});
