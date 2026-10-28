import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures.ts';
import { checkScreen } from './rules.ts';
import { openNosing, openNosingAt } from './nosingSaves.ts';

const typeNumber = async (page: Page, n: number) => {
  const pad = page.getByTestId('numpad').first();
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
const padOnScreen = async (page: Page, scope: Locator) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = await scope.getByRole('button', { name: 'OK', exact: true }).boundingBox();
  expect(box, 'question: OK button').not.toBeNull();
  expect(box!.y + box!.height, 'question: OK inside 780px').toBeLessThanOrEqual(780);
};

const hintButton = (page: Page) => page.getByRole('button', { name: /for a hint$/ });

/**
 * From the first roll, roll and move until a square asks a question (a ladder or snake square may come first),
 * check the encounter card, then press its button so the sum and the pad are showing.
 */
const playToQuestion = async (page: Page) => {
  const roll = page.getByRole('button', { name: 'Roll', exact: true });
  const move = page.getByRole('button', { name: 'Move', exact: true });
  const question = page.getByTestId('nosing-question');
  const encounter = page.getByTestId('nosing-encounter').filter({ hasText: /Get it/ });
  const carryOn = page.getByRole('button', { name: 'Carry on', exact: true });
  for (let guard = 0; guard < 12; guard++) {
    await roll.or(move).or(encounter).or(carryOn).first().waitFor();
    if (await encounter.isVisible()) break;
    if (await carryOn.isVisible()) {
      await checkScreen(page, 'nosing: empty square pop-up');
      await carryOn.click();
      continue;
    }
    if (await roll.isVisible()) {
      await checkScreen(page, 'nosing: roll');
      await roll.click();
    } else {
      await expect(page.getByTestId('nosing-roll')).toContainText(/You rolled \d+ · The cat will land on: .+, square \d+/);
      await expect(page.getByTestId('nosing-purr')).toHaveCount(1);
      await checkScreen(page, 'nosing: rolled');
      await move.click();
    }
  }
  // The encounter card comes first: the reason, what is at stake, then one button. No sum yet.
  await expect(encounter).toBeVisible();
  await expect(question).toBeHidden();
  await expect(page.getByTestId('numpad')).toHaveCount(0);
  await expect(encounter.getByTestId('stake')).toHaveCount(2);
  await checkScreen(page, 'nosing: encounter card');
  await encounter.getByRole('button', { name: /^(Start|Evade!|Jump!)$/ }).click();
  await expect(encounter).toBeHidden();
  await expect(question).toBeVisible();
};
test.describe('nosing around', () => {
  // Seed 12345 now lands on a house whose short board meets the dog before any question: seed 2 asks one first.
  test.use({ seed: 2 });
  test('Solve is hidden before the first roll', async ({ page }) => {
    await openNosing(page);
    await expect(page.getByRole('button', { name: 'Roll', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Solve', exact: true })).toHaveCount(0);
    await checkScreen(page, 'nosing: first roll');
  });

  test('auto-roll rolls and moves by itself, and the landing pop-up closes after 3 seconds', async ({ page }) => {
    await openNosing(page);
    const toggle = page.getByRole('switch', { name: /^Auto-roll/ });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await checkScreen(page, 'nosing: auto-roll off');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await checkScreen(page, 'nosing: auto-roll on');
    // No taps on Roll or Move: the cat lands and a pop-up appears.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 6000 });
    await checkScreen(page, 'nosing: landing pop-up');
    // Nobody taps it: it goes by itself within 3 seconds or so.
    await expect(dialog).toBeHidden({ timeout: 4500 });
    // The switch is remembered on the device.
    expect(await page.evaluate(() => Object.entries(localStorage).filter(([k]) => k.endsWith(':autoRoll')).map(([, v]) => v))).toEqual(['true']);
  });

  test('Solve on a question answers only that step; the game goes on', async ({ page }) => {
    await openNosing(page);
    await playToQuestion(page);
    await page.getByRole('button', { name: 'Solve', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Solve this step?' });
    await expect(dialog).toContainText("The cat answers this one for you and it counts as a hint.");
    await checkScreen(page, 'nosing: solve this step');
    await dialog.getByRole('button', { name: 'Keep playing' }).click();
    await expect(page.getByTestId('nosing-question')).toBeVisible();
    await page.getByRole('button', { name: 'Solve', exact: true }).click();
    await dialog.getByRole('button', { name: 'Solve this step' }).click();
    await expect(page.getByTestId('nosing-question')).toBeHidden();
    await expect(page.locator('section.unlocked')).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'The working' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Roll', exact: true }).or(page.getByRole('button', { name: 'Move', exact: true })).first()).toBeVisible();
    // Between steps there is nothing to solve.
    await expect(page.getByRole('button', { name: 'Solve', exact: true })).toHaveCount(0);
    await checkScreen(page, 'nosing: after solving a step');
  });

  test('Solve at the lock opens it, shows the way and unlocks the clues', async ({ page }) => {
    await openNosingAt(page, 'lock');
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
    const question = page.getByTestId('nosing-question');
    await playToQuestion(page);

    // Ask the cat three times: the working, three choices, the answer.
    await hintButton(page).click();
    await hintButton(page).click();
    await expect(page.getByRole('group', { name: "The cat's three choices" })).toBeVisible();
    await checkScreen(page, 'nosing: question with choices');
    await padOnScreen(page, question);
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
        await padOnScreen(page, page.getByTestId('nosing-question'));
        await hintButton(page).click();
        await hintButton(page).click();
        await expect(page.getByRole('group', { name: "The cat's three choices" })).toBeVisible();
        await checkScreen(page, `nosing: question with choices at seed ${seed}`);
        await padOnScreen(page, page.getByTestId('nosing-question'));
      });
    });
  }

  test('a very long question scrolls inside its card and OK stays inside 780px', async ({ page }) => {
    await openNosing(page);
    await playToQuestion(page);
    // Stand in a story far longer than any real one (the page re-renders only if the text changes).
    await page.getByTestId('nosing-question').getByTestId('question-text').evaluate((el) => {
      el.textContent = Array.from({ length: 40 }, (_, i) => `Sentence number ${i + 1} of a very long story.`).join(' ');
    });
    await hintButton(page).click();
    await hintButton(page).click();
    await expect(page.getByRole('group', { name: "The cat's three choices" })).toBeVisible();
    await padOnScreen(page, page.getByTestId('nosing-question'));
    const scroller = page.getByTestId('question-scroll');
    const room = await scroller.evaluate((el) => ({ scrolls: el.scrollHeight > el.clientHeight, overflowY: getComputedStyle(el).overflowY }));
    expect(room, 'the story scrolls inside its own box').toEqual({ scrolls: true, overflowY: 'auto' });
    await expect(page.getByTestId('nosing-question').getByRole('button', { name: '7', exact: true })).toBeVisible();
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
    await page.getByTestId('nosing-board').click({ position: { x: 180, y: 120 } });
    await expect(page.getByTestId('nosing-info')).toContainText(/, square \d+\. (Here|\d+ squares? (ahead|back))\./);
    await checkScreen(page, 'nosing: tapped a square');
  });

  // Seed 5's case has a run that reaches one.
  test.describe('a run with a speed round', () => {
  test.use({ seed: 5 });
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
    const speed = page.getByTestId('nosing-speed');
    await expect(speed.getByTestId('numpad')).toHaveCount(0);
    const cards = page.getByRole('group', { name: 'Four cards' }).getByRole('button');
    await expect(cards).toHaveCount(4);
    for (let i = 0; i < 4; i++) await inViewport(page, cards.nth(i), `speed card ${i + 1}`);
    // Tap cards until one is right and one is wrong. A wrong tap leaves the count alone and takes 3 seconds off the label.
    const timer = page.getByRole('timer');
    const secondsLeft = async () => Number(/^(\d+) seconds left$/.exec((await timer.getAttribute('aria-label')) ?? '')?.[1]);
    const count = page.getByTestId('speed-count');
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

  // Some seeds' locks have too few tries for hints to build the number: seed 1's does not.
  test.describe('the lock', () => {
  test.use({ seed: 1 });
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
      // Try stays enabled after a miss and the hints start again from the first step: three reach the whole way.
      for (let k = 0; k < 3; k++) await hintButton(page).click();
      await tryNumber.click();
    }
    await expect(unlocked).toBeVisible();
    await expect(unlocked.getByRole('button', { name: 'Back to the casebook' })).toBeVisible();
    await checkScreen(page, 'nosing: won');
  });
  });

  test.describe('a run that meets the dog', () => {
    // A seed whose run lands on the dog's snake head.
    test.use({ seed: 10 });
    test('the dog fight: hints drive it, the screen fits, Continue goes on', async ({ page }) => {
      await openNosingAt(page, 'dog');
      const dogFight = page.getByTestId('dog-fight');
      const dogResult = page.getByTestId('dog-result');
      const playButton = dogFight.getByRole('button', { name: /^Play/ });
      await expect(dogFight).toBeVisible();
      await checkScreen(page, 'nosing: dog fight');
      await inViewport(page, playButton, 'dog fight: Play');
      // The cat's three hints: a question, then cards pushed into place.
      await hintButton(page).click();
      await expect(page.locator('.hint-note')).toContainText('sizes up your cards');
      await inViewport(page, playButton, 'dog fight with a hint note: Play');
      const mark = await page.getByTestId('nosing-dog-mark').boundingBox();
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

    test('Solve in the dog fight wins it and the game goes on', async ({ page }) => {
      await openNosingAt(page, 'dog');
      await page.getByRole('button', { name: 'Solve', exact: true }).click();
      await page.getByRole('dialog', { name: 'Solve this step?' }).getByRole('button', { name: 'Solve this step' }).click();
      await expect(page.getByTestId('dog-result')).toBeVisible();
      await expect(page.locator('section.unlocked')).toHaveCount(0);
      await page.getByTestId('dog-result').getByRole('button', { name: 'Continue' }).click();
      await expect(page.getByTestId('dog-result')).toBeHidden();
    });

    test('an attack turn shows its challenge line, and the screen fits', async ({ page }) => {
      await openNosingAt(page, 'dog', (v) => v.dog?.role === 'attack' && v.dog.challenge !== null && !v.dog.over);
      const dogFight = page.getByTestId('dog-fight');
      await expect(dogFight.getByTestId('dog-challenge')).toHaveText(/^Bonus: .+ \(one more number and operator next turn\)\.$/);
      await checkScreen(page, 'nosing: dog attack with a challenge');
      await inViewport(page, dogFight.getByRole('button', { name: /^Play/ }), 'dog challenge: Play');
    });

    test('a bonus hand of 6 numbers and 4 operators fits the phone', async ({ page }) => {
      await openNosingAt(page, 'dog', (v) => (v.dog?.numbers.length ?? 0) >= 6 && !v.dog?.over);
      const dogFight = page.getByTestId('dog-fight');
      // Signs first, then numbers, all in one hand: 4 signs and 6 numbers.
      await expect(dogFight.getByRole('group', { name: 'Your cards' }).getByRole('button')).toHaveCount(10);
      await expect(dogFight.getByTestId('dog-last')).toContainText(/one more number and operator next turn/);
      await checkScreen(page, 'nosing: dog bonus hand');
      await inViewport(page, dogFight.getByRole('button', { name: /^Play/ }), 'dog bonus hand: Play');
    });

    test('swap: pick two cards, confirm, and it is only once', async ({ page }) => {
      await openNosingAt(page, 'dog');
      const dogFight = page.getByTestId('dog-fight');
      const numbers = dogFight.getByRole('group', { name: 'Your cards' });
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
      await expect(dogFight.getByRole('group', { name: 'Your cards' })).toBeVisible();
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
