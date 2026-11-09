import { readFileSync } from 'node:fs';
import { finishedRuns } from '../src/dev/scenarios.ts';
import { expect, test, type Page } from './fixtures.ts';
import { checkScreen } from './rules.ts';

const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');

// A history built on this run with the app's own functions; the saves stay empty so nothing is pending.
const history = finishedRuns(true).history;

async function withHistory(page: Page, value: unknown) {
  await page.addInitScript(
    ({ key, json }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, json);
    },
    { key: `${PREFIX}history`, json: JSON.stringify(value) },
  );
}

test('the guest book shows the totals and signed entries, and Back returns to the bookcase', async ({ page }) => {
  await withHistory(page, history);
  await page.goto('/#shelf');
  await page.getByRole('link', { name: 'Your record: the guest book' }).click();
  await expect(page.getByRole('heading', { name: 'Guest book', level: 1 })).toBeVisible();
  await expect(page.getByText(/cases? solved\./)).toBeVisible();
  await expect(page.getByText(/campaigns?\./).first()).toBeVisible();
  await expect(page.getByTestId('guest-entry')).toHaveCount(4);
  await expect(page.getByTestId('guest-signature').first()).toBeVisible();
  await expect(page.getByText('left before dessert')).toBeVisible();
  await checkScreen(page, 'guest book');
  await page.getByRole('link', { name: 'Back to the shelf' }).click();
  await expect(page.getByRole('link', { name: 'Your record: the guest book' })).toBeVisible();
});

test('an empty guest book says no one has signed', async ({ page }) => {
  await page.goto('/#shelf/record');
  await expect(page.getByText('No one has signed yet.')).toBeVisible();
  await checkScreen(page, 'guest book, empty');
});
