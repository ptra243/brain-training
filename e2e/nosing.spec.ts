import type { Page } from '@playwright/test';
import { test, expect } from './fixtures.ts';
import { checkScreen } from './rules.ts';
import { openNosing, openNosingAt } from './nosingSaves.ts';

const typeNumber = async (page: Page, n: number) => {
  const pad = page.locator('.numpad').first();
  for (const d of String(n)) await pad.getByRole('button', { name: d, exact: true }).click();
  await pad.getByRole('button', { name: 'OK', exact: true }).click();
};

/** A button is fully on screen (780px tall) without scrolling. */
const inViewport = async (page: Page, button: ReturnType<Page['locator']>, label: string) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = await button.boundingBox();
  expect(box, label).not.toBeNull();
  expect(box!.y + box!.height, `${label} inside 780px`).toBeLessThanOrEqual(780);
};

/** The pad's OK button is fully on screen without scrolling. */
const padOnScreen = async (page: Page, scope: string) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = await page.locator(scope).getByRole('button', { name: 'OK', exact: true }).boundingBox();
  expect(box, `${scope}: OK button`).not.toBeNull();
  expect(box!.y + box!.height, `${scope}: OK inside 780px`).toBeLessThanOrEqual(780);
};

const hintButton = (page: Page) => page.getByRole('button', { name: /for a hint$/ });

