import type { Page } from '@playwright/test';
import { test, expect, openTab } from './fixtures.ts';
import { checkScreen } from './rules.ts';
import { content } from '../src/content/index.ts';
import { campaignRound, type CampaignRef } from '../src/engine/campaign.ts';
import { openingScript } from '../src/game/opening.ts';
import { suspectName } from '../src/game/names.ts';

// The campaign opening: round 1 starts on a scene where she talks to each guest, instead of the casebook.

async function startCampaign(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New campaign' }).click();
  await page.getByRole('button', { name: 'Start the campaign' }).click();
  await expect(page.getByTestId('opening-scene')).toBeVisible();
}

/** The round-1 case of the campaign she just started, rebuilt with the app's own engine. */
async function savedCase(page: Page) {
  const raw = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith(':campaign'));
    return key ? { key, value: localStorage.getItem(key) } : null;
  });
  expect(raw, 'a campaign save exists').not.toBeNull();
  const save = JSON.parse(raw!.value!) as { ref: CampaignRef; rounds: { opening?: unknown }[] };
  return { key: raw!.key, save, c: campaignRound(content, save.ref, []) };
}

test('a new campaign shows the opening, not the casebook', async ({ page }) => {
  await startCampaign(page);
  await expect(page.getByTestId('opening-count')).toHaveText(/^0 of \d+ spoken to$/);
  await expect(page.getByRole('navigation', { name: 'Rounds' })).toHaveCount(0);
  await checkScreen(page, 'opening scene');
});

test('talking to a guest with a clue shows it', async ({ page }) => {
  await startCampaign(page);
  const { c } = await savedCase(page);
  const teller = openingScript(c).guests.find((g) => g.clues.length > 0);
  expect(teller, 'some guest tells a free clue').toBeTruthy();
  const name = suspectName(teller!.guest, c.guests);

  await page.locator('button.opening-guest', { hasText: name }).click();
  const person = page.getByTestId('opening-person');
  await expect(person.locator('ul.clue-list > li')).toHaveCount(0);
  await checkScreen(page, 'opening guest sheet');
  await person.getByRole('button', { name: `Hear what ${name} says` }).click();
  await expect(person.locator('ul.clue-list > li')).toHaveCount(teller!.clues.length);
  await checkScreen(page, 'opening guest sheet, heard');

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByTestId('opening-count')).toHaveText(new RegExp(`^1 of ${c.suspects.length} spoken to$`));
});

test('skip shows the summary, then the casebook has every free clue', async ({ page }) => {
  await startCampaign(page);
  const { c } = await savedCase(page);
  const free = c.clues.filter((clue) => clue.delivery === 'given').length;

  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  const confirm = page.getByRole('dialog');
  await checkScreen(page, 'opening skip confirm');
  await confirm.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(new RegExp(`^${free} clues? (is|are) in your casebook`))).toBeVisible();
  await checkScreen(page, 'opening skip summary');
  await page.getByRole('button', { name: 'Open the casebook' }).click();

  await expect(page.getByRole('navigation', { name: 'Rounds' })).toBeVisible();
  await openTab(page, 'Clues');
  await expect(page.locator('ul.clue-list > li')).toHaveCount(free);
  await checkScreen(page, 'casebook after skipping');
});

test('reload mid-opening resumes where she was', async ({ page }) => {
  await startCampaign(page);
  const { c } = await savedCase(page);
  const name = suspectName(c.suspects[0], c.guests);
  await page.locator('button.opening-guest', { hasText: name }).click();
  await page.getByTestId('opening-person').getByRole('button', { name: `Hear what ${name} says` }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.reload();
  await expect(page.getByTestId('opening-scene')).toBeVisible();
  await expect(page.getByTestId('opening-count')).toHaveText(new RegExp(`^1 of ${c.suspects.length} spoken to$`));
  await expect(page.locator('button.opening-guest.talked')).toHaveCount(1);
  await checkScreen(page, 'opening after reload');
});

test('an old save with no opening goes straight to the casebook', async ({ page }) => {
  await startCampaign(page);
  const { key, save } = await savedCase(page);
  delete save.rounds[0].opening;
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key, value: JSON.stringify(save) });

  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Rounds' })).toBeVisible();
  await expect(page.getByTestId('opening-scene')).toHaveCount(0);
  await checkScreen(page, 'old campaign save');
});
