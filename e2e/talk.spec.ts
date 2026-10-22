import { test, expect, newCase, openTab } from './fixtures.ts';
import { touchTap, centre } from './touch.ts';
import { checkScreen } from './rules.ts';

test('a guest\'s sheet lets her hear their first beat, which fills one pip', async ({ page }) => {
  await newCase(page);
  await openTab(page, 'Map');
  await touchTap(page, await centre(page.locator('.tray .counter').first()));

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const talk = dialog.getByRole('region', { name: 'Talk' });
  await expect(talk).toBeVisible();
  await expect(talk.locator('.pip.filled')).toHaveCount(0);
  await expect(talk.locator('.talk-log')).toHaveCount(0);

  await talk.getByRole('button', { name: 'Tell me about yourself' }).click();
  await expect(talk.locator('.talk-log li')).toHaveCount(1);
  await expect(talk.locator('.pip.filled')).toHaveCount(1);
  // Only one beat is ready at the start, so there is nothing more to say yet.
  await expect(talk.getByText('Nothing more to say yet.')).toBeVisible();

  await checkScreen(page, 'suspect sheet with talk');
});
