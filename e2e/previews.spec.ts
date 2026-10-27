import { test, expect } from './fixtures.ts';
import { checkScreen } from './rules.ts';

// The #dev/<id> previews (src/dev/CLAUDE.md): each opens straight onto its screen and obeys the layout rules.

test('next-murder preview', async ({ page }) => {
  await page.goto('/#dev/next-murder');
  await expect(page.getByText("wasn't the killer")).toBeVisible();
  await checkScreen(page, 'preview next-murder');
});

test('hints preview', async ({ page }) => {
  await page.goto('/#dev/hints');
  await expect(page.getByRole('heading', { name: 'The Butler is in the chair' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Ask .* for a hint$/ }).first()).toBeVisible();
  await expect(page.getByRole('status')).toContainText('sits on a mark');
  await checkScreen(page, 'preview hints');
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

test('you-sheet preview', async ({ page }) => {
  await page.goto('/#dev/you-sheet');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'You' })).toBeVisible();
  await expect(page.getByText(/\d+ of \d+ clues found/)).toBeVisible();
  await checkScreen(page, 'preview you-sheet');
});

test('houses preview', async ({ page }) => {
  await page.goto('/#dev/houses');
  await expect(page.getByRole('heading', { name: 'The Courtyard House' })).toBeVisible();
  await expect(page.locator('.door-gap').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'long/m270' })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'tlodge/r90' })).toBeAttached();
  await checkScreen(page, 'preview houses');
});

test('motives preview', async ({ page }) => {
  await page.goto('/#dev/motives');
  await expect(page.getByRole('heading', { name: 'Motive threads' })).toBeVisible();
  await page.getByRole('button', { name: 'Hear all' }).click();
  await expect(page.locator('ol.talk-log li').first()).toBeVisible();
  await page.getByRole('combobox', { name: /Victim/ }).selectOption({ index: 1 });
  await checkScreen(page, 'preview motives');
});

test('portraits preview', async ({ page }) => {
  await page.goto('/#dev/portraits');
  await expect(page.locator('.pg-art svg').first()).toBeVisible();
  await checkScreen(page, 'preview portraits');
});

test('dogfight preview', async ({ page }) => {
  await page.goto('/#dev/dogfight');
  await expect(page.getByRole('heading', { name: 'Dog fight states' })).toBeVisible();
  await checkScreen(page, 'preview dogfight');
});

test('shelf-ribbons preview', async ({ page }) => {
  await page.goto('/#dev/shelf-ribbons');
  await expect(page.getByRole('heading', { name: 'Find a clue' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Map' })).toBeVisible();
  await checkScreen(page, 'preview shelf-ribbons');
});

test('shelf-find-a-clue preview', async ({ page }) => {
  await page.goto('/#dev/shelf-find-a-clue');
  await expect(page.getByRole('heading', { name: 'Find a clue' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hide finished (1)' })).toBeVisible();
  await checkScreen(page, 'preview shelf-find-a-clue');
});

test('an unknown preview lists the real ones', async ({ page }) => {
  await page.goto('/#dev/nope');
  await expect(page.getByRole('link', { name: 'next-murder' })).toBeVisible();
});

for (const id of ['opening', 'opening-midway', 'opening-cat', 'opening-skip']) {
  test(`${id} preview`, async ({ page }) => {
    await page.goto(`/#dev/${id}`);
    await expect(page.getByTestId('opening-scene')).toBeVisible();
    if (id === 'opening') await expect(page.getByTestId('opening-count')).toContainText('0 of');
    if (id === 'opening-midway') await expect(page.getByTestId('opening-person')).toBeVisible();
    if (id === 'opening-cat') await expect(page.getByTestId('opening-cat')).toBeVisible();
    if (id === 'opening-skip') await expect(page.getByRole('dialog', { name: 'Skipped' })).toBeVisible();
    await checkScreen(page, `preview ${id}`);
  });
}
