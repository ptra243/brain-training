import type { Locator, Page } from '@playwright/test';
import { test, expect, newCase, openTab } from './fixtures.ts';
import { touchDrag, touchTap, centre } from './touch.ts';
import { checkScreen } from './rules.ts';

const tray = (page: Page) => page.locator('.cb-tray');
const trayPieces = (page: Page) => tray(page).locator('.cb-tpiece');
const hint = (page: Page) => page.locator('[data-cbhint]');

async function openBoard(page: Page) {
  await newCase(page);
  await openTab(page, 'Jigsaw');
  await expect(tray(page)).toBeVisible();
  await expect(trayPieces(page).first()).toBeVisible();
}

/** The first square of the first tray piece, with the piece id and name. */
async function firstTrayPiece(page: Page) {
  const piece = trayPieces(page).first();
  const square = piece.locator('.cb-pc[data-cbpid]').first();
  return { piece, square, pid: (await square.getAttribute('data-cbpid'))!, name: (await piece.getAttribute('aria-label'))! };
}

/** Scroll so the tray piece and the target are both inside the 780px viewport (a drag can't scroll). */
async function bringIntoView(page: Page, a: Locator, b: Locator) {
  const ba = (await a.boundingBox())!;
  const bb = (await b.boundingBox())!;
  const top = Math.min(ba.y, bb.y);
  const bottom = Math.max(ba.y + ba.height, bb.y + bb.height);
  const mid = (top + bottom) / 2;
  await page.evaluate((dy) => window.scrollBy(0, dy), mid - 390);
}

const onScreen = (p: { x: number; y: number }) => p.x > 4 && p.x < 356 && p.y > 4 && p.y < 776;

/** Drag the first tray piece onto Unknown cells in turn until it leaves the tray. */
async function placeFirstPiece(page: Page) {
  const { square, pid } = await firstTrayPiece(page);
  const cells = page.locator('.cb-bc.unknown[data-cbr]');
  const n = Math.min(await cells.count(), 12);
  for (let i = 0; i < n; i++) {
    const cell = cells.nth(i);
    await bringIntoView(page, square, cell);
    const start = await centre(square);
    const target = await centre(cell);
    if (!onScreen(start) || !onScreen(target)) continue;
    await touchDrag(page, start, target);
    if ((await page.locator(`.cb-board [data-cbpid="${pid}"]`).count()) > 0) return pid;
  }
  throw new Error('no Unknown cell accepted the first piece');
}

test('dragging a tray piece onto the board places it', async ({ page }) => {
  await openBoard(page);
  const pid = await placeFirstPiece(page);
  await expect(tray(page).locator(`[data-cbpid="${pid}"]`)).toHaveCount(0);
  expect(await page.locator(`.cb-board [data-cbpid="${pid}"]`).count()).toBeGreaterThan(0);
  await checkScreen(page, 'jigsaw after drag');
});

test('dragging a placed piece back onto the tray takes it off the board', async ({ page }) => {
  await openBoard(page);
  const pid = await placeFirstPiece(page);
  const placed = page.locator(`.cb-board [data-cbpid="${pid}"]`).first();
  await bringIntoView(page, placed, tray(page));
  const start = await centre(placed);
  const target = await centre(tray(page));
  expect(onScreen(start) && onScreen(target)).toBe(true);
  await touchDrag(page, start, target);
  await expect(page.locator(`.cb-board [data-cbpid="${pid}"]`)).toHaveCount(0);
  await expect(tray(page).locator(`[data-cbpid="${pid}"]`).first()).toBeVisible();
});

test('a short tap on a tray piece selects it, and the late click does not undo that', async ({ page }) => {
  await openBoard(page);
  const { square, pid } = await firstTrayPiece(page);
  await square.scrollIntoViewIfNeeded();
  await touchTap(page, await centre(square));
  const panel = page.getByRole('region', { name: 'Selected piece' });
  await expect(panel).toBeVisible();
  // The tap sends a late click; give it time to arrive. The piece must stay selected and nothing may be placed.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));
  await expect(panel).toBeVisible();
  await expect(page.locator(`.cb-board [data-cbpid="${pid}"]`)).toHaveCount(0);
  await expect(tray(page).locator(`[data-cbpid="${pid}"]`).first()).toBeVisible();
});

test('dropping a tray piece on the cat asks for a hint and keeps the piece in the tray', async ({ page }) => {
  await openBoard(page);
  const { square, pid } = await firstTrayPiece(page);
  await bringIntoView(page, square, hint(page));
  const start = await centre(square);
  const target = await centre(hint(page));
  expect(onScreen(start) && onScreen(target)).toBe(true);
  await touchDrag(page, start, target);
  await expect(page.getByRole('status').filter({ hasText: /cat|curled/i })).toBeVisible();
  await expect(tray(page).locator(`[data-cbpid="${pid}"]`).first()).toBeVisible();
  await expect(page.locator(`.cb-board [data-cbpid="${pid}"]`)).toHaveCount(0);
});

test('a second finger while holding a piece turns it', async ({ page }) => {
  await openBoard(page);
  const { piece, square } = await firstTrayPiece(page);
  await square.scrollIntoViewIfNeeded();
  const before = await piece.locator('.cb-tgrid').innerHTML();
  const start = await centre(square);
  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', pts: { x: number; y: number; id: number }[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const f1 = (dx: number, dy: number) => ({ x: start.x + dx, y: start.y + dy, id: 1 });
  await send('touchStart', [f1(0, 0)]);
  for (let i = 1; i <= 4; i++) await send('touchMove', [f1(0, -4 * i)]);
  // Second finger down somewhere harmless while the first is held.
  const f2 = { x: 330, y: 400, id: 2 };
  await send('touchStart', [f1(0, -16), f2]);
  await send('touchEnd', [f1(0, -16)]);
  await send('touchEnd', []);
  await cdp.detach();
  await expect(piece.locator('.cb-tgrid')).not.toHaveJSProperty('innerHTML', before);
});
