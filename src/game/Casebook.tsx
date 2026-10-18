import { useState } from 'react';
import { AccusePanel } from './AccusePanel.tsx';
import { ClueDrawer } from './ClueDrawer.tsx';
import { CluesPanel } from './CluesPanel.tsx';
import { GridPanel } from './GridPanel.tsx';
import { MapPanel } from './MapPanel.tsx';
import { GameScreen } from './games/GameScreen.tsx';
import { reduce, type Action, type Progress, type Subject } from './state.ts';
import type { Case, GameKind } from '../engine/types.ts';

type Tab = 'clues' | 'map' | 'grid' | 'accuse';
const TABS: { id: Tab; label: string }[] = [
  { id: 'clues', label: 'Clues' },
  { id: 'map', label: 'Map' },
  { id: 'grid', label: 'Grid' },
  { id: 'accuse', label: 'Accuse' },
];

export const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

interface Props {
  c: Case;
  progress: Progress;
  /** Her moves; the app saves them. */
  onProgress: (update: (p: Progress) => Progress) => void;
  onHome: () => void;
  /** A fresh case with the same difficulty and length. */
  onNewCase: () => void;
}

/** One case: clues, map, grid and accusation. Remount it (key) for another case. */
export function Casebook({ c, progress, onProgress, onHome, onNewCase }: Props) {
  const [tab, setTab] = useState<Tab>('clues');
  const [playing, setPlaying] = useState<GameKind | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // A grid label she tapped: the drawer then shows only clues about it.
  const [focus, setFocus] = useState<Subject | null>(null);

  const dispatch = (a: Action) => onProgress((p) => reduce(c, p, a));

  const select = (t: Tab) => {
    setTab(t);
    window.scrollTo(0, 0);
  };

  const game = playing ? c.games.find((g) => g.kind === playing) : undefined;
  if (game) {
    return (
      <div className="casebook">
        <GameScreen
          key={`${c.code}-${game.kind}`}
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

  const drawer = tab === 'map' || tab === 'grid';

  return (
    <div className={`casebook ${drawer ? (drawerOpen ? 'with-drawer open' : 'with-drawer') : ''}`}>
      <header className="case-header">
        <button className="step" aria-label="Home" onClick={onHome}>
          ‹
        </button>
        <div className="case-title">
          <h1>Case {c.code}</h1>
          <p>
            {DIFFICULTY_LABEL[c.difficulty]}, {c.suspects.length} suspects{progress.solved ? ', solved' : ''}
          </p>
        </div>
        <span aria-hidden="true" />
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
        {tab === 'map' && <MapPanel c={c} progress={progress} dispatch={dispatch} onAccused={() => select('accuse')} />}
        {tab === 'grid' && (
          <GridPanel
            c={c}
            progress={progress}
            dispatch={dispatch}
            focus={focus}
            onFocus={(s) => {
              const same = focus?.kind === s.kind && focus.id === s.id;
              setFocus(same ? null : s);
              if (!same) setDrawerOpen(true);
            }}
          />
        )}
        {tab === 'accuse' && <AccusePanel c={c} progress={progress} dispatch={dispatch} onNextCase={onNewCase} />}
      </main>

      <div className="dock">
        {drawer && (
          <ClueDrawer
            c={c}
            progress={progress}
            dispatch={dispatch}
            open={drawerOpen}
            onToggle={() => setDrawerOpen((o) => !o)}
            focus={tab === 'grid' ? focus : null}
            onClearFocus={() => setFocus(null)}
          />
        )}
        <nav className="tabbar" aria-label="Casebook">
          {TABS.map((t) => (
            <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => select(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
