// Dev page for phases 1–2: step through generated cases, see the map, the
// hidden answer and the clue set, and confirm each case has one solution.
// The real casebook UI replaces this as the home screen in phase 3.

import { useMemo, useState } from 'react';
import { content } from '../content/index.ts';
import { cellLabel, roomAdjacency } from '../engine/house.ts';
import { generateCase } from '../engine/generate.ts';
import { allCandidates, countSolutions } from '../engine/solver.ts';
import type { Difficulty } from '../engine/types.ts';

const ROOM_COLOURS = ['#e8d7c3', '#cfdcc8', '#d6d3e6', '#ecd0cf', '#cfe0e6', '#ece2bf'];
const nameOf = <T extends { id: string; name: string }>(list: readonly T[], id: string) =>
  list.find((x) => x.id === id)?.name ?? id;

export function CaseInspector() {
  const [number, setNumber] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty | 'campaign'>('campaign');
  const [reveal, setReveal] = useState(false);

  const c = useMemo(
    () => generateCase(content, number, difficulty === 'campaign' ? undefined : difficulty),
    [number, difficulty],
  );
  const solutions = useMemo(
    () =>
      countSolutions(
        allCandidates(c.rooms, c.items),
        c.clues.map((cl) => cl.fact),
        { suspects: c.suspects, adjacency: roomAdjacency(content.house) },
        2,
      ),
    [c],
  );

  const { house } = content;
  const roomAt = (r: number, col: number) =>
    house.rooms.findIndex((room) => room.cells.some(([rr, cc]) => rr === r && cc === col));

  return (
    <main className="inspector">
      <header>
        <h1>Case {c.number}</h1>
        <p className="muted">
          {c.difficulty} · {c.suspects.length} suspects · {c.clues.length} clues ·{' '}
          <span className={solutions === 1 ? 'ok' : 'bad'}>
            {solutions === 1 ? 'one solution' : `${solutions}+ solutions`}
          </span>
        </p>
      </header>

      <div className="controls">
        <button onClick={() => setNumber((n) => Math.max(1, n - 1))} aria-label="Previous case">‹</button>
        <input
          type="number"
          min={1}
          value={number}
          onChange={(e) => setNumber(Math.max(1, Number(e.target.value) || 1))}
        />
        <button onClick={() => setNumber((n) => n + 1)} aria-label="Next case">›</button>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | 'campaign')}>
          <option value="campaign">Campaign curve</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <section>
        <h2>{house.name}</h2>
        <div className="map" style={{ gridTemplateColumns: `1.5rem repeat(${house.cols}, 1fr)` }}>
          <span />
          {Array.from({ length: house.cols }, (_, col) => (
            <span key={col} className="axis">{cellLabel([0, col])[0]}</span>
          ))}
          {Array.from({ length: house.rows }, (_, r) => [
            <span key={`r${r}`} className="axis">{r + 1}</span>,
            ...Array.from({ length: house.cols }, (_, col) => {
              const i = roomAt(r, col);
              const room = house.rooms[i];
              const first = room.cells[0][0] === r && room.cells[0][1] === col;
              const inPlay = c.rooms.includes(room.id);
              return (
                <span
                  key={`${r}-${col}`}
                  className={`cell ${inPlay ? '' : 'empty'}`}
                  style={{ background: ROOM_COLOURS[i % ROOM_COLOURS.length] }}
                >
                  {first ? room.name : ''}
                </span>
              );
            }),
          ])}
        </div>
      </section>

      <section>
        <h2>Clues</h2>
        <ol className="clues">
          <li className="scene">{c.sceneClue.text} <span className="tag">{c.sceneClue.delivery}</span></li>
          {c.clues.map((cl) => (
            <li key={cl.id}>
              {cl.text} <span className="tag">{cl.delivery}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <button className="reveal" onClick={() => setReveal((v) => !v)}>
          {reveal ? 'Hide answer' : 'Show answer'}
        </button>
        {reveal && (
          <table className="answer">
            <thead>
              <tr><th>Suspect</th><th>Room</th><th>Holding</th></tr>
            </thead>
            <tbody>
              {c.suspects.map((s, i) => (
                <tr key={s} className={s === c.murderer ? 'murderer' : ''}>
                  <td>{nameOf(content.suspects, s)}</td>
                  <td>{nameOf(house.rooms, c.solution.room[i])}</td>
                  <td>{nameOf(content.items, c.solution.item[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
