import { test as base, expect } from '@playwright/test';

/**
 * The app picks case codes with crypto.getRandomValues(new Uint32Array(1)).
 * Replace that with a fixed LCG sequence so every run builds the same case,
 * and start every test with empty localStorage.
 */
export const test = base.extend<{ seed: number }>({
  /** Starting state of the fake random numbers; the same seed always builds the same case. */
  seed: [12345, { option: true }],
  page: async ({ page, seed }, use) => {
    await page.addInitScript((seed0: number) => {
      if (sessionStorage.getItem('e2e-started') === null) {
        sessionStorage.setItem('e2e-started', '1');
        localStorage.clear(); // first load of this tab only: a reload keeps her save
      }
      let state = seed0;
      const real = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = ((arr: ArrayBufferView) => {
        if (arr instanceof Uint32Array) {
          for (let i = 0; i < arr.length; i++) {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            arr[i] = state;
          }
          return arr;
        }
        return real(arr as never);
      }) as typeof crypto.getRandomValues;
    }, seed);
    await use(page);
  },
});

export { expect };

import type { Page } from '@playwright/test';

/** Home -> New case; waits for the casebook tab bar. */
export async function newCase(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New case' }).click();
  await expect(page.getByRole('navigation', { name: 'Casebook' })).toBeVisible();
}

export const tabBar = (page: Page) => page.getByRole('navigation', { name: 'Casebook' });
export const openTab = (page: Page, name: string) => tabBar(page).getByRole('button', { name }).click();

/**
 * The campaign opens on the opening scene: Skip, confirm, past the summary, until the casebook's round bar shows.
 * Call it right after "Start the campaign". Specs about the opening itself go through the scene instead.
 */
export async function skipOpening(page: Page) {
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Open the casebook' }).click();
  await expect(page.getByRole('navigation', { name: 'Rounds' })).toBeVisible();
}
