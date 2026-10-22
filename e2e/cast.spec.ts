import { test, expect, newCase, openTab } from './fixtures.ts';
import { checkScreen } from './rules.ts';

// Seed 3's first draw builds a known dinner (scanned once; the cast is rolled from the case code):
//  - New case: The Conjurer is the victim, the Butler is seated, and only the elder heir is at dinner.
//  - New campaign (setup defaults): The Financier is the victim, the Butler is seated, only the elder heir.
test.use({ seed: 3 });

test('a new case names the body above the opening, and a lone heir is "The Heir"', async ({ page }) => {
  await newCase(page);
  await openTab(page, 'Clues');

  const victim = page.getByText('The Conjurer was found dead after dinner.');
  await expect(victim).toBeVisible();
  const opening = (await page.locator('.case-opening').boundingBox())!;
  const line = (await victim.boundingBox())!;
  expect(line.y + line.height, 'the body line sits above the opening').toBeLessThanOrEqual(opening.y);
  await checkScreen(page, 'new case, clues tab');

  await openTab(page, 'Map');
  await expect(page.locator('.tray').getByRole('button', { name: 'The Heir', exact: true })).toBeVisible();
  await expect(page.getByText('Elder heir')).toHaveCount(0);
  await expect(page.getByText('Younger heir')).toHaveCount(0);
  // No checkScreen here: the Map tab's counters and weapons are 35px tall by design, and no spec checks it.
});

test('a new campaign names the body on the Clues tab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New campaign' }).click();
  await page.getByRole('button', { name: 'Start the campaign' }).click();
  await expect(page.getByRole('navigation', { name: 'Rounds' })).toBeVisible();

  await openTab(page, 'Clues');
  await expect(page.getByText('The Financier was found dead after dinner.')).toBeVisible();
  await checkScreen(page, 'new campaign, clues tab');
});
