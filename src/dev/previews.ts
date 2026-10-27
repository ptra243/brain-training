// The #dev/<id> previews: a screen the save cannot show, rendered with sample lines.
// Add the id here, in DevPreview.tsx, and in src/dev/CLAUDE.md.

export interface PreviewInfo {
  id: string;
  /** What a look check judges. */
  about: string;
  /** 'game' keeps the baize page; 'plain' is the light inspector page. */
  look: 'game' | 'plain';
}

export const PREVIEWS: readonly PreviewInfo[] = [
  { id: 'hints', about: 'The cat counter on each hint button and note, and the questioning chair with the portrait filling the ring', look: 'game' },
  { id: 'next-murder', about: 'The next-murder scene between rounds', look: 'game' },
  { id: 'opening', about: 'The campaign opening at the start: the culprit line, 0 of N spoken to, the guests in a grid, Skip', look: 'game' },
  { id: 'opening-midway', about: 'The opening part-way: some guests spoken to, one guest sheet open with the victim line and a clue', look: 'game' },
  { id: 'opening-cat', about: 'The opening after every guest: the cat sheet before and its clue (or the goodbye dialog)', look: 'game' },
  { id: 'opening-skip', about: 'The skip summary: clues in the casebook and the guests not spoken to', look: 'game' },
  { id: 'escaped', about: 'The killer got away dialog', look: 'game' },
  { id: 'guess-now', about: 'The Guess now? warning', look: 'game' },
  { id: 'time-card', about: 'The time card after a puzzle', look: 'game' },
  { id: 'explore', about: 'An explored round on the map, at 9pm', look: 'game' },
  { id: 'midnight', about: 'The locked map at midnight', look: 'game' },
  { id: 'you-sheet', about: 'The You sheet: her portrait and tonight at a glance', look: 'game' },
  { id: 'nosing-houses', about: 'The Nosing around board at the start on each other house (medium)', look: 'game' },
  { id: 'houses', about: 'The lodge, courtyard house and steps on the floor plan', look: 'game' },
  { id: 'motives', about: 'Talk to any guest on any card, thread and mood, one beat at a time or all at once', look: 'game' },
  { id: 'shelf-ribbons', about: 'The #shelf puzzle book open on Case with the ribbons dropped', look: 'plain' },
  { id: 'portraits', about: 'The portrait gallery', look: 'plain' },
  { id: 'dogfight', about: 'The dog fight board in each state, with any cat helper', look: 'plain' },
];

/** What the plain #dev page lists: the case inspector, then every preview. */
export const DEV_PAGES: readonly { id: string; about: string }[] = [
  { id: 'cases', about: 'Case inspector: step through cases, see the map, clues and answer, play a case code' },
  ...PREVIEWS,
];

/** The id in `#dev/<id>`, or null for the plain `#dev` page. */
export function previewIdFromHash(hash: string): string | null {
  const m = /^#dev\/(.*)$/.exec(hash);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}
