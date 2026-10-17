import type { CSSProperties, ReactNode } from 'react';
import type { Case } from '../engine/types.ts';
import { itemName, roomName, suspectColour, suspectInitials, suspectName } from './names.ts';
import { cellState, type Action, type GridKind, type Progress, type Subject } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  /** The label she last tapped, highlighted while the clue drawer shows its clues. */
  focus: Subject | null;
  onFocus: (s: Subject) => void;
}

/**
 * One staircase grid, the classic logic-puzzle layout:
 *
 *              rooms   | weapons
 *   suspects   who was where | who had what
 *   weapons    what was where  (corner left empty)
 */

/** Row labels are narrow: "poison bottle" -> "poison", "candlestick" -> "candle." */
const shortLabel = (name: string) => {
  const first = name.replace(/^The /, '').split(' ')[0];
  return first.length > 7 ? `${first.slice(0, 6)}.` : first;
};

const LABEL: Record<string, string> = { x: 'crossed out', o: 'ticked', 'auto-x': 'ruled out by a tick', none: 'blank' };

export function GridPanel({ c, progress, dispatch, focus, onFocus }: Props) {
  /** A row or column label: tap it to see the clues about that person, room or weapon. */
  const label = (s: Subject, name: string, content: ReactNode, className = 'axis-label') => {
    const on = focus?.kind === s.kind && focus.id === s.id;
    return (
      <button className={`${className} ${on ? 'focused' : ''}`} aria-pressed={on} aria-label={`Clues about ${name}`} onClick={() => onFocus(s)}>
        {content}
      </button>
    );
  };

  const cell = (kind: GridKind, row: string, col: string, rowLabel: string, colLabel: string, split = false) => {
    const state = cellState(c, progress, kind, row, col);
    return (
      <td key={col} className={split ? 'split' : undefined}>
        <button
          className={`mark ${state ?? ''}`}
          aria-label={`${rowLabel}, ${colLabel}: ${LABEL[state ?? 'none']}`}
          onClick={() => dispatch({ type: 'cycle', kind, row, col })}
        >
          {state === 'o' ? '✓' : state ? '✕' : ''}
        </button>
      </td>
    );
  };

  return (
    <section className="panel">
      <p className="hint">Tap once to cross out, twice to tick. A tick rules out the rest of its row and column. Tap a name to see its clues.</p>
      <article className="card grid-card">
        <table className="logic-grid">
          <thead>
            <tr>
              <th />
              {c.rooms.map((room) => (
                <th key={room} scope="col">
                  {label({ kind: 'room', id: room }, roomName(room), <span>{roomName(room)}</span>)}
                </th>
              ))}
              {c.items.map((item, i) => (
                <th key={item} scope="col" className={i === 0 ? 'split' : undefined}>
                  {label({ kind: 'item', id: item }, `the ${itemName(item)}`, <span>{itemName(item)}</span>)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.suspects.map((s) => (
              <tr key={s}>
                <th scope="row">
                  {label(
                    { kind: 'suspect', id: s },
                    suspectName(s),
                    <span className="counter static mini" style={{ '--counter': suspectColour(s) } as CSSProperties} title={suspectName(s)}>
                      {suspectInitials(s)}
                    </span>,
                    'axis-label row-label',
                  )}
                </th>
                {c.rooms.map((room) => cell('suspect-room', s, room, suspectName(s), roomName(room)))}
                {c.items.map((item, i) => cell('suspect-item', s, item, suspectName(s), `the ${itemName(item)}`, i === 0))}
              </tr>
            ))}
          </tbody>
          <tbody className="lower">
            {c.items.map((item, r) => (
              <tr key={item}>
                <th scope="row" title={itemName(item)}>
                  {label({ kind: 'item', id: item }, `the ${itemName(item)}`, shortLabel(itemName(item)), 'axis-label row-label')}
                </th>
                {c.rooms.map((room) => cell('item-room', item, room, `The ${itemName(item)}`, roomName(room)))}
                {r === 0 && <td className="void" colSpan={c.items.length} rowSpan={c.items.length} />}
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
