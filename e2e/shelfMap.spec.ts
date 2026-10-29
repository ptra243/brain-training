import { readFileSync } from 'node:fs';
import { content } from '../src/content/index.ts';
import { newPlayCase } from '../src/engine/caseRef.ts';
import { roomName, suspectName } from '../src/game/names.ts';
import { emptyProgress } from '../src/game/state.ts';
import { PLAY_VERSION } from '../src/game/saveGuards.ts';
import { expect, openTab, test } from './fixtures.ts';
import { centre, touchDrag, touchTap } from './touch.ts';

// A saved Quick case, built on this run with the app's own engine: #shelf reads it from storage.
const { ref, c } = newPlayCase(content, () => 0.5);
const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');
const KEY = `${PREFIX}quick`;

test('the Map: a tap raises the notebook to half on that guest, with a ring; place in a room; tap the map to tuck it', async ({ page }) => {
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
  await page.getByRole('navigation', { name: 'Parts of the case' }).getByRole('button', { name: 'Map' }).click();

  const plate = page.getByTestId('map-plate');
  const notebook = page.getByRole('region', { name: 'Your notebook' });
  const [a, b] = c.suspects;
  const nameA = suspectName(a, c.guests);
  const nameB = suspectName(b, c.guests);
  await expect(plate.locator('.counter').first()).toBeVisible();
  // No Accuse bar and no classic sheet on the shelf.
  await expect(page.getByRole('button', { name: 'Accuse' })).toHaveCount(0);

  // A short tap on a counter: half-height page for that guest, the counter ringed.
  await touchTap(page, await centre(plate.locator(`[data-suspect="${a}"]`)));
  await expect(notebook.getByRole('heading', { name: nameA, level: 2 })).toBeVisible();
  await expect(notebook.getByRole('heading', { name: 'Move their counter' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(plate.locator('[data-ringed]')).toHaveAttribute('data-suspect', a);
  const panel = (await notebook.boundingBox())!;
  expect(panel.y).toBeGreaterThan(300);
  expect(panel.y).toBeLessThan(450); // half height: the top half stays the map
  const ringed = (await plate.locator('[data-ringed]').boundingBox())!;
  expect(ringed.y + ringed.height).toBeLessThanOrEqual(panel.y + 1);
  // The talk is gone from the page.
  await expect(notebook.getByRole('heading', { name: 'What they said' })).toHaveCount(0);

  // The late click of the tap must not have tucked it, and another counter swaps the page in place.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  await expect(notebook.getByRole('heading', { name: nameA, level: 2 })).toBeVisible();
  await touchTap(page, await centre(plate.locator(`[data-suspect="${b}"]`)));
  await expect(notebook.getByRole('heading', { name: nameB, level: 2 })).toBeVisible();
  await expect(plate.locator('[data-ringed]')).toHaveAttribute('data-suspect', b);
  await expect(notebook.getByRole('heading', { name: nameA, level: 2 })).toHaveCount(0);

  // Place in a room: the same move as a drag.
  const room = c.rooms[0];
  await notebook.getByRole('list', { name: 'Move their counter' }).getByRole('button', { name: roomName(room), exact: true }).click();
  await expect(notebook.getByText(`You've placed them in the ${roomName(room)}`)).toBeVisible();
  await expect(plate.locator(`.floorplan [data-suspect="${b}"]`)).toHaveCount(1);
  await expect(plate.locator('[data-ringed]')).toHaveAttribute('data-suspect', b);

  // A tap on the map itself puts the notebook back to its strip, and the ring goes.
  await page.getByText('The house, after dinner').click();
  await expect(notebook).toBeHidden();
  await expect(page.getByRole('button', { name: /^Notebook · / })).toBeVisible();
  await expect(plate.locator('[data-ringed]')).toHaveCount(0);

  // The classic Casebook reads the same save: the guest is on its map.
  await page.goto('/#');
  await page.getByRole('button', { name: /^(Continue|Look back at it)$/ }).first().click();
  await openTab(page, 'Map');
  await expect(page.locator(`.floorplan [data-suspect="${b}"]`)).toHaveCount(1);
});

test('the Map: a drag still moves a counter and does not open the page', async ({ page }) => {
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
  await page.getByRole('navigation', { name: 'Parts of the case' }).getByRole('button', { name: 'Map' }).click();

  const plate = page.getByTestId('map-plate');
  const id = c.suspects[0];
  const counter = plate.locator(`.tray [data-suspect="${id}"]`);
  await counter.scrollIntoViewIfNeeded();
  const tile = plate.locator('.floorplan .tile:not(.closed):has(.room-name)').first();
  await tile.scrollIntoViewIfNeeded();
  await touchDrag(page, await centre(counter), await centre(tile));
  await expect(plate.locator(`.floorplan [data-suspect="${id}"]`)).toHaveCount(1);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  await expect(page.getByRole('region', { name: 'Your notebook' })).toBeHidden();
  await expect(plate.locator('[data-ringed]')).toHaveCount(0);
});
