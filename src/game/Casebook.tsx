import { useEffect, useState, type ReactNode } from 'react';
import { AccusePanel } from './AccusePanel.tsx';
import { ClueDrawer } from './ClueDrawer.tsx';
import { CluesPanel, type PuzzleGate } from './CluesPanel.tsx';
import { Dialog } from './Dialog.tsx';
import { EndBoardPanel } from './EndBoardPanel.tsx';
import { ExploreMap } from './ExploreMap.tsx';
import { atMidnight, clockLine, clockTime, gamesLeft } from './explore.ts';
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
/** Exploring a campaign round: the map comes first. */
const EXPLORE_ORDER: Tab[] = ['map', 'clues', 'grid', 'board', 'accuse'];

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
  const exploring = c.explore === true;
  // Midnight: no more walking or puzzles, and she must name someone. Only while the round can still end.
  const midnight = exploring && !readOnly && !progress.solved && atMidnight(c, progress);
  // An exploring round opens on the map, or on the Accuse tab if she comes back to it at midnight.
  const [tab, setTab] = useState<Tab>(exploring ? (midnight ? 'accuse' : 'map') : 'clues');
  const [playing, setPlaying] = useState<GameKind | null>(null);
  // Where she opened the game from, and whether it was already finished (then the clock doesn't move).
  const [opened, setOpened] = useState<{ tab: Tab; done: boolean }>({ tab: 'clues', done: false });
  // The new time, shown for a moment after a puzzle is finished.
  const [timeCard, setTimeCard] = useState(false);
  useEffect(() => {
    if (!timeCard) return;
    const id = window.setTimeout(() => setTimeCard(false), 1500);
    return () => window.clearTimeout(id);
  }, [timeCard]);
  const play = (kind: GameKind) => {
    setOpened({ tab, done: gameDone(progress, kind) });
    setPlaying(kind);
    window.scrollTo(0, 0);
  };
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
    setHintNote(gridHintText(helper, h, clues, sceneUnlocked(c, progress), c.guests));
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
            const done = gameDone(progress, game.kind);
            setFresh(done ? [...game.clues] : []);
            setPlaying(null);
            if (exploring && !readOnly) {
              const justFinished = done && !opened.done;
              setTimeCard(justFinished);
              // The clues she just earned are on the Clues tab; at midnight the Accuse tab opens, once.
              setTab(justFinished ? (atMidnight(c, progress) && !progress.solved ? 'accuse' : 'clues') : opened.tab);
            } else setTab('clues');
            window.scrollTo(0, 0);
          }}
        />
      </div>
    );
  }

  const drawer = tab === 'grid' || (tab === 'map' && !exploring);

  return (
    <div className={`casebook ${drawer ? (drawerOpen ? 'with-drawer open' : 'with-drawer') : ''}`}>
      <header className="case-header">
        <button className="step" aria-label="Home" onClick={onHome}>
          ‹
        </button>
        <div className="case-title">
          <h1>{title ?? `Case ${c.code}`}</h1>
          <p>{(exploring && !readOnly ? clockLine(c, progress) : subtitle) ?? `${DIFFICULTY_LABEL[c.difficulty]}, ${c.suspects.length} suspects${progress.solved ? ', solved' : ''}`}</p>
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
            readOnly={readOnly || midnight}
            fresh={fresh}
            onPlay={play}
          />
        )}
        {tab === 'map' && exploring && (
          <ExploreMap c={c} progress={progress} dispatch={dispatch} gate={readOnly ? undefined : gate} readOnly={readOnly} locked={midnight} onPlay={play} />
        )}
        {tab === 'map' && !exploring && (
          <MapPanel
            c={c}
            progress={progress}
            dispatch={dispatch}
            onAccused={() => select('accuse')}
            pawedSquare={hintNote ? progress.gridHints?.target : undefined}
            onQuestion={
              readOnly
                ? undefined
                : (kind) => {
                    // A campaign round limits puzzles: she picks them on the Clues tab.
                    if (gate && !gate.picked.includes(kind)) select('clues');
                    else play(kind);
                  }
            }
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
          {(exploring ? EXPLORE_ORDER.map((id) => TABS.find((t) => t.id === id)!) : TABS)
            .filter((t) => (c.sceneGiven ? true : endBoard ? t.id !== 'grid' : t.id !== 'board'))
            .map((t) => (
              <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => select(t.id)}>
                {t.label}
              </button>
            ))}
        </nav>
      </div>

      {timeCard && (
        <Dialog placement="center" labelId="time-title" onClose={() => setTimeCard(false)}>
          <div className="time-card">
            <h2 id="time-title">{clockTime(c, progress)}</h2>
            <p>{gamesLeft(c, progress) ? `${gamesLeft(c, progress)} game${gamesLeft(c, progress) === 1 ? '' : 's'} left` : "Time's up"}</p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
