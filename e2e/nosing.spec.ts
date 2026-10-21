import type { Page } from '@playwright/test';
import { test, expect } from './fixtures.ts';
import { checkScreen } from './rules.ts';

/** Home -> Choose games (Nosing around ticked) -> Start -> Clues -> Get a clue -> Nosing around. */
async function openNosing(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Choose games' }).click();
  await expect(page.getByRole('heading', { name: 'Choose games', level: 1 })).toBeVisible();
  const rows = page.locator('button.pick-row');
  const nosing = rows.filter({ hasText: 'Nosing around' });
  if ((await nosing.getAttribute('aria-pressed')) !== 'true') await nosing.click();
  // Three games at least: add others until there are enough.
  for (const name of ['Wordle', 'Crossword', 'Word search', 'Sudoku']) {
    if ((await rows.and(page.locator('[aria-pressed="true"]')).count()) >= 3) break;
    const row = rows.filter({ hasText: name });
    if ((await row.getAttribute('aria-pressed')) !== 'true') await row.click();
  }
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Casebook' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Casebook' }).getByRole('button', { name: 'Clues' }).click();
  await page.getByRole('button', { name: 'Get a clue' }).click();
  const dialog = page.getByRole('dialog', { name: 'Pick a game' });
  await dialog.locator('button.puzzle-row:not(.locked):not(.done)', { hasText: 'Nosing around' }).first().click();
  await expect(page.getByRole('heading', { name: 'Nosing around', level: 1 })).toBeVisible();
}

