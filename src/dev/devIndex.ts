import { DEV_PAGES, PREVIEW_GROUPS } from './previews.ts';
import { SCENARIOS } from './scenarios.ts';

export interface DevRow {
  href: string;
  id: string;
  about: string;
}

export interface DevSection {
  /** Used for the element id and the jump button key. */
  anchor: string;
  title: string;
  /** Only the "Load a game state" section has a note under its heading. */
  note?: string;
  rows: DevRow[];
}

const LOAD_NOTE = 'Replaces the game saved in this browser, then opens the real game. Asks first.';

/** The `#dev` index in page order. A non-empty filter keeps rows whose id or text contains it, and drops empty sections. */
export function devSections(filter: string): DevSection[] {
  const pageRows = (group: string): DevRow[] =>
    DEV_PAGES.filter((p) => p.group === group).map((p) => ({ href: `#dev/${p.id}`, id: p.id, about: p.about }));
  const scenarioRows: DevRow[] = SCENARIOS.map((s) => ({ href: `#dev/load/${s.id}`, id: s.id, about: s.about }));

  const sections: DevSection[] = [];
  for (const g of PREVIEW_GROUPS) {
    sections.push({ anchor: `dev-${g.id}`, title: g.title, rows: pageRows(g.id) });
    if (g.id === 'tools') {
      sections.push({ anchor: 'dev-load', title: 'Load a game state', note: LOAD_NOTE, rows: scenarioRows });
    }
  }

  const q = filter.trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((s) => ({ ...s, rows: s.rows.filter((r) => r.id.toLowerCase().includes(q) || r.about.toLowerCase().includes(q)) }))
    .filter((s) => s.rows.length > 0);
}
