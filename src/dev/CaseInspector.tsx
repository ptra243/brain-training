// Dev page for phases 1–2: step through generated cases, see the map, the
// hidden answer and the clue set, and confirm each case has one solution.
// The real casebook UI replaces this as the home screen in phase 3.

import { useMemo, useState } from 'react';
import { content } from '../content/index.ts';
import { cellLabel, roomAdjacency } from '../engine/house.ts';
import { caseNameWords } from '../content/caseNames.ts';
import { caseCode, caseFor, caseName, parseCase } from '../engine/caseRef.ts';
import { campaignDifficulty, generateCase } from '../engine/generate.ts';
import { PRESETS, type Length } from '../engine/settings.ts';
import { allCandidates, countSolutions } from '../engine/solver.ts';
import type { Difficulty } from '../engine/types.ts';
import { emptyProgress } from '../game/state.ts';
import { saveQuick, saveScreen } from '../game/storage.ts';

const ROOM_COLOURS = ['#e8d7c3', '#cfdcc8', '#d6d3e6', '#ecd0cf', '#cfe0e6', '#ece2bf'];
const nameOf = <T extends { id: string; name: string }>(list: readonly T[], id: string) =>
  list.find((x) => x.id === id)?.name ?? id;

export function CaseInspector() {
  const [number, setNumber] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty | 'campaign'>('campaign');
  const [length, setLength] = useState<Length>('normal');
  const [reveal, setReveal] = useState(false);
  // A case code ("K7QF2-MN") or name overrides the number: the exact case she was playing.
  const [codeText, setCodeText] = useState('');
  const ref = parseCase(codeText, caseNameWords);

  const c = useMemo(() => {
    if (ref) return caseFor(content, ref);
    const preset = difficulty === 'campaign' ? undefined : difficulty;
    if (length === 'normal') return generateCase(content, number, preset);
    return generateCase(content, number, { ...PRESETS[preset ?? campaignDifficulty(number)], length });
  }, [ref && caseCode(ref), number, difficulty, length]);

  const play = () => {
    if (!ref) return;
    saveQuick({ ref, progress: emptyProgress() });
    saveScreen('case');
    window.location.hash = '';
  };
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
        <h1>Case {c.code}</h1>
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
        <select value={length} onChange={(e) => setLength(e.target.value as Length)}>
          <option value="short">Short</option>
          <option value="normal">Normal</option>
          <option value="long">Long</option>
        </select>
      </div>

      <div className="controls">
        <input
          className="code"
          placeholder="Case code or name, e.g. K7QF2-MN"
          value={codeText}
          onChange={(e) => setCodeText(e.target.value)}
          aria-label="Case code"
        />
        <button onClick={play} disabled={!ref}>
          Play it
        </button>
      </div>
      {codeText && !ref && <p className="bad">Not a case code or name.</p>}
      {ref && <p className="muted">Quick start case {caseCode(ref)}, {caseName(ref, caseNameWords)}. Playing it replaces the case in progress.</p>}

      <section>
        <h2>{house.name}</h2>
        <div className="map" style={{ gridTemplateColumns: `1.5rem repeat(${house.cols}, minmax(0, 1fr))` }}>
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
          {[c.sceneClue, ...c.clues].map((cl, i) => (
            <li key={i} className={i === 0 ? 'scene' : ''}>
              {cl.wordle && (
                <span className="teaser">
                  {cl.wordle.teaser} <b>{cl.wordle.answer}</b>
                </span>
              )}
              {cl.text} <span className="tag">{cl.delivery}</span>
            </li>
          ))}
        </ol>
        <p className="teaser">
          Scene words:{' '}
          {c.games
            .filter((g) => g.scene)
            .map((g) => `${g.kind} ${g.scene!.answer}`)
            .join(' · ')}
        </p>
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
                  <td>{c.solution.item[i] ? nameOf(content.items, c.solution.item[i]!) : 'nothing'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
