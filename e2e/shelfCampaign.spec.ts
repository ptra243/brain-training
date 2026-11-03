import { readFileSync } from 'node:fs';
import { content, houseDetails } from '../src/content/index.ts';
import { campaignStart } from '../src/dev/scenarios.ts';
import { roomContents } from '../src/game/explore.ts';
import { roundCase } from '../src/game/campaignSave.ts';
import { roomName } from '../src/game/names.ts';
import { checkScreen } from './rules.ts';
import { expect, test } from './fixtures.ts';

// A saved campaign at the start of round 1, built on this run with the app's own engine and save format.
// She stands in a room that holds an object, so the first real click is on that object's row.
const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');
const KEY = `${PREFIX}campaign`;

const start = campaignStart();
const c = roundCase(content, start, 0);
const contents = roomContents(houseDetails, c);
const at = c.rooms.find((room) => contents[room].objects.length > 0)!;
const other = c.rooms.find((room) => room !== at)!;
const save = { ...start, rounds: [{ ...start.rounds[0], at }, ...start.rounds.slice(1)] };

test('the room page: open an object and come back, then walk to another room', async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: KEY, value: JSON.stringify(save) },
  );
  await page.goto('/#shelf');
  await page.getByRole('link', { name: /Your campaign, .*: continue/ }).click();
  await expect(page.getByText(`You are in the ${roomName(at)}.`)).toBeVisible();
  await expect(page.getByRole('img', { name: /accusations? left$/ })).toBeVisible();
  await checkScreen(page, 'shelf campaign room');

  // Opening an object spends one of tonight's picks and shows its puzzle page.
  const label = contents[at].objects[0].label;
  await page.getByRole('button', { name: new RegExp(`^${label}\\.`) }).click();
  const paper = page.getByTestId('puzzle-page');
  await expect(paper).toBeVisible();
  await paper.getByRole('button', { name: 'Turn back to the room' }).first().click();
  await expect(paper).toHaveCount(0);
  await expect(page.getByText(`You are in the ${roomName(at)}.`)).toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
  expect(saved.picked[0]).toHaveLength(1);

  // Walking is free and changes the room.
  await page.getByRole('button', { name: roomName(other), exact: true }).click();
  await expect(page.getByText(`You are in the ${roomName(other)}.`)).toBeVisible();
});
