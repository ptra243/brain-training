import type { Page } from '@playwright/test';

export const rooms = (page: Page) => page.locator('.floorplan .tile-hit');

/** Tap a cell of room `i` that a guest isn't standing on. A guest can cover the room's label button. */
export async function clickRoom(page: Page, i: number): Promise<boolean> {
  const target = await page.evaluate((i) => {
    const hits = [...document.querySelectorAll<HTMLElement>('.floorplan .tile-hit')];
    const label = hits[i]?.closest('.tile');
    if (!label) return null;
    const bg = getComputedStyle(label).backgroundColor;
    const tiles = [...document.querySelectorAll<HTMLElement>('.floorplan .tile:not(.closed)')];
    for (let n = 0; n < tiles.length; n++) {
      const el = tiles[n];
      if (getComputedStyle(el).backgroundColor !== bg) continue;
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (top && (el === top || el.contains(top))) return n;
    }
    return null;
  }, i);
  if (target === null) return false;
  await page.locator('.floorplan .tile:not(.closed)').nth(target).click();
  return true;
}

/** Walk room to room until `what` shows in the room list; returns once it does. */
export async function walkTo(page: Page, what: ReturnType<Page['locator']>) {
  const n = await rooms(page).count();
  for (let i = 0; i < n; i++) {
    if (!(await clickRoom(page, i))) continue;
    if ((await what.count()) > 0) return;
  }
  throw new Error('nothing like that in any room');
}
