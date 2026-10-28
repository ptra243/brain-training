import { readFileSync } from 'node:fs';
import { content } from '../src/content/index.ts';
import { newPlayCase } from '../src/engine/caseRef.ts';
import { itemName, suspectName } from '../src/game/names.ts';
import { emptyProgress } from '../src/game/state.ts';
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
