import { readFileSync } from 'node:fs';
import { content } from '../src/content/index.ts';
import { newPlayCase } from '../src/engine/caseRef.ts';
import { itemName, suspectName } from '../src/game/names.ts';
import { emptyProgress, reduce } from '../src/game/state.ts';
import { PLAY_VERSION } from '../src/game/saveGuards.ts';
import { expect, test } from './fixtures.ts';

// A saved Quick case, built on this run with the app's own engine: #shelf reads it from storage.
const { ref, c } = newPlayCase(content, () => 0.5);
const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');
const KEY = `${PREFIX}quick`;

test('the Answer page: a wrong try is crossed out, the right one solves it, and the Casebook agrees', async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: KEY, value: JSON.stringify({ ref, progress: emptyProgress(), historyId: 'h-e2e', playVersion: PLAY_VERSION }) },
  );
  await page.goto('/#shelf');
  await page.getByRole('link', { name: /Your case, .*: continue/ }).click();
  await page.getByRole('button', { name: 'Find a clue' }).click();
  await page.getByRole('button', { name: 'Show the ribbons' }).click();
  await page.getByRole('navigation', { name: 'Parts of the case' }).getByRole('button', { name: 'Answer' }).click();

  const murderer = suspectName(c.murderer, c.guests);
  const wrong = suspectName(c.suspects.find((s) => s !== c.murderer)!, c.guests);
  const weapon = itemName(c.weapon);
  const answer = page.getByRole('region', { name: 'Answer' });
  const make = answer.getByRole('button', { name: /^(Make the accusation|Fill both blanks first)$/ });
  await expect(make).toBeDisabled();

  const fill = async (who: string) => {
    await answer.getByRole('button', { name: /^Who: / }).click();
    await answer.getByRole('group', { name: 'Who' }).getByRole('button', { name: who, exact: true }).click();
    await answer.getByRole('button', { name: /^With what: / }).click();
    await answer.getByRole('group', { name: 'With what' }).getByRole('button', { name: weapon, exact: true }).click();
  };

  await fill(wrong);
  await make.click();
  await expect(answer.getByText('1 of 2 right. Keep digging.')).toBeVisible();
  await expect(answer.getByRole('list', { name: 'Your tries' }).getByRole('listitem')).toHaveCount(1);
  await expect(answer.getByRole('button', { name: 'Who: choose' })).toBeVisible();

  await fill(murderer);
  await make.click();
  await expect(answer.getByText('Case closed')).toBeVisible();
  await expect(answer.getByText('Solved in 2 accusations.')).toBeVisible();

  // The classic Casebook reads the same save: two tries, solved.
  await page.goto('/#');
  await page.getByRole('button', { name: /^(Continue|Look back at it)$/ }).first().click();
  await page.getByRole('navigation', { name: 'Casebook' }).getByRole('button', { name: 'Accuse' }).click();
  await expect(page.getByText('Case closed')).toBeVisible();
  await expect(page.getByText('Solved in 2 accusations.')).toBeVisible();
});

test('a guest page: Accuse with a weapon given hands the try in; without one it only writes the guest in', async ({ page }) => {
  const guest = c.suspects.find((s) => s !== c.murderer)!;
  const other = c.suspects.find((s) => s !== c.murderer && s !== guest)!;
  const weapon = c.items.find((i) => i !== c.weapon)!;
  const cell = { kind: 'suspect-item', row: guest, col: weapon } as const;
  let progress = emptyProgress();
  progress = reduce(c, reduce(c, progress, { type: 'cycle', ...cell }), { type: 'cycle', ...cell });
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: KEY, value: JSON.stringify({ ref, progress, historyId: 'h-e2e', playVersion: PLAY_VERSION }) },
  );
  await page.goto('/#shelf');
  await page.getByRole('link', { name: /Your case, .*: continue/ }).click();
  await page.getByRole('button', { name: 'Find a clue' }).click();
  await page.getByRole('button', { name: 'Show the ribbons' }).click();
  await page.getByRole('navigation', { name: 'Parts of the case' }).getByRole('button', { name: 'Map' }).click();
  const notebook = page.getByRole('region', { name: 'Your notebook' });
  const answer = page.getByRole('region', { name: 'Answer' });
  await page.getByRole('button', { name: /^Notebook · / }).click();
  await notebook.getByRole('navigation', { name: 'Notebook pages' }).getByRole('button', { name: 'Guests' }).click();

  // No weapon given to the other guest: the Answer page gets the guest, the weapon stays blank, nothing is handed in.
  await notebook.getByRole('button', { name: suspectName(other, c.guests) }).click();
  await notebook.getByRole('button', { name: 'Accuse them…' }).click();
  await expect(notebook).toBeHidden();
  await expect(answer.getByRole('button', { name: `Who: ${suspectName(other, c.guests)}` })).toBeVisible();
  await expect(answer.getByRole('button', { name: 'With what: choose' })).toBeVisible();
  await expect(answer.getByRole('list', { name: 'Your tries' }).getByRole('listitem')).toHaveCount(0);

  // A weapon given: tapping Accuse hands in the try, struck through.
  await page.getByRole('button', { name: /^Notebook · / }).click();
  await notebook.getByRole('button', { name: '‹ Guests' }).click();
  await notebook.getByRole('button', { name: suspectName(guest, c.guests) }).click();
  await notebook.getByRole('button', { name: `Accuse ${suspectName(guest, c.guests).replace(/^The /, 'the ')} with the ${itemName(weapon)}` }).click();
  await expect(notebook).toBeHidden();
  const tries = answer.getByRole('list', { name: 'Your tries' }).getByRole('listitem');
  await expect(tries).toHaveCount(1);
  await expect(tries.first().locator('span').first()).toHaveClass(/struck/);
  await expect(answer.getByRole('button', { name: 'Who: choose' })).toBeVisible();

  // The classic Casebook counts it.
  await page.goto('/#');
  await page.getByRole('button', { name: /^(Continue|Look back at it)$/ }).first().click();
  await page.getByRole('navigation', { name: 'Casebook' }).getByRole('button', { name: 'Accuse' }).click();
  await expect(page.getByText(suspectName(guest, c.guests)).first()).toBeVisible();
});