test.describe('nosing around', () => {
  test('Solve opens the lock, shows the way and unlocks the clues', async ({ page }) => {
    await openNosing(page);
    await expect(page.getByRole('button', { name: 'Roll', exact: true })).toBeVisible();
    await checkScreen(page, 'nosing: first roll');

    await page.getByRole('button', { name: 'Solve', exact: true }).click();
    await page.getByRole('dialog', { name: 'Solve this puzzle?' }).getByRole('button', { name: 'Solve it' }).click();
    await expect(page.locator('section.unlocked')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The cat shows the way' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Solve', exact: true })).toHaveCount(0);
    await checkScreen(page, 'nosing: solved');
  });

  test('roll, move, then a question with the cat\'s three hints', async ({ page }) => {
    await openNosing(page);
    const roll = page.getByRole('button', { name: 'Roll', exact: true });
    const move = page.getByRole('button', { name: 'Move', exact: true });
    const question = page.locator('.nosing-question');

    // Roll and move until a square asks a question (a ladder or snake square may come first).
    for (let guard = 0; guard < 12; guard++) {
      await roll.or(move).or(question).first().waitFor();
      if (await question.isVisible()) break;
      if (await roll.isVisible()) {
        await checkScreen(page, 'nosing: roll');
        await roll.click();
      } else await move.click();
    }
    await expect(question).toBeVisible();

    // Ask the cat three times: the working, three choices, the answer.
    await hintButton(page).click();
    await hintButton(page).click();
    await expect(page.getByRole('group', { name: "The cat's three choices" })).toBeVisible();
    await checkScreen(page, 'nosing: question with choices');
    await padOnScreen(page, '.nosing-question');
    await hintButton(page).click();
    const note = await page.locator('.hint-note').innerText();
    const answer = Number(/answer: (\d+)/.exec(note)?.[1]);
    expect(Number.isInteger(answer), note).toBe(true);
    await typeNumber(page, answer);
    await expect(question).toBeHidden();
    await expect(roll.or(move).first()).toBeVisible();
  });

  // Seed 12345's hint run has no speed square; seed 4's does.
  test.describe('a run with a speed round', () => {
  test.use({ seed: 4 });
  test('the speed round: the screen fits and the 60 seconds end the round', async ({ page }) => {
    await openNosingAt(page, 'speed');
    const speedStart = page.getByRole('button', { name: /^Start the \d+ seconds$/ });
    await expect(speedStart).toBeVisible();
    await checkScreen(page, 'nosing: speed round start');
    // Fake the clock from here so the 60 seconds pass at once.
    await page.clock.install();
    await speedStart.click();
    await expect(page.getByRole('timer')).toBeVisible();
    await checkScreen(page, 'nosing: speed round');
    await padOnScreen(page, '.nosing-speed');
    await page.clock.runFor(61_000);
    await expect(page.getByRole('timer')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Roll', exact: true })).toBeVisible();
  });
  });

  test('the lock: place and clear a card, hints build the number, Try wins', async ({ page }) => {
    await openNosingAt(page, 'lock');
    const tryNumber = page.getByRole('button', { name: /^Try this number/ });
    const unlocked = page.locator('section.unlocked');
    await expect(tryNumber).toBeVisible();
    await checkScreen(page, 'nosing: lock');
    await inViewport(page, tryNumber, 'lock: Try');
    // Tap a card, then a slot: it lands there. Tap the filled slot: it comes back.
    // A cat's note bonus may already have filled the first boxes; those stay (their buttons are disabled).
    const firstSlot = page.getByRole('button', { name: /number, empty$/ }).first();
    await expect(firstSlot).toBeVisible();
    const emptyName = (await firstSlot.getAttribute('aria-label'))!;
    const slotName = emptyName.replace(/, empty$/, '');
    const byCat = page.getByRole('button', { name: /, filled in by the cat$/ });
    if ((await byCat.count()) > 0) await expect(byCat.first()).toBeDisabled();
    await page.getByRole('group', { name: 'Your numbers' }).getByRole('button', { name: /^\d+$/ }).first().click();
    await firstSlot.click();
    const filled = page.getByRole('button', { name: new RegExp(`^${slotName}, \\d+$`) });
    await expect(filled).toBeVisible();
    await checkScreen(page, 'nosing: lock with a card placed');
    await filled.click();
    await expect(page.getByRole('button', { name: emptyName, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeDisabled();
    // The cat's hints fill the grid with more and more of the way.
    await hintButton(page).click();
    await expect(page.locator('.hint-note')).toBeVisible();
    await inViewport(page, tryNumber, 'lock with a hint note: Try');
    await checkScreen(page, 'nosing: lock with a hint note');
    for (let k = 0; k < 12 && !(await tryNumber.isEnabled()); k++) await hintButton(page).click();
    await checkScreen(page, 'nosing: lock with a number made');
    await tryNumber.click();
    // The first number she can make may miss the target: more hints bring it closer, then try again.
    for (let attempt = 0; attempt < 3 && !(await unlocked.isVisible()); attempt++) {
      await tryNumber.or(unlocked).first().waitFor();
      if (await unlocked.isVisible()) break;
      for (let k = 0; k < 12 && !(await tryNumber.isEnabled()); k++) await hintButton(page).click();
      await tryNumber.click();
    }
    await expect(unlocked).toBeVisible();
    await expect(unlocked.getByRole('button', { name: 'Back to the casebook' })).toBeVisible();
    await checkScreen(page, 'nosing: won');
  });

  test.describe('a run that meets the dog', () => {
    // A seed whose run lands on the dog's snake head.
    test.use({ seed: 10 });
    test('the dog fight: hints drive it, the screen fits, Continue goes on', async ({ page }) => {
      await openNosingAt(page, 'dog');
      const dogFight = page.locator('.dog-fight');
      const dogResult = page.locator('.dog-result');
      const playButton = dogFight.getByRole('button', { name: /^Play/ });
      await expect(dogFight).toBeVisible();
      await checkScreen(page, 'nosing: dog fight');
      await inViewport(page, playButton, 'dog fight: Play');
      // The cat's three hints: a question, then cards pushed into place.
      await hintButton(page).click();
      await expect(page.locator('.hint-note')).toContainText('sizes up your cards');
      await inViewport(page, playButton, 'dog fight with a hint note: Play');
      const mark = await page.locator('.nosing-dog-mark').boundingBox();
      expect(mark, 'the dog mark is on the board strip').not.toBeNull();
      expect(mark!.width, 'dog mark width').toBeGreaterThanOrEqual(8);
      expect(mark!.height, 'dog mark height').toBeGreaterThanOrEqual(8);
      await hintButton(page).click();
      await hintButton(page).click();
      await expect(playButton).toBeEnabled();
      await checkScreen(page, 'nosing: dog fight with cards placed');
      await playButton.click();
      // The fight goes on, a round at a time, until a side is out of lives.
      const idlePlay = dogFight.getByRole('button', { name: /^Play/, disabled: true });
      for (let round = 0; round < 8; round++) {
        await dogResult.or(idlePlay).first().waitFor();
        if (await dogResult.isVisible()) break;
        for (let k = 0; k < 3 && !(await playButton.isEnabled()); k++) await hintButton(page).click();
        await playButton.click();
      }
      await expect(dogResult).toBeVisible();
      await checkScreen(page, 'nosing: dog result');
      await dogResult.getByRole('button', { name: 'Continue' }).click();
      await expect(dogResult).toBeHidden();
    });
  });
});
