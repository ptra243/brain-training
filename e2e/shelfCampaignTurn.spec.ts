import { readFileSync } from 'node:fs';
import { content, houseDetails } from '../src/content/index.ts';
import { campaignStart } from '../src/dev/scenarios.ts';
import { roomContents } from '../src/game/explore.ts';
import { roundCase } from '../src/game/campaignSave.ts';
import { roomName, suspectName } from '../src/game/names.ts';
import { expect, test } from './fixtures.ts';

const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');

const start = campaignStart();
const c = roundCase(content, start, 0);
const contents = roomContents(houseDetails, c);
const withGuest = c.rooms.find((room) => contents[room].guests.length > 0)!;
const guestName = suspectName(contents[withGuest].guests[0], c.guests);
const save = { ...start, rounds: [{ ...start.rounds[0], at: withGuest }, ...start.rounds.slice(1)] };

// The page turn is animated here, so a tap can land while the leaf is still turning.
test.use({ reducedMotion: 'no-preference' });

test('a guest tapped as soon as the Plan page arrives still turns the book to Room', async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: `${PREFIX}campaign`, value: JSON.stringify(save) },
  );
  await page.goto('/#shelf');
  await page.getByRole('link', { name: /Your campaign, .*: continue/ }).click();
  await expect(page.getByText(`You are in the ${roomName(withGuest)}.`)).toBeVisible();
  await page.getByRole('button', { name: 'Show the ribbons' }).click();
  await page.getByRole('button', { name: 'Plan' }).click();
  // No wait: the leaf is still turning.
  await page.getByTestId('campaign-plan').getByRole('button', { name: `Talk to ${guestName}` }).click();
  await expect(page.getByTestId('talk-spread')).toBeVisible();
  await expect(page.getByRole('region', { name: /: Room$/ })).toBeVisible();
});
