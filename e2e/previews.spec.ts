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
  await expect(page.getByRole('button', { name: 'Hide finished (3)' })).toBeVisible();
  await expect(page.getByRole('button', { name: /, won, 2 hints$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /, solved by the cat$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Final puzzle, page \d+, locked/ })).toBeDisabled();
  await checkScreen(page, 'preview shelf-find-a-clue');
});

test('shelf-labels preview', async ({ page }) => {
  await page.goto('/#dev/shelf-labels');
  await expect(page.getByRole('heading', { name: 'Puzzle labels' })).toBeVisible();
  await expect(page.getByTestId('label-finale').first()).toContainText('Locked');
  await expect(page.getByTestId('label-wordle').first()).toBeVisible();
  await checkScreen(page, 'preview shelf-labels');
});

test('shelf-tin preview', async ({ page }) => {
  await page.goto('/#dev/shelf-tin');
  await expect(page.getByRole('button', { name: 'Stick them in' })).toBeEnabled();
  await expect(page.getByTestId('tin-count')).toHaveText('4 of 7 lifted');
  await checkScreen(page, 'preview shelf-tin');
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

test('shelf-puzzle previews', async ({ page }) => {
  await page.goto('/#dev/shelf-puzzle');
  await expect(page.getByRole('button', { name: 'Solve', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn back to page 3' })).toBeVisible();
  await checkScreen(page, 'preview shelf-puzzle');
  await page.goto('/#dev/shelf-puzzle-won');
  await expect(page.getByRole('button', { name: 'Turn back to page 3' }).last()).toBeVisible();
  await expect(page.getByText(/^Solved by /)).toHaveCount(0);
  await checkScreen(page, 'preview shelf-puzzle-won');
  await page.goto('/#dev/shelf-puzzle-revealed');
  await expect(page.getByText(/^Solved by /)).toBeVisible();
  await checkScreen(page, 'preview shelf-puzzle-revealed');
});

test('shelf-notebook previews', async ({ page }) => {
  await page.goto('/#dev/shelf-notebook');
  await expect(page.getByRole('button', { name: /^Notebook · (\d+ of \d+ to use|all clues used)$/ })).toBeVisible();
  await checkScreen(page, 'preview shelf-notebook');
  await page.goto('/#dev/shelf-notebook-subject');
  await expect(page.getByRole('button', { name: /^‹ Guests$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Move their counter' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Accuse / })).toBeVisible();
  await checkScreen(page, 'preview shelf-notebook-subject');
});

test('shelf-notebook-grid preview', async ({ page }) => {
  await page.goto('/#dev/shelf-notebook-grid');
  await expect(page.getByRole('navigation', { name: 'Notebook pages' }).getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: /^Ask .* for a hint$/ })).toBeVisible();
  await checkScreen(page, 'preview shelf-notebook-grid');
});

async function noSideways(page: import('@playwright/test').Page, label: string) {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(w[0], `${label}: sideways scroll`).toBeLessThanOrEqual(w[1]);
}

test('shelf-map previews', async ({ page }) => {
  await page.goto('/#dev/shelf-map');
  await expect(page.getByText('The house, after dinner')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Notebook · / })).toBeVisible();
  await noSideways(page, 'preview shelf-map');
  await page.goto('/#dev/shelf-map-subject');
  await expect(page.getByRole('heading', { name: 'Move their counter' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Accuse / })).toBeVisible();
  await expect(page.locator('[data-ringed]')).toHaveCount(1);
  await noSideways(page, 'preview shelf-map-subject');
  // The notebook's own buttons keep the 44px rule (the map's counters and weapons are 35px by design; the plate adds touch area).
  await expect.poll(() => page.getByRole('region', { name: 'Your notebook' }).getByRole('button').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 44).length)).toBe(0);
});

test('shelf-answer previews', async ({ page }) => {
  await page.goto('/#dev/shelf-answer');
  await expect(page.getByText('1 of 2 right. Keep digging.')).toBeVisible();
  await checkScreen(page, 'preview shelf-answer');
  await page.goto('/#dev/shelf-answer-solved');
  await expect(page.getByText('Case closed')).toBeVisible();
  await checkScreen(page, 'preview shelf-answer-solved');
});

test('shelf-new-case preview',async ({ page }) => {
  await page.goto('/#dev/shelf-new-case');
  await expect(page.getByRole('button', { name: 'Find a clue' })).toBeVisible();
  await checkScreen(page, 'preview shelf-new-case');
});

test('shelf-notebook-jigsaw preview', async ({ page }) => {
  await page.goto('/#dev/shelf-notebook-jigsaw');
  const tabs = page.getByRole('navigation', { name: 'Notebook pages' });
  await expect(tabs.getByRole('button', { name: 'Jigsaw' })).toHaveAttribute('aria-current', 'page');
  await expect(tabs.getByRole('button', { name: 'Grid' })).toHaveCount(0);
  await expect(page.locator('.cb-tray')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
