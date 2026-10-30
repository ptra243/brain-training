import { itemIcons } from '../content/gridIcons.ts';

/** A weapon's line icon (see `itemIcons`), or null when the item has none. Sized and coloured by the CSS around it. */
export function ItemIcon({ item }: { item: string }) {
  const icon = itemIcons[item];
  if (!icon) return null;
  return (
    <svg className="item-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {icon.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
