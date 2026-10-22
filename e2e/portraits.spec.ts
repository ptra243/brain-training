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
  const person = page.getByRole('dialog');
  const card = person.locator('.portrait.portrait-card');
  await expect(card.locator('svg')).toHaveCount(1);
  await expect(card.getByText('The Butler')).toBeVisible();
  // The art is a full 150 x 180 box inside the card, the name sits below it, and the title row is below the card.
  const art = (await card.locator('svg').boundingBox())!;
  const box = (await card.boundingBox())!;
  const name = (await card.getByText('The Butler').boundingBox())!;
  const title = (await person.getByRole('heading', { name: 'The Butler' }).boundingBox())!;
  expect(Math.round(art.width)).toBe(150);
  expect(Math.round(art.height)).toBe(180);
  expect(name.y).toBeGreaterThanOrEqual(art.y + art.height);
  expect(box.y + box.height).toBeGreaterThanOrEqual(name.y + name.height);
  expect(box.x).toBeLessThan(art.x);
  expect(title.y).toBeGreaterThanOrEqual(box.y + box.height);
  await checkScreen(page, 'person screen with portrait');
});
