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

/**
 * From the first roll, roll and move until a square asks a question (a ladder or snake square may come first),
 * check the encounter card, then press its button so the sum and the pad are showing.
 */
const playToQuestion = async (page: Page) => {
  const roll = page.getByRole('button', { name: 'Roll', exact: true });
  const move = page.getByRole('button', { name: 'Move', exact: true });
  const question = page.locator('.nosing-question');
  const encounter = page.locator('.nosing-encounter');
  for (let guard = 0; guard < 12; guard++) {
    await roll.or(move).or(encounter).first().waitFor();
    if (await encounter.isVisible()) break;
    if (await roll.isVisible()) {
      await checkScreen(page, 'nosing: roll');
      await roll.click();
    } else {
      await expect(page.locator('.nosing-roll')).toContainText(/You rolled \d+ · The cat will land on: .+, square \d+/);
      await expect(page.locator('.nosing-purr')).toHaveCount(1);
      await checkScreen(page, 'nosing: rolled');
      await move.click();
    }
  }
  // The encounter card comes first: the reason, what is at stake, then one button. No sum yet.
  await expect(encounter).toBeVisible();
  await expect(question).toBeHidden();
  await expect(page.locator('.numpad')).toHaveCount(0);
  await expect(encounter.locator('.stake')).toHaveCount(2);
  await checkScreen(page, 'nosing: encounter card');
  await encounter.getByRole('button', { name: /^(Start|Evade!|Jump!)$/ }).click();
  await expect(encounter).toBeHidden();
  await expect(question).toBeVisible();
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

  test('roll, move, then a question with the cat\'s three hints', async ({ page }) => {
    await openNosing(page);
    const roll = page.getByRole('button', { name: 'Roll', exact: true });
    const move = page.getByRole('button', { name: 'Move', exact: true });
    const question = page.locator('.nosing-question');
    await playToQuestion(page);

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

  // The OK button must stay inside 780px at any seed: the story and the cat's choices scroll, the pad does not.
  for (const seed of [2, 3]) {
    test.describe(`a question at seed ${seed}`, () => {
      test.use({ seed });
      test('OK stays inside 780px with the three choices open', async ({ page }) => {
        await openNosing(page);
        await playToQuestion(page);
        await padOnScreen(page, '.nosing-question');
        await hintButton(page).click();
        await hintButton(page).click();
        await expect(page.getByRole('group', { name: "The cat's three choices" })).toBeVisible();
        await checkScreen(page, `nosing: question with choices at seed ${seed}`);
        await padOnScreen(page, '.nosing-question');
      });
    });
  }

  test('a very long question scrolls inside its card and OK stays inside 780px', async ({ page }) => {
    await openNosing(page);
    await playToQuestion(page);
    // Stand in a story far longer than any real one (the page re-renders only if the text changes).
    await page.locator('.nosing-question .question-text').evaluate((el) => {
      el.textContent = Array.from({ length: 40 }, (_, i) => `Sentence number ${i + 1} of a very long story.`).join(' ');
    });
    await hintButton(page).click();
    await hintButton(page).click();
    await expect(page.getByRole('group', { name: "The cat's three choices" })).toBeVisible();
    await padOnScreen(page, '.nosing-question');
    const scroller = page.locator('.question-scroll');
    const room = await scroller.evaluate((el) => ({ scrolls: el.scrollHeight > el.clientHeight, overflowY: getComputedStyle(el).overflowY }));
    expect(room, 'the story scrolls inside its own box').toEqual({ scrolls: true, overflowY: 'auto' });
    await expect(page.locator('.nosing-question').getByRole('button', { name: '7', exact: true })).toBeVisible();
    await checkScreen(page, 'nosing: very long question');
  });

  test('the key opens, and tapping a mark says what it is and how far', async ({ page }) => {
    await openNosing(page);
    const key = page.getByRole('button', { name: 'Key', exact: true });
    await expect(key).toBeVisible();
    const list = page.getByRole('list', { name: 'What the icons mean' });
    await expect(list).toBeHidden();
    await key.click();
    await expect(list.getByRole('listitem')).toHaveCount(11);
    await expect(list).toContainText('Purr-diction: where the cat will land');
    await checkScreen(page, 'nosing: key open');
    await key.click();
    await expect(list).toBeHidden();
    // Tap the board: the nearest marked square is named under it.
    await page.locator('.nosing-board').click({ position: { x: 180, y: 120 } });
    await expect(page.locator('.nosing-info')).toContainText(/, square \d+\. (Here|\d+ squares? (ahead|back))\./);
    await checkScreen(page, 'nosing: tapped a square');
  });

  // Seed 12345's hint run has no speed square; seed 1's case has a run that reaches one.
  test.describe('a run with a speed round', () => {
  test.use({ seed: 1 });
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
    // Four cards, no pad and no phone keyboard, all inside 780px.
    const speed = page.locator('.nosing-speed');
    await expect(speed.locator('.numpad')).toHaveCount(0);
    const cards = page.getByRole('group', { name: 'Four cards' }).getByRole('button');
    await expect(cards).toHaveCount(4);
    for (let i = 0; i < 4; i++) await inViewport(page, cards.nth(i), `speed card ${i + 1}`);
    // Tap cards until one is right and one is wrong. A wrong tap leaves the count alone and takes 3 seconds off the label.
    const timer = page.getByRole('timer');
    const secondsLeft = async () => Number(/^(\d+) seconds left$/.exec((await timer.getAttribute('aria-label')) ?? '')?.[1]);
    const count = page.locator('.speed-count');
    const rightNow = async () => Number(/^(\d+) right$/.exec(await count.innerText())?.[1]);
    let right = 0;
    let wrong = 0;
    for (let tap = 0; tap < 12 && (right === 0 || wrong === 0); tap++) {
      const before = await secondsLeft();
      const was = await rightNow();
      await cards.nth(tap % 4).click();
      if ((await rightNow()) > was) {
        right++;
        expect(await secondsLeft(), 'a right tap costs nothing').toBe(before);
      } else {
        wrong++;
        expect(await rightNow(), 'a wrong tap does not count').toBe(was);
        expect(await secondsLeft(), `label after wrong tap ${wrong}`).toBe(before - 3);
      }
    }
    expect(right, 'saw a right tap').toBeGreaterThan(0);
    expect(wrong, 'saw a wrong tap').toBeGreaterThan(0);
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

    test('an attack turn shows its challenge line, and the screen fits', async ({ page }) => {
      await openNosingAt(page, 'dog', (v) => v.dog?.role === 'attack' && v.dog.challenge !== null && !v.dog.over);
      const dogFight = page.locator('.dog-fight');
      await expect(dogFight.locator('.dog-challenge')).toHaveText(/^Bonus: .+ \(one more number and operator next turn\)\.$/);
      await checkScreen(page, 'nosing: dog attack with a challenge');
      await inViewport(page, dogFight.getByRole('button', { name: /^Play/ }), 'dog challenge: Play');
    });

    test('a bonus hand of 6 numbers and 4 operators fits the phone', async ({ page }) => {
      await openNosingAt(page, 'dog', (v) => (v.dog?.numbers.length ?? 0) >= 6 && !v.dog?.over);
      const dogFight = page.locator('.dog-fight');
      await expect(dogFight.getByRole('group', { name: 'Your numbers' }).getByRole('button')).toHaveCount(6);
      await expect(dogFight.getByRole('group', { name: 'Signs' }).getByRole('button')).toHaveCount(4);
      await expect(dogFight.locator('.dog-last')).toContainText(/one more number and operator next turn/);
      await checkScreen(page, 'nosing: dog bonus hand');
      await inViewport(page, dogFight.getByRole('button', { name: /^Play/ }), 'dog bonus hand: Play');
    });

    test('swap: pick two cards, confirm, and it is only once', async ({ page }) => {
      await openNosingAt(page, 'dog');
      const dogFight = page.locator('.dog-fight');
      const numbers = dogFight.getByRole('group', { name: 'Your numbers' });
      const before = await numbers.getByRole('button').allInnerTexts();
      await dogFight.getByRole('button', { name: 'Swap cards', exact: true }).click();
      const pick = dogFight.getByRole('group', { name: 'Pick cards to swap' });
      const confirm = dogFight.getByRole('button', { name: /^Swap \d cards?$/ });
      await expect(confirm).toBeDisabled();
      await checkScreen(page, 'nosing: dog swap picking');
      await pick.getByRole('button').nth(0).click();
      await expect(confirm).toHaveText('Swap 1 card');
      await dogFight.getByRole('group', { name: 'Pick signs to swap' }).getByRole('button').nth(0).click();
      await expect(confirm).toHaveText('Swap 2 cards');
      // Two are picked: no third.
      await expect(pick.getByRole('button').nth(1)).toBeDisabled();
      // Cancel leaves everything as it was.
      await dogFight.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(dogFight.getByRole('group', { name: 'Your numbers' })).toBeVisible();
      await dogFight.getByRole('button', { name: 'Swap cards', exact: true }).click();
      await pick.getByRole('button').nth(0).click();
      await confirm.click();
      const dialog = page.getByRole('dialog', { name: 'Swap these cards?' });
      await expect(dialog).toContainText("You can only swap once this fight.");
      await dialog.getByRole('button', { name: 'Keep my cards' }).click();
      await expect(dialog).toBeHidden();
      await expect(confirm).toBeVisible();
      await confirm.click();
      await dialog.getByRole('button', { name: 'Swap', exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(dogFight.getByRole('button', { name: /^Swap/ })).toHaveCount(0);
      await expect(numbers.getByRole('button')).toHaveCount(before.length);
      await checkScreen(page, 'nosing: dog after swap');
    });
  });
});
