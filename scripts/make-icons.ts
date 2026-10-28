// Renders public/icon.svg to the PNG icons the manifest and iOS need.
// Run with `node scripts/make-icons.ts` (needs Playwright's chromium).
// The SVG has rounded corners with a transparent gap; the page background is the
// SVG's own plate colour so the PNGs are full-bleed squares (safe for maskable,
// and iOS rounds the apple-touch-icon itself).
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const plate = '#2b2340';
const sizes: [string, number][] = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];

const browser = await chromium.launch();
try {
  for (const [file, size] of sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<html><body style="margin:0;background:${plate};overflow:hidden">` +
        `<div style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body></html>`,
    );
    await page.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), omitBackground: false });
    await page.close();
    console.log('wrote', file);
  }
} finally {
  await browser.close();
}
