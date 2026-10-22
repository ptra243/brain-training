import { portraits } from '../content/portraits.ts';
import { suspectInitials } from './names.ts';
import { hasPortrait, Portrait } from './Portrait.tsx';

/** What sits inside a suspect counter: the faceted head when they have a portrait, else their initials. Decorative. */
export function SuspectCounterFace({ id, guests }: { id: string; guests: readonly string[] }) {
  return hasPortrait(id) ? <Portrait parts={portraits[id]} view="counter" /> : <>{suspectInitials(id, guests)}</>;
}
