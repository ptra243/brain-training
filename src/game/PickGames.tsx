import { useMemo, useState } from 'react';
import { PICK_MIN, PICK_ORDER, codeFor, pickedInOrder, playLevels, type PickedGame } from '../engine/caseRef.ts';
import { gameLevel } from '../engine/settings.ts';
import { DIFFICULTY_LABEL } from './Casebook.tsx';
import { GAMES } from './games/registry.tsx';
import { loadPicks, savePicks } from './storage.ts';

interface Props {
  /** Whole numbers for new codes (the browser's crypto; the engine stays seeded). */
  random: () => number;
  onHome: () => void;
  /** Build and open the case. Throws if the mix won't build. */
  onStart: (code: string, games: PickedGame[]) => void;
}

/** Choose which games are in a Quick play case, seeing the difficulty each one rolled first. */
export function PickGames({ random, onHome, onStart }: Props) {
  const [code, setCode] = useState(() => codeFor(random()));
  const [ticked, setTicked] = useState<PickedGame[]>(() => loadPicks());
  const [failed, setFailed] = useState(false);
  const levels = useMemo(() => playLevels(code), [code]);
  const enough = ticked.length >= PICK_MIN;

  const toggle = (g: PickedGame) => {
    setFailed(false);
    setTicked((t) => (t.includes(g) ? t.filter((x) => x !== g) : pickedInOrder([...t, g])));
  };
  const rollAgain = () => {
    setFailed(false);
    setCode(codeFor(random()));
  };
  const start = () => {
    const games = pickedInOrder(ticked);
    savePicks(games);
    try {
      onStart(code, games);
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="casebook">
      <header className="case-header">
        <button className="step" aria-label="Home" onClick={onHome}>
          ‹
        </button>
        <div className="case-title">
          <h1>Choose games</h1>
        </div>
        <span aria-hidden="true" />
      </header>
      <main>
        <article className="card">
          <p className="muted pick-lead">Tick at least {PICK_MIN} games. Some cases need a few more, and those are added for you.</p>
          <ul className="pick-list">
            {PICK_ORDER.map((g) => {
              const level = gameLevel(levels, g);
              const on = ticked.includes(g);
              return (
                <li key={g}>
                  <button className="pick-row" aria-pressed={on} onClick={() => toggle(g)}>
                    <span className="pick-box" aria-hidden="true">
                      {on ? '✓' : ''}
                    </span>
                    <span className="pick-name">{GAMES[g].name}</span>
                    {level && <span className={`pick-level ${level}`}>{DIFFICULTY_LABEL[level]}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="muted pick-case">
            Logic {DIFFICULTY_LABEL[levels.logic].toLowerCase()} · {levels.suspects} guests
          </p>
          <button className="secondary" onClick={rollAgain}>
            Roll again
          </button>
          {failed && <p className="pick-error">That mix wouldn't come together. Roll again, or change the games.</p>}
          <button className="primary pick-start" disabled={!enough} onClick={start}>
            {enough ? 'Start' : `Pick ${PICK_MIN - ticked.length} more`}
          </button>
        </article>
      </main>
    </div>
  );
}
