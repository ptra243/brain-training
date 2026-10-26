import { test, expect, newCase, openTab, skipOpening } from './fixtures.ts';
import { checkScreen } from './rules.ts';
import { walkTo } from './walk.ts';

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
  await skipOpening(page);
  await expect(page.getByRole('navigation', { name: 'Rounds' })).toBeVisible();

  const row = page.locator('.person-row', { hasText: 'The Butler' });
  await walkTo(page, row);
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
