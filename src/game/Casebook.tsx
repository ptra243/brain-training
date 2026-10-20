import { useState, type ReactNode } from 'react';
import { AccusePanel } from './AccusePanel.tsx';
import { ClueDrawer } from './ClueDrawer.tsx';
import { CluesPanel, type PuzzleGate } from './CluesPanel.tsx';
import { EndBoardPanel } from './EndBoardPanel.tsx';
import { GridPanel } from './GridPanel.tsx';
import { MapPanel } from './MapPanel.tsx';
import { GameScreen } from './games/GameScreen.tsx';
import { HintButton, HintNote } from './games/Hints.tsx';
import { afterHint, gridHint, markActions } from './gridHints.ts';
import { gridHintText } from './gridHintText.ts';
import { gameDone, reduce, sceneUnlocked, unlockedClueIds, visibleClues, type Action, type Progress, type Subject } from './state.ts';
import { cats } from '../content/index.ts';
import { DIFFICULTY_LABEL } from './labels.ts';
import type { Case, GameKind } from '../engine/types.ts';

type Tab = 'clues' | 'map' | 'grid' | 'board' | 'accuse';
const TABS: { id: Tab; label: string }[] = [
  { id: 'clues', label: 'Clues' },
  { id: 'map', label: 'Map' },
  { id: 'grid', label: 'Grid' },
  { id: 'board', label: 'Jigsaw' },
  { id: 'accuse', label: 'Accuse' },
];

interface Props {
  c: Case;
  progress: Progress;
  /** Her moves; the app saves them. */
  onProgress: (update: (p: Progress) => Progress) => void;
  onHome: () => void;
  /** A fresh case with the same difficulty and length. */
  onNewCase: () => void;
  /** Campaign rounds: their own heading, round tabs, the puzzle budget and accuse screen. */
  title?: string;
  subtitle?: string;
  banner?: ReactNode;
  gate?: PuzzleGate;
  accuse?: ReactNode;
  /** An earlier round: look, don't touch. */
  readOnly?: boolean;
  /** Final puzzle "Jigsaw" (Play cases always have the Jigsaw tab beside the Grid): a Jigsaw tab that fits her clues together before she accuses. It replaces the Grid tab. */
  endBoard?: boolean;
}

/** One case: clues, map, grid and accusation. Remount it (key) for another case. */
export function Casebook({ c, progress, onProgress, onHome, onNewCase, title, subtitle, banner, gate, accuse, readOnly, endBoard }: Props) {
  const [tab, setTab] = useState<Tab>('clues');
  const [playing, setPlaying] = useState<GameKind | null>(null);
  // Clues from the game she just finished, marked on the Clues tab.
  const [fresh, setFresh] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // A grid label she tapped: the drawer then shows only clues about it.
  const [focus, setFocus] = useState<Subject | null>(null);

  const dispatch = (a: Action) => {
    if (!readOnly) onProgress((p) => reduce(c, p, a));
  };

  // Hints on the map and grid come from the house cat.
  const helper = cats[c.number % cats.length];
  const [hintNote, setHintNote] = useState<string | null>(null);
  // Clues the last "why" hint pawed at, marked in the drawer.
  const [pawed, setPawed] = useState<string[]>([]);
  const askHint = () => {
    const clues = visibleClues(c, progress);
    const state = progress.gridHints ?? {};
    // Only fill a square in once every clue is found: until then, a puzzle can still help.
    const unlocked = unlockedClueIds(c, progress);
    const h = gridHint(c, progress, clues, state, c.clues.every((cl) => unlocked.has(cl.id)));
    setHintNote(gridHintText(helper, h, clues, sceneUnlocked(c, progress)));
    const pawing = h.kind === 'why' && h.reason.type === 'clues' ? h.reason.clues : [];
    setPawed(pawing);
    if (pawing.length) {
      setFocus(null);
      setDrawerOpen(true);
    }
    if (h.kind === 'fill') markActions(h.cell, h.value).forEach(dispatch);
    dispatch({ type: 'grid-hint', hints: afterHint(state, h) });
  };

  const select = (t: Tab) => {
    setTab(t);
    if (t !== 'clues') setFresh([]);
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
            setFresh(gameDone(progress, game.kind) ? [...game.clues] : []);
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
          <h1>{title ?? `Case ${c.code}`}</h1>
          <p>{subtitle ?? `${DIFFICULTY_LABEL[c.difficulty]}, ${c.suspects.length} suspects${progress.solved ? ', solved' : ''}`}</p>
        </div>
        {drawer && !readOnly ? <HintButton helper={helper} onAsk={askHint} /> : <span aria-hidden="true" />}
      </header>

      {banner}

      <main>
        {drawer && hintNote && (
          <div className="casebook-hint">
            <HintNote text={hintNote} onClose={() => setHintNote(null)} />
          </div>
        )}
        {tab === 'clues' && (
          <CluesPanel
            c={c}
            progress={progress}
            dispatch={dispatch}
            gate={gate}
            readOnly={readOnly}
            fresh={fresh}
            onPlay={(kind) => {
              setPlaying(kind);
              window.scrollTo(0, 0);
            }}
          />
        )}
        {tab === 'map' && (
          <MapPanel
            c={c}
            progress={progress}
            dispatch={dispatch}
            onAccused={() => select('accuse')}
            pawedSquare={hintNote ? progress.gridHints?.target : undefined}
          />
        )}
        {tab === 'grid' && (
          <GridPanel
            c={c}
            progress={progress}
            dispatch={dispatch}
            pawedSquare={hintNote ? progress.gridHints?.target : undefined}
            focus={focus}
            onFocus={(s) => {
              const same = focus?.kind === s.kind && focus.id === s.id;
              setFocus(same ? null : s);
              if (!same) setDrawerOpen(true);
            }}
          />
        )}
        {tab === 'board' && (
          <EndBoardPanel c={c} progress={progress} dispatch={dispatch} helper={helper} readOnly={readOnly} onAccuse={() => select('accuse')} />
        )}
        {tab === 'accuse' && (accuse ?? <AccusePanel c={c} progress={progress} dispatch={dispatch} onNextCase={onNewCase} />)}
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
            pawed={pawed}
          />
        )}
        <nav className="tabbar" aria-label="Casebook">
          {TABS.filter((t) => (c.sceneGiven ? true : endBoard ? t.id !== 'grid' : t.id !== 'board')).map((t) => (
            <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => select(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
