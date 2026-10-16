import { useEffect, useMemo, useState } from 'react';
import { content } from '../content/index.ts';
import { generateCase } from '../engine/generate.ts';
import { AccusePanel } from './AccusePanel.tsx';
import { CluesPanel } from './CluesPanel.tsx';
import { GridPanel } from './GridPanel.tsx';
import { MapPanel } from './MapPanel.tsx';
import { GameScreen } from './games/GameScreen.tsx';
import { reduce, type Action, type Progress } from './state.ts';
import type { GameKind } from '../engine/types.ts';
import { loadCurrentCase, loadProgress, saveCurrentCase, saveProgress } from './storage.ts';

type Tab = 'clues' | 'map' | 'grid' | 'accuse';
const TABS: { id: Tab; label: string }[] = [
  { id: 'clues', label: 'Clues' },
  { id: 'map', label: 'Map' },
  { id: 'grid', label: 'Grid' },
  { id: 'accuse', label: 'Accuse' },
];

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

export function Casebook() {
  const [caseNumber, setCaseNumber] = useState(loadCurrentCase);
  const c = useMemo(() => generateCase(content, caseNumber), [caseNumber]);
  const [progress, setProgress] = useState<Progress>(() => loadProgress(caseNumber));
  const [tab, setTab] = useState<Tab>('clues');
  const [playing, setPlaying] = useState<GameKind | null>(null);

  useEffect(() => saveProgress(caseNumber, progress), [caseNumber, progress]);
  useEffect(() => saveCurrentCase(caseNumber), [caseNumber]);

  const dispatch = (a: Action) => setProgress((p) => reduce(c, p, a));

  const openCase = (n: number) => {
    const next = Math.max(1, n);
    setCaseNumber(next);
    setProgress(loadProgress(next));
    setTab('clues');
    setPlaying(null);
    window.scrollTo(0, 0);
  };

  const select = (t: Tab) => {
    setTab(t);
    window.scrollTo(0, 0);
  };

  const game = playing ? c.games.find((g) => g.kind === playing) : undefined;
  if (game) {
    return (
      <div className="casebook">
        <GameScreen
          key={`${c.number}-${game.kind}`}
          c={c}
          spec={game}
          progress={progress}
          dispatch={dispatch}
          onBack={() => {
            setPlaying(null);
            setTab('clues');
            window.scrollTo(0, 0);
          }}
        />
      </div>
    );
  }

  return (
    <div className="casebook">
      <header className="case-header">
        <button className="step" aria-label="Previous case" disabled={caseNumber <= 1} onClick={() => openCase(caseNumber - 1)}>
          ‹
        </button>
        <div className="case-title">
          <h1>Case {c.number}</h1>
          <p>
            {DIFFICULTY_LABEL[c.difficulty]}, {c.suspects.length} suspects{progress.solved ? ', solved' : ''}
          </p>
        </div>
        <button className="step" aria-label="Next case" onClick={() => openCase(caseNumber + 1)}>
          ›
        </button>
      </header>

      <main>
        {tab === 'clues' && (
          <CluesPanel
            c={c}
            progress={progress}
            dispatch={dispatch}
            onPlay={(kind) => {
              setPlaying(kind);
              window.scrollTo(0, 0);
            }}
          />
        )}
        {tab === 'map' && <MapPanel c={c} progress={progress} dispatch={dispatch} />}
        {tab === 'grid' && <GridPanel c={c} progress={progress} dispatch={dispatch} />}
        {tab === 'accuse' && <AccusePanel c={c} progress={progress} dispatch={dispatch} onNextCase={() => openCase(caseNumber + 1)} />}
      </main>

      <nav className="tabbar" aria-label="Casebook">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => select(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
