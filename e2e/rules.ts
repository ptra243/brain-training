import { expect, type Page } from '@playwright/test';

/** Smallest touch target, in CSS px (root CLAUDE.md). */
const MIN = 44;

export interface Exception {
  /** CSS selector matching the control. */
  selector: string;
  /** Smaller minimum allowed for it (defaults to 44). */
  minWidth?: number;
  minHeight?: number;
  reason: string;
}

/** The ONLY accepted exceptions to the 44px rule. Do not add entries to make a test pass. */
export const EXCEPTIONS: Exception[] = [
  {
    selector: '.logic-grid button.mark',
    minWidth: 24,
    minHeight: 40,
    reason: 'src/game/CLAUDE.md "The grid is one staircase": at 5 suspects grid cells are ~27px wide, 40px tall.',
  },
];

interface Offender {
  tag: string;
  name: string;
  w: number;
  h: number;
}

/** Call on every screen visited: no sideways scroll, and every visible control is at least 44x44. */
export async function checkScreen(page: Page, label: string): Promise<void> {
  const result = await page.evaluate(
    ({ min, exceptions }) => {
      const doc = document.documentElement;
      const scrollW = doc.scrollWidth;
      const innerW = window.innerWidth;
      const dialog = document.querySelector('[role="dialog"]');
      const root: ParentNode = dialog ?? document;
      const els = root.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea');
      const small: Offender[] = [];
      for (const el of els) {
        if (el instanceof HTMLInputElement && el.type === 'hidden') continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
        if (el.closest('[aria-hidden="true"]') || el.closest('[hidden]')) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // Off-screen or clipped to nothing (visually hidden inputs).
        if (r.right <= 0 || r.bottom <= 0 || r.left >= innerW) continue;
        if (r.width <= 2 || r.height <= 2) continue;
        if (style.position === 'absolute' && style.clip !== 'auto' && style.clip !== '') continue;
        let minW = min;
        let minH = min;
        for (const ex of exceptions) {
          if (el.matches(ex.selector)) {
            minW = ex.minWidth ?? min;
            minH = ex.minHeight ?? min;
          }
        }
        // Allow sub-pixel rounding.
        if (r.width + 0.5 < minW || r.height + 0.5 < minH) {
          const name = (el.getAttribute('aria-label') || el.textContent || (el as HTMLInputElement).placeholder || '').replace(/\s+/g, ' ').trim();
          small.push({ tag: el.tagName.toLowerCase(), name: name.slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
        }
      }
      return { scrollW, innerW, small };
    },
    { min: MIN, exceptions: EXCEPTIONS.map(({ selector, minWidth, minHeight }) => ({ selector, minWidth, minHeight })) },
  );
  expect.soft(result.scrollW, `${label}: sideways scroll (scrollWidth ${result.scrollW} > ${result.innerW})`).toBeLessThanOrEqual(result.innerW);
  const list = result.small.slice(0, 12).map((o) => `${o.tag} "${o.name}" ${o.w}x${o.h}`);
  const more = result.small.length > 12 ? ` (+${result.small.length - 12} more)` : '';
  expect.soft(result.small.length, `${label}: controls under ${MIN}px: ${list.join('; ')}${more}`).toBe(0);
}
