import type { Page } from '@playwright/test';
import { test, expect, openTab, tabBar } from './fixtures.ts';
import { checkScreen } from './rules.ts';

const CLOCK = /^(\d+:\d\d|Midnight) \(.+\)$/;

async function startCampaign(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New campaign' }).click();
  await page.getByRole('button', { name: 'Start the campaign' }).click();
  await expect(page.getByRole('navigation', { name: 'Rounds' })).toBeVisible();
}

const timeLine = (page: Page) => page.locator('.case-title p');
const rooms = (page: Page) => page.locator('.floorplan .tile-hit');

/** Walk room to room until `what` shows in the room list; returns once it does. */
async function walkTo(page: Page, what: ReturnType<Page['locator']>) {
  const n = await rooms(page).count();
  for (let i = 0; i < n; i++) {
    await rooms(page).nth(i).click();
    if ((await what.count()) > 0) return;
  }
  throw new Error('nothing like that in any room');
}

/** An object's row in the room list (not a person, not something to look at). */
const objectRow = (page: Page) => page.locator('.room-list .puzzle-row:not(.person-row):not(:has-text("Have a")):not(.done):not(.locked)');

async function solveOpenPuzzle(page: Page) {
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await page.getByRole('dialog', { name: 'Solve this puzzle?' }).getByRole('button', { name: 'Solve it' }).click();
  await page.locator('section.unlocked').getByRole('button', { name: 'Back to the casebook' }).click();
}

test.describe('exploring a campaign round', () => {
  test('map first with the time, walk, talk, play an object, the new time, accuse with the warning', async ({ page }) => {
    await startCampaign(page);

    // Map is the first tab and the default, and the header is the clock.
    await expect(tabBar(page).getByRole('button').first()).toHaveText('Map');
    await expect(tabBar(page).getByRole('button', { name: 'Map' })).toHaveAttribute('aria-current', 'page');
    await expect(timeLine(page)).toHaveText(/^9:00 \(\d games? left\)$/);
    await expect(page.locator('.floorplan')).toBeVisible();
    await checkScreen(page, 'explore map');

    // Tapping another room moves her marker there.
    const here = page.locator('.floorplan .tile-hit[aria-current="location"]');
    const hereName = await here.getAttribute('aria-label');
    const other = page.locator('.floorplan .tile-hit:not([aria-current])').first();
    const otherName = (await other.getAttribute('aria-label'))!.split(',')[0];
    await other.click();
    await expect(page.locator('.floorplan .tile-hit[aria-current="location"]')).toHaveAttribute('aria-label', new RegExp(`^${otherName}`));
    await expect(page.getByRole('heading', { name: `In the ${otherName}` })).toBeVisible();
    expect(hereName).not.toContain(otherName);
    await checkScreen(page, 'explore room list');

    // Something to look at shows its line.
    await walkTo(page, page.getByRole('button', { name: /^Have a look/ }));
    await page.getByRole('button', { name: /^Have a look/ }).click();
    await expect(page.locator('.room-list .puzzle-reward', { hasText: /^(?!Tap to take a look)/ }).first()).toBeVisible();

    // A person: talk, then nothing more to say.
    await walkTo(page, page.locator('.person-row'));
    await page.locator('.person-row').first().click();
    const person = page.getByRole('dialog');
    await expect(person.locator('.portrait')).toBeVisible();
    const talk = person.getByRole('region', { name: 'Talk' });
    await talk.getByRole('button', { name: 'Anything else?' }).click();
    await expect(talk.locator('.talk-log li')).toHaveCount(1);
    await expect(talk.getByText('Nothing more to say for now.')).toBeVisible();
    await checkScreen(page, 'person screen');
    await person.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // An object with a puzzle: the confirm names the time, then Solve moves the clock on.
    await walkTo(page, objectRow(page));
    const before = (await timeLine(page).innerText()).trim();
    await objectRow(page).first().click();
    const confirm = page.getByRole('dialog');
    await expect(confirm.getByText(/This takes \d+ minutes: the clock moves to \d+:\d\d when you finish it\./)).toBeVisible();
    await checkScreen(page, 'pick confirm');
    await confirm.getByRole('button', { name: 'Play it' }).click();
    await solveOpenPuzzle(page);

    const card = page.getByRole('dialog', { name: /^(\d+:\d\d|Midnight)$/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText(/game(s)? left|Time's up/);
    await checkScreen(page, 'time card');
    await expect(card).toHaveCount(0, { timeout: 5000 });
    const after = (await timeLine(page).innerText()).trim();
    expect(after).toMatch(CLOCK);
    expect(after).not.toBe(before);
    await checkScreen(page, 'clues after a puzzle');

    // Accuse before the clues settle it: she's warned.
    await openTab(page, 'Accuse');
    await page.getByRole('group', { name: 'Who' }).getByRole('button').first().click();
    await page.getByRole('group', { name: 'With what' }).getByRole('button').first().click();
    await page.getByRole('button', { name: 'Make the accusation' }).click();
    const warning = page.getByRole('dialog', { name: 'Guess now?' });
    await expect(warning.getByText(/Your clues still point at \d+ people\. Guess now\?/)).toBeVisible();
    await checkScreen(page, 'guess warning');
    await warning.getByRole('button', { name: 'Not yet' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('at midnight the Accuse tab opens and the map and puzzles stop', async ({ page }) => {
    test.setTimeout(120_000);
    await startCampaign(page);

    for (let i = 0; i < 6 && !(await timeLine(page).innerText()).startsWith('Midnight'); i++) {
      await openTab(page, 'Clues');
      await page.locator('.puzzles .puzzle-row:not(.locked):not(.done)').first().click();
      await page.getByRole('dialog').getByRole('button', { name: 'Play it' }).click();
      await solveOpenPuzzle(page);
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5000 });
    }

    await expect(timeLine(page)).toHaveText(/^Midnight/);
    await expect(tabBar(page).getByRole('button', { name: 'Accuse' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText("It's midnight. Time is up, and you must name someone now.")).toBeVisible();
    await checkScreen(page, 'midnight accuse');

    // Clues still read, but no puzzle opens.
    await openTab(page, 'Clues');
    await expect(page.locator('.puzzles .puzzle-row:not(.done)').first()).toBeDisabled();
    await checkScreen(page, 'midnight clues');

    // The map shows but does nothing.
    await openTab(page, 'Map');
    await expect(rooms(page).first()).toBeDisabled();
    await expect(page.locator('.room-list.greyed')).toBeVisible();
    await checkScreen(page, 'midnight map');
  });
});
