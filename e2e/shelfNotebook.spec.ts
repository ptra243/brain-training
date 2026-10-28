import { readFileSync } from 'node:fs';
import { content } from '../src/content/index.ts';
import { newPlayCase } from '../src/engine/caseRef.ts';
import { emptyProgress } from '../src/game/state.ts';
import { PLAY_VERSION } from '../src/game/saveGuards.ts';
import { expect, test } from './fixtures.ts';

// A saved Quick case, built on this run with the app's own engine: #shelf reads it from storage.
const { ref } = newPlayCase(content, () => 0.5);
// The save prefix is read from storage.ts (which doesn't export it), so a prefix bump can't break this test.
const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');
const KEY = `${PREFIX}quick`;

test('the notebook: peek, open on Grid, a guest page, tuck away, and it remembers Grid', async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: KEY, value: JSON.stringify({ ref, progress: emptyProgress(), historyId: 'h-e2e', playVersion: PLAY_VERSION }) },
  );
  await page.goto('/#shelf');
  await page.getByRole('link', { name: /Your case, .*: continue/ }).click();
  await page.getByRole('button', { name: 'Find a clue' }).click();

  const peek = page.getByRole('button', { name: 'Notebook · no clues yet' });
  await expect(peek).toBeVisible();
  await peek.click();
  const tabs = page.getByRole('navigation', { name: 'Notebook pages' });
  await expect(tabs.getByRole('button', { name: 'Clues' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Play a puzzle from page 3 to find some.')).toBeVisible();

  await tabs.getByRole('button', { name: 'Grid' }).click();
  await page.locator('th[scope="row"] button').first().click();
  await expect(page.getByRole('button', { name: '‹ Grid' })).toBeVisible();
  await expect(page.getByText('Not placed yet')).toBeVisible();
  await expect(page.getByText("No clue you've found names them yet.")).toBeVisible();
  await page.getByRole('button', { name: '‹ Grid' }).click();
  await expect(page.getByRole('button', { name: /^Ask .* for a hint$/ })).toBeVisible();

  await page.getByRole('button', { name: 'Put the notebook away' }).click();
  await expect(peek).toBeVisible();
  await expect(peek).toBeFocused();

  // Reopening, even after a reload, is on the tab she last used.
  await page.reload();
  await page.getByRole('link', { name: /Your case, .*: continue/ }).click();
  await page.getByRole('button', { name: 'Notebook · no clues yet' }).click();
  await expect(page.getByRole('navigation', { name: 'Notebook pages' }).getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Notebook · no clues yet' })).toBeVisible();
});
