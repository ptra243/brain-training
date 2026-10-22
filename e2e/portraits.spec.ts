import { test, expect, newCase, openTab } from './fixtures.ts';
import { checkScreen } from './rules.ts';

// Seed 12345's campaign makes the Butler the victim, so they are in no room: seed 3 seats them.
test.use({ seed: 3 });

// All ten guests have a drawn portrait; the initials remain only as a fallback for a guest without one.

test('map tray: every counter shows a portrait, and the Butler is named', async ({ page }) => {
  await newCase(page);
  await openTab(page, 'Map');
  const butler = page.locator('.tray .counter[data-suspect="butler"]');
  await expect(butler).toBeVisible();
  await expect(butler).toHaveClass(/has-portrait/);
  await expect(butler.locator('svg')).toHaveCount(1);
  await expect(butler).toHaveAttribute('aria-label', 'The Butler');

  const counters = page.locator('.tray .counter');
  const n = await counters.count();
  expect(n).toBeGreaterThan(1);
  for (let i = 0; i < n; i++) {
    await expect(counters.nth(i)).toHaveClass(/has-portrait/);
    await expect(counters.nth(i).locator('svg')).toHaveCount(1);
  }

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
