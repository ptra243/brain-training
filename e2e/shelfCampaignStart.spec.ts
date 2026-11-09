import { readFileSync } from 'node:fs';
import { content } from '../src/content/index.ts';
import { codeNumber } from '../src/engine/caseRef.ts';
import { campaignStart } from '../src/dev/scenarios.ts';
import { runCaseJob } from '../src/game/caseJobs.ts';
import { roundCase } from '../src/game/campaignSave.ts';
import { suspectName } from '../src/game/names.ts';
import { openingScript } from '../src/game/opening.ts';
import { checkScreen } from './rules.ts';
import { expect, test } from './fixtures.ts';

const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');
const KEY = `${PREFIX}campaign`;

type Page = import('@playwright/test').Page;
const saved = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);

async function startHard(page: Page) {
  await page.goto('/#shelf');
  await page.getByRole('link', { name: 'New campaign' }).click();
  await expect(page.getByTestId('campaign-title')).toBeVisible();
  await page.getByRole('radio', { name: 'Hard' }).click();
  await page.getByRole('radio', { name: 'Two' }).click();
  await page.getByRole('button', { name: 'Break the seal' }).click();
  await expect(page.getByTestId('campaign-opening')).toBeVisible({ timeout: 20000 });
}

test('the title page: pick Hard and two clues, break the seal, meet a guest, skip to chapter one', async ({ page }) => {
  await page.goto('/#shelf');
  await page.getByRole('link', { name: 'New campaign' }).click();
  await expect(page.getByTestId('campaign-title')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A murder in three chapters' })).toBeVisible();
  // Opens on the defaults: Medium, three clues, anyone, Grid.
  await expect(page.getByRole('radio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'Three' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: 'Show the ribbons' })).toBeHidden();
  await expect(page.getByRole('button', { name: /^Notebook/ })).toHaveCount(0);
  await checkScreen(page, 'shelf campaign title');

  await page.getByRole('radio', { name: 'Hard' }).click();
  await page.getByRole('radio', { name: 'Two' }).click();
  await page.getByRole('radio', { name: 'Only possible killers' }).click();
  await expect(page.getByRole('radio', { name: 'Hard' })).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
  await page.getByRole('button', { name: 'Break the seal' }).click();
  await expect(page.getByTestId('campaign-opening')).toBeVisible({ timeout: 20000 });

  // The save is the one the classic shell makes for the same choices and the same code.
  const save = await saved(page);
  expect(save.ref).toMatchObject({ mode: 'campaign', difficulty: 'hard', possibleOnly: true, perPuzzle: 2 });
  const classic = runCaseJob(content, { kind: 'campaign-new', difficulty: 'hard', possibleOnly: true, endBoard: false, perPuzzle: 2 }, () => codeNumber(save.ref.code));
  expect(save).toEqual(JSON.parse(JSON.stringify(classic.save)));

  // The opening page: no ribbons, no notebook; nobody met yet.
  await expect(page.getByTestId('opening-count')).toContainText('0 of');
  await expect(page.getByRole('button', { name: 'Show the ribbons' })).toBeHidden();
  await expect(page.getByRole('button', { name: /^Notebook/ })).toHaveCount(0);
  await checkScreen(page, 'shelf campaign opening');

  // Meet a guest who gives a free clue.
  const c = roundCase(content, save, 0);
  const guest = openingScript(c).guests.find((g) => g.clues.length > 0)!.guest;
  await page.getByRole('button', { name: new RegExp(`^${suspectName(guest, c.guests)}`) }).click();
  const spread = page.getByTestId('opening-spread');
  await expect(spread).toBeVisible();
  await expect(spread.getByText('New clue').first()).toBeVisible();
  await checkScreen(page, 'shelf campaign opening spread');
  await spread.getByRole('button', { name: 'Close' }).click();
  await expect(spread).toHaveCount(0);
  await expect(page.getByTestId('opening-count')).toContainText('1 of');
  expect((await saved(page)).rounds[0].opening.talked).toEqual([guest]);

  // Reload mid-opening: the book picks it up where it was.
  await page.reload();
  await page.getByRole('link', { name: /Your campaign, .*: continue/ }).click();
  await expect(page.getByTestId('opening-count')).toContainText('1 of');
  // Tapping the same guest again does not meet them twice.
  await page.getByRole('button', { name: new RegExp(`^${suspectName(guest, c.guests)}`) }).click();
  await page.getByTestId('opening-spread').getByRole('button', { name: 'Close' }).click();
  expect((await saved(page)).rounds[0].opening.talked).toEqual([guest]);

  // Skip hands over everything and the room page appears with its ribbons.
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Open the casebook' }).click();
  await expect(page.getByTestId('campaign-opening')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Chapter one: 9pm' })).toBeVisible();
  await page.getByRole('button', { name: 'Show the ribbons' }).click();
  for (const name of ['Room', 'Plan', 'Answer']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  const after = await saved(page);
  expect(after.rounds[0].opening).toMatchObject({ done: true, skipped: true });
});

test('with a campaign in play, the seal asks first and Keep playing leaves it alone', async ({ page }) => {
  const old = campaignStart();
  const playing = { ...old, rounds: [{ ...old.rounds[0], opening: { talked: [] } }] };
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: KEY, value: JSON.stringify(playing) },
  );
  await page.goto('/#shelf');
  await page.getByRole('link', { name: 'New campaign' }).click();
  // Opens on the last campaign's choices (Medium here).
  await expect(page.getByRole('radio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'Easy' }).click();
  await page.getByRole('button', { name: 'Break the seal' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Start a new campaign?' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep playing' }).click();
  await expect(dialog).toHaveCount(0);
  expect(await saved(page)).toEqual(playing);
  // Start new replaces it.
  await page.getByRole('button', { name: 'Break the seal' }).click();
  await dialog.getByRole('button', { name: 'Start new' }).click();
  await expect(page.getByTestId('campaign-opening')).toBeVisible({ timeout: 20000 });
  const now = await saved(page);
  expect(now.ref.code).not.toBe(playing.ref.code);
  expect(now.ref.difficulty).toBe('easy');
});

test('an opening half done in the classic shell goes on in the shelf book', async ({ page }) => {
  await startHard(page);
  const save = await saved(page);
  const c = roundCase(content, save, 0);
  const guest = c.suspects[0];
  await page.getByRole('button', { name: new RegExp(`^${suspectName(guest, c.guests)}`) }).click();
  await page.getByTestId('opening-spread').getByRole('button', { name: 'Close' }).click();
  // The classic casebook reads the same save and shows the same count.
  await page.goto('/');
  await page.reload();
  await page.getByRole('button', { name: /Continue/ }).first().click();
  await expect(page.getByTestId('opening-count')).toContainText('1 of');
});
