import { test, expect, newCase, openTab } from './fixtures.ts';
import { touchDrag, touchTap, centre } from './touch.ts';

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, (ch) => '\\' + ch);

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

test('a second finger during a drag does not start a second drag, and the drop still places the first counter', async ({ page }) => {
  await newCase(page);
  await openTab(page, 'Map');
  const counters = page.locator('.tray .counter');
  const first = counters.nth(0);
  const second = counters.nth(1);
  const id = (await first.getAttribute('data-suspect'))!;
  const otherId = (await second.getAttribute('data-suspect'))!;
  const start = await centre(first);
  const other = await centre(second);
  const target = await centre(page.locator('.floorplan .tile:not(.closed):has(.room-name)').first());

  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', pts: { x: number; y: number; id: number }[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const f1 = (t: number) => ({ x: start.x + (target.x - start.x) * t, y: start.y + (target.y - start.y) * t, id: 1 });
  await send('touchStart', [f1(0)]);
  for (let i = 1; i <= 8; i++) await send('touchMove', [f1(i / 8)]);
  await expect(page.locator('.ghost')).toHaveCount(1);
  // Second finger lands on another counter and moves while the first is held.
  const f2 = (dx: number) => ({ x: other.x + dx, y: other.y, id: 2 });
  await send('touchStart', [f1(1), f2(0)]);
  for (let i = 1; i <= 4; i++) await send('touchMove', [f1(1), f2(10 * i)]);
  await expect(page.locator('.ghost')).toHaveCount(1);
  await send('touchEnd', [f1(1)]);
  await send('touchEnd', []);
  await cdp.detach();

  await expect(page.locator(`.floorplan [data-suspect="${id}"]`)).toHaveCount(1);
  await expect(page.locator(`.tray [data-suspect="${otherId}"]`)).toHaveCount(1);
  await expect(page.locator('.ghost')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
