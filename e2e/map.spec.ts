import type { Page } from '@playwright/test';
import { test, expect, newCase, openTab } from './fixtures.ts';

/** Real touch events through CDP, as a finger would send them. */
async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 8) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
  await send('touchStart', from);
  for (let i = 1; i <= steps; i++) {
    await send('touchMove', { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
  }
  await send('touchEnd');
  await cdp.detach();
}

async function touchTap(page: Page, at: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, (ch) => '\\' + ch);

const centre = async (loc: ReturnType<Page['locator']>) => {
  const b = (await loc.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test('dragging a suspect counter from the tray into a room places it there', async ({ page }) => {
  await newCase(page);
  await openTab(page, 'Map');

  const counter = page.locator('.tray .counter').first();
  await expect(counter).toBeVisible();
  const name = (await counter.getAttribute('aria-label'))!;
  const id = (await counter.getAttribute('data-suspect'))!;

  // A room in play, found by its label tile.
  const roomTile = page.locator('.floorplan .tile:not(.closed):has(.room-name)').first();
  const roomName = ((await roomTile.locator('.room-name').innerText()).replace(/✕ body/, '').trim());
  const target = await centre(roomTile);
  const start = await centre(counter);
  // Every drag fits on one phone screen (src/game/CLAUDE.md).
  expect(start.y).toBeLessThan(780);
  expect(target.y).toBeLessThan(780);

  await touchDrag(page, start, target);

  // The counter left the tray and now sits on the plan, inside that room's tiles.
  await expect(page.locator(`.tray [data-suspect="${id}"]`)).toHaveCount(0);
  const placed = page.locator(`.floorplan [data-suspect="${id}"]`);
  await expect(placed).toHaveCount(1);
  const room = (await roomTile.boundingBox())!;
  const at = await centre(placed);
  expect(at.x).toBeGreaterThan(room.x - 40);
  expect(at.x).toBeLessThan(room.x + room.width + 80);

  // Map and grid share one source of truth: the grid cell is ticked.
  await openTab(page, 'Grid');
  await expect(page.getByRole('button', { name: new RegExp(`^${escapeRe(name)}, ${escapeRe(roomName)}: ticked`) })).toBeVisible();
});

test('a short tap on a counter opens its clues, and the late click lands on nothing', async ({ page }) => {
  await newCase(page);
  await openTab(page, 'Map');
  const counter = page.locator('.tray .counter').first();
  const id = (await counter.getAttribute('data-suspect'))!;
  await touchTap(page, await centre(counter));

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Place in a room' })).toBeVisible();
  // The tap sends a late click; give it time to arrive. The sheet must stay open and nothing may be placed.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));
  await expect(dialog).toBeVisible();
  await expect(page.locator(`.floorplan [data-suspect="${id}"]`)).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(`.tray [data-suspect="${id}"]`)).toHaveCount(1);
});
