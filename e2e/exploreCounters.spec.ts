import type { Page } from '@playwright/test';
import { test, expect } from './fixtures.ts';

interface Box {
  what: string;
  room: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Every drawn thing on the explore plan (counter discs, her marker, the red "!" marks, the body mark and
 * the room names) with its box and the room it sits in, measured in the page.
 */
async function boxes(page: Page): Promise<Box[]> {
  return page.evaluate(() => {
    const out: Box[] = [];
    const plan = document.querySelector('.floorplan.explore')!;
    const tiles = [...plan.querySelectorAll('.tile')] as HTMLElement[];
    const roomAt = (x: number, y: number) => {
      const t = tiles.find((el) => {
        const b = el.getBoundingClientRect();
        return x >= b.left && x < b.right && y >= b.top && y < b.bottom;
      });
      return t?.querySelector('.room-name')?.firstChild?.textContent ?? (t ? t.className : '?');
    };
    const roomOfCell = (el: Element) => {
      const b = el.getBoundingClientRect();
      return roomAt(b.left + b.width / 2, b.top + b.height / 2);
    };
    const add = (what: string, el: Element, rect = el.getBoundingClientRect(), room = roomOfCell(el)) => {
      if (rect.width && rect.height) out.push({ what, room: room ?? '?', x: rect.left, y: rect.top, w: rect.width, h: rect.height });
    };
    for (const el of plan.querySelectorAll('.map-person')) add(`person ${el.closest('button')?.getAttribute('aria-label')}`, el);
    for (const el of plan.querySelectorAll('.you-marker')) add('you', el);
    for (const el of plan.querySelectorAll('.todo-mark')) add('todo', el);
    // A text range is as tall as the font's content area; the letters take one font size of it.
    const letters = (node: Node, el: Element) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const b = range.getBoundingClientRect();
      const size = parseFloat(getComputedStyle(el).fontSize);
      return new DOMRect(b.left, b.top + (b.height - size) / 2, b.width, size);
    };
    for (const el of plan.querySelectorAll('.body-mark, .scene-mark')) add('mark', el, letters(el, el), roomOfCell(el));
    for (const el of plan.querySelectorAll('.room-name')) {
      const text = el.firstChild!;
      add('name', el, letters(text, el), text.textContent!);
    }
    return out;
  });
}

const overlap = (a: Box, b: Box) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 2 && h > 2 ? [w, h] : null; // under 2px is anti-aliasing and glyph side bearing
};

async function overlaps(page: Page) {
  const all = await boxes(page);
  const found: string[] = [];
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      // A room's name and its mark are one block of two lines.
      if (all[i].what + all[j].what === 'namemark' || all[i].what + all[j].what === 'markname') continue;
      const hit = overlap(all[i], all[j]);
      if (hit) found.push(`${all[i].what} (${all[i].room}) x ${all[j].what} (${all[j].room}): ${hit[0].toFixed(1)}x${hit[1].toFixed(1)}`);
    }
  return found;
}

// The Playwright config is 360 x 780. Where a room has fewer cells than people the discs may overlap; the
// previews show roomy rooms only, so nothing should touch.
for (const id of ['explore', 'shelf-campaign-plan']) {
  test(`#dev/${id}: counters, her marker, the marks and the room names never overlap`, async ({ page }) => {
    await page.goto(`/#dev/${id}`);
    await page.locator('.floorplan.explore .map-person').first().waitFor();
    expect(await overlaps(page)).toEqual([]);
  });
}
