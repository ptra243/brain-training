import type { Case } from '../engine/types.ts';
import { itemName, roomName, suspectName } from './names.ts';
import { axes, cellState, type Action, type GridKind, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
}

const GRIDS: { kind: GridKind; title: string; rowName: (id: string) => string; colName: (id: string) => string }[] = [
  { kind: 'suspect-room', title: 'Who was where', rowName: suspectName, colName: roomName },
  { kind: 'suspect-item', title: 'Who had what', rowName: suspectName, colName: itemName },
  { kind: 'item-room', title: 'What was where', rowName: itemName, colName: roomName },
];

/** Column headers are narrow on a phone: "Conservatory" -> "Conserv." */
const short = (name: string) => {
  const n = name.replace(/^The /, '');
  return n.length > 9 ? `${n.slice(0, 7).trimEnd()}.` : n;
};

const LABEL: Record<string, string> = { x: 'crossed out', o: 'ticked', 'auto-x': 'ruled out by a tick', none: 'blank' };

export function GridPanel({ c, progress, dispatch }: Props) {
  return (
    <section className="panel">
      <p className="hint">Tap once to cross out, twice to tick. A tick rules out the rest of its row and column.</p>
      {GRIDS.map(({ kind, title, rowName, colName }) => {
        const { rows, cols } = axes(c, kind);
        return (
          <article key={kind} className="card grid-card">
            <h2>{title}</h2>
            <table className="logic-grid">
              <thead>
                <tr>
                  <th />
                  {cols.map((col) => (
                    <th key={col} scope="col">
                      <span title={colName(col)}>{short(colName(col))}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row}>
                    <th scope="row">{rowName(row).replace(/^The /, '')}</th>
                    {cols.map((col) => {
                      const state = cellState(c, progress, kind, row, col);
                      return (
                        <td key={col}>
                          <button
                            className={`mark ${state ?? ''}`}
                            aria-label={`${rowName(row)}, ${colName(col)}: ${LABEL[state ?? 'none']}`}
                            onClick={() => dispatch({ type: 'cycle', kind, row, col })}
                          >
                            {state === 'o' ? '✓' : state ? '✕' : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        );
      })}
    </section>
  );
}
