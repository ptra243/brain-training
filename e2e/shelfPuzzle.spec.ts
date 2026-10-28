import { readFileSync } from 'node:fs';
import { content } from '../src/content/index.ts';
import { newPlayCase } from '../src/engine/caseRef.ts';
import { emptyProgress } from '../src/game/state.ts';
import { PLAY_VERSION } from '../src/game/saveGuards.ts';
import { expect, test } from './fixtures.ts';

// A saved Quick case, built on this run with the app's own engine: #shelf reads it from storage.
const { ref, c } = newPlayCase(content, () => 0.5);
// The save prefix is read from storage.ts (which doesn't export it), so a prefix bump can't break this test.
const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');
const KEY = `${PREFIX}quick`;

test('a puzzle page: Solve, the clues, turn back, and the shared save says revealed', async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: KEY, value: JSON.stringify({ ref, progress: emptyProgress(), historyId: 'h-e2e', playVersion: PLAY_VERSION }) },
  );
  await page.goto('/#shelf');
  await page.getByRole('link', { name: /Your case, .*: continue/ }).click();
  // The opening comes first the first time.
  await page.getByRole('button', { name: 'Find a clue' }).click();
  const rows = page.getByRole('button', { name: /clues?\s*p\. \d+$/ });
  await expect(rows.first()).toBeVisible();
  const first = rows.first();
  const clueCount = c.games[0].clues.length;
  await first.click();

  const paper = page.getByTestId('puzzle-page');
  await expect(paper).toBeVisible();
  await expect(paper.getByRole('button', { name: 'Turn back to page 3' }).first()).toBeVisible();

  await paper.getByRole('button', { name: 'Solve', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Solve it' }).click();
  await expect(paper.getByText(/^Solved by /)).toBeVisible();
  await expect(paper.getByRole('button', { name: 'Solve', exact: true })).toHaveCount(0);
  await expect(paper.locator('li').first()).toBeVisible();

  await paper.getByRole('button', { name: 'Turn back to page 3' }).last().click();
  await expect(paper).toHaveCount(0);
  await expect(page.getByRole('button', { name: new RegExp(`Solved · ${clueCount} clues? found`) })).toBeVisible();

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
  expect(saved.progress.games[c.games[0].kind].status).toBe('revealed');
  expect(saved.historyId).toBe('h-e2e');
});
