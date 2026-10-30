import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { content } from '../src/content/index.ts';
import { newPlayCase } from '../src/engine/caseRef.ts';
import { emptyProgress } from '../src/game/state.ts';
import { PLAY_VERSION } from '../src/game/saveGuards.ts';
import { expect, test } from './fixtures.ts';
import { touchDrag } from './touch.ts';

// A saved Quick case, built on this run with the app's own engine: #shelf reads it from storage.
const { ref } = newPlayCase(content, () => 0.5);
const PREFIX = /const PREFIX = '([^']+)'/.exec(readFileSync(new URL('../src/game/storage.ts', import.meta.url), 'utf8'))?.[1];
if (!PREFIX) throw new Error('No PREFIX in src/game/storage.ts');
const KEY = `${PREFIX}quick`;

async function openShelf(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: KEY, value: JSON.stringify({ ref, progress: emptyProgress(), historyId: 'h-e2e', playVersion: PLAY_VERSION }) },
  );
  await page.goto('/#shelf');
}

const bookLink = (page: Page) => page.getByRole('link', { name: /Your case, .*: continue/ });
const peek = (page: Page) => page.getByRole('button', { name: 'Notebook · no clues yet' });

/** Opens the book past its opening, with a first tap on the shelf that arms the Back guard. */
async function openBook(page: Page) {
  await bookLink(page).click();
  await page.getByRole('button', { name: 'Find a clue' }).click();
  await expect(peek(page)).toBeVisible();
}

test('Back closes one layer per press, and at the bare shelf it stays on #shelf', async ({ page }) => {
  await openShelf(page);
  await bookLink(page).click(); // a real tap: the guard goes in on the pointerdown
  await page.getByRole('button', { name: 'Find a clue' }).click();
  await peek(page).click();
  const tabs = page.getByRole('navigation', { name: 'Notebook pages' });
  await expect(tabs).toBeVisible();

  // Notebook raised -> peek, then the book -> the shelf.
  await page.goBack();
  await expect(peek(page)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your notebook' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to the shelf' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Back to the shelf' })).toHaveCount(0);
  await expect(bookLink(page)).toBeVisible();

  // At the shelf with nothing open, Back does nothing.
  await page.goBack();
  await page.goBack();
  expect(new URL(page.url()).hash).toBe('#shelf');
  await expect(bookLink(page)).toBeVisible();
});

test('Back closes a pop-up first, then the puzzle page, then the book', async ({ page }) => {
  await openShelf(page);
  await openBook(page);
  await page.getByRole('button', { name: /, page \d+$/ }).first().click();
  const paper = page.getByTestId('puzzle-page');
  await expect(paper).toBeVisible();
  await paper.getByRole('button', { name: 'Solve', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(paper).toBeVisible();
  await page.goBack();
  await expect(paper).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to the shelf' })).toBeVisible();
  await page.goBack();
  await expect(bookLink(page)).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#shelf');
});

test('closing a layer on screen takes its history entry too, so Back does not skip a layer', async ({ page }) => {
  await openShelf(page);
  await openBook(page);
  await peek(page).click();
  await page.getByRole('button', { name: 'Put the notebook away' }).click();
  await expect(peek(page)).toBeVisible();
  // The book is the top layer now, not the (already closed) notebook.
  await page.goBack();
  await expect(bookLink(page)).toBeVisible();
  await page.goBack();
  expect(new URL(page.url()).hash).toBe('#shelf');
  await expect(bookLink(page)).toBeVisible();
});

test('Back tucks the dropped ribbons before it closes the book', async ({ page }) => {
  await openShelf(page);
  await openBook(page);
  await page.getByRole('button', { name: 'Show the ribbons' }).click();
  await expect(page.getByRole('navigation', { name: 'Parts of the case' })).toHaveClass(/open/);
  await page.goBack();
  await expect(page.getByRole('navigation', { name: 'Parts of the case' })).not.toHaveClass(/open/);
  await expect(page.getByRole('button', { name: 'Back to the shelf' })).toBeVisible();
});

test('swipes: the book turns sections, the raised notebook changes tab, no wrap', async ({ page }) => {
  await openShelf(page);
  await openBook(page);
  const app = page.locator('section[data-section]').first();
  await expect(app).toHaveAttribute('data-section', 'Case');

  // Right at Case: nothing. Left: Map, then Answer; left again at Answer: nothing.
  await touchDrag(page, { x: 100, y: 300 }, { x: 260, y: 300 });
  await expect(app).toHaveAttribute('data-section', 'Case');
  await touchDrag(page, { x: 260, y: 300 }, { x: 100, y: 300 });
  await expect(app).toHaveAttribute('data-section', 'Map');
  await touchDrag(page, { x: 260, y: 300 }, { x: 100, y: 300 });
  await expect(app).toHaveAttribute('data-section', 'Answer', { timeout: 5000 });
  await touchDrag(page, { x: 260, y: 300 }, { x: 100, y: 300 });
  await expect(app).toHaveAttribute('data-section', 'Answer');
  // A mostly vertical move is not a swipe.
  await touchDrag(page, { x: 200, y: 200 }, { x: 150, y: 400 });
  await expect(app).toHaveAttribute('data-section', 'Answer');

  // With the notebook raised the swipe is the notebook's: it changes tab and the book stays put.
  await peek(page).click();
  const tabs = page.getByRole('navigation', { name: 'Notebook pages' });
  await expect(tabs.getByRole('button', { name: 'Clues' })).toHaveAttribute('aria-current', 'page');
  await touchDrag(page, { x: 280, y: 500 }, { x: 80, y: 500 });
  await expect(tabs.locator('[aria-current="page"]')).not.toHaveText('Clues');
  await expect(app).toHaveAttribute('data-section', 'Answer');
  // Back to the right: previous tab (from the tab strip; the Grid's own page scrolls sideways and keeps its gestures).
  const strip = (await tabs.boundingBox())!;
  const y = strip.y + strip.height / 2;
  await touchDrag(page, { x: 80, y }, { x: 280, y });
  await expect(tabs.getByRole('button', { name: 'Clues' })).toHaveAttribute('aria-current', 'page');
  // No wrap: right again at the first tab does nothing.
  await touchDrag(page, { x: 80, y }, { x: 280, y });
  await expect(tabs.getByRole('button', { name: 'Clues' })).toHaveAttribute('aria-current', 'page');
});
