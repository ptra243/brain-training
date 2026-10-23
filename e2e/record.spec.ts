import { test, expect, newCase, openTab } from './fixtures.ts';
import { checkScreen } from './rules.ts';
import { content } from '../src/content/index.ts';
import { caseFor, type CaseRef } from '../src/engine/caseRef.ts';

const EMPTY_QUICK = 'No finished cases yet.';
const EMPTY_CAMPAIGN = 'No finished campaigns yet.';

test('Your record opens from Quick play and from the campaign card, empty at first', async ({ page }) => {
  await page.goto('/');
  const heading = page.getByRole('heading', { name: 'Your record', level: 1 });

  // Both cards have the button; each opens the same screen.
  const buttons = page.getByRole('button', { name: 'Your record' });
  await expect(buttons).toHaveCount(2);
  await buttons.first().click();
  await expect(heading).toBeVisible();
  await expect(page.getByText(EMPTY_QUICK)).toBeVisible();
  await expect(page.getByText(EMPTY_CAMPAIGN)).toBeVisible();
  await checkScreen(page, 'your record (empty)');

  await page.getByRole('button', { name: 'Home' }).click();
  await buttons.last().click();
  await expect(heading).toBeVisible();

  // A side screen: reopening the app lands on home.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Casebook', level: 1 })).toBeVisible();
});

test('a solved case shows its closing line and lands in Your record', async ({ page }) => {
  await newCase(page);
  const raw = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith(':quick'));
    return key ? { key, value: localStorage.getItem(key) } : null;
  });
  expect(raw, 'a quick save exists').not.toBeNull();
  const save = JSON.parse(raw!.value!) as { ref: CaseRef; progress: { solved: boolean; accusations: unknown[]; games: Record<string, unknown> } };
  const c = caseFor(content, save.ref);

  // One puzzle solved for her, one accusation, solved. Built with the app's own engine on every run.
  save.progress.games[c.games[0].kind] = { status: 'revealed' };
  save.progress.accusations = [{ suspect: c.murderer, item: c.weapon, correct: 2 }];
  save.progress.solved = true;
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: raw!.key, value: JSON.stringify(save) });
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Casebook' })).toBeVisible();

  await openTab(page, 'Accuse');
  await expect(page.getByText('Solved on the first accusation.')).toBeVisible();
  await expect(page.getByTestId('closing-effort')).toHaveText("You didn't ask for a hint. 1 puzzle was solved for you.");
  await checkScreen(page, 'case closed');

  // The finished save was recorded when the app loaded it.
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'Your record' }).first().click();
  const quick = page.getByTestId('record-quick');
  await expect(quick.getByText('1 case solved. 1 on the first accusation.')).toBeVisible();
  await expect(quick.getByText(/Solved on the first accusation$/)).toBeVisible();
  await expect(page.getByText(EMPTY_CAMPAIGN)).toBeVisible();
  await checkScreen(page, 'your record (one case)');
});
