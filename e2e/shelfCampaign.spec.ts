import { readFileSync } from 'node:fs';
import { content, houseDetails } from '../src/content/index.ts';
import { campaignStart } from '../src/dev/scenarios.ts';
import { roomContents } from '../src/game/explore.ts';
import { roundCase } from '../src/game/campaignSave.ts';
import { roomName, suspectName } from '../src/game/names.ts';
import { questioningOf } from '../src/game/talk.ts';
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

// The face-to-face talk: she stands in a room with a guest who has a questioning game.
const withGuest = c.rooms.find((room) => contents[room].guests.some((g) => questioningOf(c, g)))!;
const guest = contents[withGuest].guests.find((g) => questioningOf(c, g))!;
const guestName = suspectName(guest, c.guests);
const talkSave = { ...start, rounds: [{ ...start.rounds[0], at: withGuest }, ...start.rounds.slice(1)] };

async function openRoom(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: KEY, value: JSON.stringify(talkSave) },
  );
  await page.goto('/#shelf');
  await page.getByRole('link', { name: /Your campaign, .*: continue/ }).click();
  await expect(page.getByText(`You are in the ${roomName(withGuest)}.`)).toBeVisible();
}

test('the talk spread: talk, open their notebook page, and Back closes it', async ({ page }) => {
  await openRoom(page);
  await page.getByRole('button', { name: new RegExp(guestName) }).click();
  const spread = page.getByTestId('talk-spread');
  await expect(spread).toBeVisible();
  await expect(spread.getByRole('heading', { name: `Talking to ${guestName}` })).toBeVisible();
  await expect(spread.getByText('You', { exact: true })).toBeVisible();
  await expect(spread.getByRole('tab', { name: 'Talk' })).toHaveAttribute('aria-selected', 'true');
  await checkScreen(page, 'shelf talk spread');

  await spread.getByRole('button', { name: 'Tell me about yourself' }).click();
  await expect(spread.getByRole('list')).toBeVisible();

  await spread.getByRole('tab', { name: 'Clues' }).click();
  await spread.getByRole('button', { name: 'Open their page' }).click();
  await expect(spread).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Clues that name them' })).toBeVisible();
  await page.goBack();

  // Back closes the spread without leaving #shelf.
  await page.getByRole('button', { name: new RegExp(guestName) }).click();
  await expect(spread).toBeVisible();
  await page.goBack();
  await expect(spread).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe('#shelf');
  await expect(page.getByText(`You are in the ${roomName(withGuest)}.`)).toBeVisible();
});

test('the talk spread: Minigame, Play opens the puzzle page and Back returns to the room', async ({ page }) => {
  await openRoom(page);
  await page.getByRole('button', { name: new RegExp(guestName) }).click();
  const spread = page.getByTestId('talk-spread');
  await spread.getByRole('tab', { name: 'Minigame' }).click();
  await spread.getByRole('button', { name: 'Play' }).click();
  await expect(spread).toHaveCount(0);
  const paper = page.getByTestId('puzzle-page');
  await expect(paper).toBeVisible();
  await paper.getByRole('button', { name: 'Turn back to the room' }).first().click();
  await expect(paper).toHaveCount(0);
  await expect(page.getByText(`You are in the ${roomName(withGuest)}.`)).toBeVisible();
});

// The Plan page: walk by tapping a room, and tap a guest in her room to talk.
test('the Plan page: tap another room to walk there, tap a guest to open the talk', async ({ page }) => {
  await openRoom(page);
  await page.getByRole('button', { name: 'Show the ribbons' }).click();
  await page.getByRole('button', { name: 'Plan' }).click();
  const plan = page.getByTestId('campaign-plan');
  await expect(plan).toBeVisible();
  // The page turn takes about half a second; a tap during it is ignored by the book.
  await expect(page.getByRole('region', { name: /: Plan$/ })).toBeVisible();
  await page.waitForTimeout(800);
  await checkScreen(page, 'shelf campaign plan');

  await plan.getByRole('button', { name: `Talk to ${guestName}` }).click();
  const spread = page.getByTestId('talk-spread');
  await expect(spread).toBeVisible();
  await expect(spread.getByRole('heading', { name: `Talking to ${guestName}` })).toBeVisible();
  // The book turns to the Room page behind the spread.
  await expect(page.getByRole('region', { name: /: Room$/ })).toBeVisible();
  await page.goBack();
  await expect(spread).toHaveCount(0);
  await expect(page.getByText(`You are in the ${roomName(withGuest)}.`)).toBeVisible();

  await page.getByRole('button', { name: 'Show the ribbons' }).click();
  await page.getByRole('button', { name: 'Plan' }).click();
  const target = c.rooms.find((room) => room !== withGuest)!;
  await plan.getByRole('button', { name: new RegExp(`^${roomName(target)}(,|$)`) }).first().click();
  await page.getByRole('button', { name: 'Show the ribbons' }).click();
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await expect(page.getByText(`You are in the ${roomName(target)}.`)).toBeVisible();
});
