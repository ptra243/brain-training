import type { CSSProperties, ReactNode } from 'react';
import type { Case } from '../engine/types.ts';
import { itemName, roomName, suspectColour, suspectName, faceClass } from './names.ts';
import { SuspectCounterFace } from './SuspectCounterFace.tsx';
import { itemIcons } from '../content/gridIcons.ts';
import { Paw } from './games/Hints.tsx';
import { showsWrong } from './gridHints.ts';
import { cellState, markKey, sharedRooms, type Action, type GridKind, type Progress, type Subject } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  /** The label she last tapped, highlighted while the clue drawer shows its clues. */
  focus: Subject | null;
  onFocus: (s: Subject) => void;
  /** `markKey` of the square the cat's hint is about. */
  pawedSquare?: string;
  /** Draw the weapons as small line icons instead of words (the #shelf notebook). */
  icons?: boolean;
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

export function GridPanel({ c, progress, dispatch, focus, onFocus, pawedSquare, icons = false }: Props) {
  const itemLabel = (item: string, word: ReactNode) => {
    const icon = icons ? itemIcons[item] : undefined;
    if (!icon) return word;
    return (
      <svg className="item-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {icon.paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  };
  /** A row or column label: tap it to see the clues about that person, room or weapon. */
  const label = (s: Subject, name: string, content: ReactNode, className = 'axis-label') => {
    const on = focus?.kind === s.kind && focus.id === s.id;
    return (
      <button className={`${className} ${on ? 'focused' : ''}`} aria-pressed={on} aria-label={`Clues about ${name}`} title={icons ? name : undefined} onClick={() => onFocus(s)}>
        {content}
      </button>
    );
  };

  const cell = (kind: GridKind, row: string, col: string, rowLabel: string, colLabel: string, split = false) => {
    const state = cellState(c, progress, kind, row, col);
    const key = markKey(kind, row, col);
    const wrong = showsWrong(progress, progress.gridHints, key);
    const pawed = pawedSquare === key && !state;
    return (
      <td key={col} className={split ? 'split' : undefined}>
        <button
          className={`mark ${state ?? ''} ${wrong ? 'wrong' : ''} ${pawed ? 'pawed' : ''}`}
          aria-label={`${rowLabel}, ${colLabel}: ${LABEL[state ?? 'none']}${wrong ? ', circled as wrong' : ''}${pawed ? ', the cat is sitting here' : ''}`}
          onClick={() => dispatch({ type: 'cycle', kind, row, col })}
        >
          {state === 'o' ? '✓' : state ? '✕' : pawed ? <Paw /> : ''}
        </button>
      </td>
    );
  };

  return (
    <section className="panel">
      <p className="hint">
        Tap once to cross out, twice to tick.{' '}
        {sharedRooms(c)
          ? 'Rooms can hold several people, so a tick only rules out the rest of its row (and each weapon still has one holder).'
          : 'A tick rules out the rest of its row and column.'}{' '}
        Tap a name to see its clues.
      </p>
      <article className="card logic-grid-card">
        <table className={icons ? 'logic-grid icons' : 'logic-grid'}>
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
                  {label({ kind: 'item', id: item }, `the ${itemName(item)}`, itemLabel(item, <span>{itemName(item)}</span>))}
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
                    suspectName(s, c.guests),
                    <span className={`counter static mini${faceClass(s)}`} style={{ '--counter': suspectColour(s) } as CSSProperties} title={suspectName(s, c.guests)}>
                      <SuspectCounterFace id={s} guests={c.guests} />
                    </span>,
                    'axis-label row-label',
                  )}
                </th>
                {c.rooms.map((room) => cell('suspect-room', s, room, suspectName(s, c.guests), roomName(room)))}
                {c.items.map((item, i) => cell('suspect-item', s, item, suspectName(s, c.guests), `the ${itemName(item)}`, i === 0))}
              </tr>
            ))}
          </tbody>
          <tbody className="lower">
            {c.items.map((item, r) => (
              <tr key={item}>
                <th scope="row" title={itemName(item)}>
                  {label({ kind: 'item', id: item }, `the ${itemName(item)}`, itemLabel(item, shortLabel(itemName(item))), 'axis-label row-label')}
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