const typeNumber = async (page: Page, n: number) => {
  const pad = page.locator('.numpad').first();
  for (const d of String(n)) await pad.getByRole('button', { name: d, exact: true }).click();
  await pad.getByRole('button', { name: 'OK', exact: true }).click();
};

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

  /** Plays a whole run with the cat's hints. `pad` also checks the question pad fits; `needDog` expects a dog fight on the way. */
  async function playRun(page: Page, pad: boolean, needDog: boolean) {
    test.setTimeout(180_000);
    await openNosing(page);

    const roll = page.getByRole('button', { name: 'Roll', exact: true });
    const move = page.getByRole('button', { name: 'Move', exact: true });
    const question = page.locator('.nosing-question');
    const speedStart = page.getByRole('button', { name: /^Start the \d+ seconds$/ });
    const tryNumber = page.getByRole('button', { name: /^Try this number/ });
    const unlocked = page.locator('section.unlocked');
    const dogFight = page.locator('.dog-fight');
    const dogResult = page.locator('.dog-result');
    const playButton = dogFight.getByRole('button', { name: /^Play/ });
    /** A button is fully on screen (780px tall) without scrolling. */
    const inViewport = async (button: ReturnType<Page['locator']>, label: string) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      const box = await button.boundingBox();
      expect(box, label).not.toBeNull();
      expect(box!.y + box!.height, `${label} inside 780px`).toBeLessThanOrEqual(780);
    };
    const hintButton = page.getByRole('button', { name: /for a hint$/ });
    /** The pad's OK button is fully on screen without scrolling. */
    const padOnScreen = async (scope: string) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      const box = await page.locator(scope).getByRole('button', { name: 'OK', exact: true }).boundingBox();
      expect(box, `${scope}: OK button`).not.toBeNull();
      if (pad) expect(box!.y + box!.height, `${scope}: OK inside 780px`).toBeLessThanOrEqual(780);
    };
    let sawDog = false;
    const checked = new Set<string>();
    const checkOnce = async (label: string) => {
      if (checked.has(label)) return;
      checked.add(label);
      await checkScreen(page, label);
    };

    for (let guard = 0; guard < 120; guard++) {
      await roll.or(move).or(question).or(speedStart).or(tryNumber).or(dogFight).or(dogResult).or(unlocked).first().waitFor();
      if (await unlocked.isVisible()) break;

      if (await roll.isVisible()) {
        await checkOnce('nosing: roll');
        await roll.click();
      } else if (await move.isVisible()) {
        await move.click();
      } else if (await question.isVisible()) {
        // Ask the cat three times: the working, three choices, the answer.
        await hintButton.click();
        await hintButton.click();
        await expect(page.getByRole('group', { name: "The cat's three choices" })).toBeVisible();
        await checkOnce('nosing: question with choices');
        await padOnScreen('.nosing-question');
        await hintButton.click();
        const note = await page.locator('.hint-note').innerText();
        const answer = Number(/answer: (\d+)/.exec(note)?.[1]);
        expect(Number.isInteger(answer), note).toBe(true);
        await typeNumber(page, answer);
      } else if (await dogResult.isVisible()) {
        await checkOnce('nosing: dog result');
        await dogResult.getByRole('button', { name: 'Continue' }).click();
      } else if (await dogFight.isVisible()) {
        sawDog = true;
        await checkOnce('nosing: dog fight');
        await inViewport(playButton, 'dog fight: Play');
        // The cat's three hints: a question, then cards pushed into place.
        await hintButton.click();
        await expect(page.locator('.hint-note')).toContainText('sizes up your cards');
        await inViewport(playButton, 'dog fight with a hint note: Play');
        const mark = await page.locator('.nosing-dog-mark').boundingBox();
        expect(mark, 'the dog mark is on the board strip').not.toBeNull();
        expect(mark!.width, 'dog mark width').toBeGreaterThanOrEqual(8);
        expect(mark!.height, 'dog mark height').toBeGreaterThanOrEqual(8);
        await hintButton.click();
        await hintButton.click();
        await expect(playButton).toBeEnabled();
        await checkOnce('nosing: dog fight with cards placed');
        await playButton.click();
      } else if (await speedStart.isVisible()) {
        await checkOnce('nosing: speed round start');
        // Fake the clock from here so the 60 seconds pass at once.
        await page.clock.install();
        await speedStart.click();
        await expect(page.getByRole('timer')).toBeVisible();
        await checkOnce('nosing: speed round');
        await padOnScreen('.nosing-speed');
        await page.clock.runFor(61_000);
      } else if (await tryNumber.isVisible()) {
        await checkOnce('nosing: lock');
        await inViewport(tryNumber, 'lock: Try');
        // Tap a card, then a slot: it lands there. Tap the filled slot: it comes back.
        const firstSlot = page.getByRole('button', { name: /^Row 1, first number, empty$/ });
        if (await firstSlot.isVisible()) {
          await page.getByRole('group', { name: 'Your numbers' }).getByRole('button').first().click();
          await firstSlot.click();
          const filled = page.getByRole('button', { name: /^Row 1, first number, \d+$/ });
          await expect(filled).toBeVisible();
          await checkOnce('nosing: lock with a card placed');
          await filled.click();
          await expect(firstSlot).toBeVisible();
          await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeDisabled();
        }
        // The cat's hints fill the grid with more and more of the way.
        await hintButton.click();
        await expect(page.locator('.hint-note')).toBeVisible();
        await inViewport(tryNumber, 'lock with a hint note: Try');
        await checkOnce('nosing: lock with a hint note');
        for (let k = 0; k < 12 && !(await tryNumber.isEnabled()); k++) await hintButton.click();
        await checkOnce('nosing: lock with a number made');
        await tryNumber.click();
      }
    }
    if (needDog) expect(sawDog, 'this seed reaches the dog').toBe(true);
    await expect(unlocked).toBeVisible();
    await expect(unlocked.getByRole('button', { name: 'Back to the casebook' })).toBeVisible();
    await checkScreen(page, 'nosing: won');
  }

  test('play with the cat hints: roll, answer, speed round, the lock', async ({ page }) => {
    await playRun(page, true, false);
  });

  test.describe('a run that meets the dog', () => {
    // A seed whose run lands on the dog's snake head (the pad check is left to the run above: this seed's questions are taller).
    test.use({ seed: 10 });
    test('the dog fight: hints drive it, the screen fits, Continue goes on', async ({ page }) => {
      await playRun(page, false, true);
    });
  });
});
