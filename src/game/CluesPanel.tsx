import { useState } from 'react';
import { isInterrogation } from '../engine/gameKinds.ts';
import { midSentence } from '../engine/text.ts';
import type { Case, GameKind } from '../engine/types.ts';
import { ClueCard } from './ClueCard.tsx';
import { Dialog } from './Dialog.tsx';
import { clockAfterNext, minutesPerGame } from './explore.ts';
import { GetClue } from './GetClue.tsx';
import { GAMES } from './games/registry.tsx';
import { suspectName, victimLine } from './names.ts';
import { SCENE_TEASER, finaleOpen, gameDone, sceneGameInPlay, sceneText, unlockedClueIds, visibleClues, type Action, type Progress } from './state.ts';

/** A campaign round's limit on puzzles (the word game is always free). */
export interface PuzzleGate {
  budget: number;
  left: number;
  picked: readonly GameKind[];
  onPick: (kind: GameKind) => void;
}

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  onPlay: (kind: GameKind) => void;
  gate?: PuzzleGate;
  /** An earlier campaign round: puzzles can't be opened. */
  readOnly?: boolean;
  /** Clues from the game she just finished, marked until she leaves the tab. */
  fresh?: readonly string[];
}

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];

export function CluesPanel({ c, progress, dispatch, onPlay, gate, readOnly, fresh = [] }: Props) {
  const unlocked = unlockedClueIds(c, progress);
  const visible = visibleClues(c, progress);
  // Sudoku statements she hasn't pinned to the map yet: shown with blanks.
  const sudokuDone = gameDone(progress, 'sudoku');
  const waiting = sudokuDone ? [] : c.clues.filter((clue) => clue.location && !unlocked.has(clue.id));
  const hidden = c.clues.filter((clue) => !unlocked.has(clue.id)).length - waiting.length;
  const scene = sceneText(c, progress);
  const sceneKind = sceneGameInPlay(c, progress);
  const sceneGames = c.games.filter((g) => g.unlocksScene);
  const [choosing, setChoosing] = useState(false);
  const [confirming, setConfirming] = useState<GameKind | null>(null);
  const puzzles = c.games.filter((g) => !g.unlocksScene);
  const open = (kind: GameKind) => {
    if (gate && !gate.picked.includes(kind) && !c.games.find((g) => g.kind === kind)?.unlocksScene) setConfirming(kind);
    else onPlay(kind);
  };
  const statusOf = (kind: GameKind) => progress.games[kind]?.status;

  const play = c.sceneGiven === true;
  // Exploring a campaign round: the scene is known, so there are no scene word games to offer.
  const exploring = c.explore === true;

  return (
    <section className="panel">
      {play && <GetClue c={c} progress={progress} readOnly={readOnly} onPlay={onPlay} />}
      {!play && (
      <article className="card puzzles">
        {!c.campaign && <p className="case-victim">{victimLine(c)}</p>}
        <h2>Tonight's puzzles</h2>
        {gate && gate.budget < puzzles.length && (
          <p className="muted small budget-note">
            You can play {NUMBER_WORDS[gate.budget]} of these {NUMBER_WORDS[puzzles.length]} puzzles{exploring ? '.' : ', besides the word game.'}{' '}
            {gate.left ? `${gate.left} left to choose.` : 'Those are your picks for tonight.'}
          </p>
        )}
        <ul>
          {!exploring && (
          <li>
            <button
              className={`puzzle-row ${scene ? 'done' : ''}`}
              disabled={readOnly}
              onClick={() => (scene && sceneKind ? onPlay(sceneKind) : setChoosing(true))}
            >
              <span className="puzzle-name">{scene && sceneKind ? GAMES[sceneKind].name : 'Word game'}</span>
              <span className="puzzle-reward">
                {scene ? (statusOf(sceneKind!) === 'won' ? 'Solved' : 'Solved for you') : 'Pick one: shows where the body was found'}
              </span>
              <span className="puzzle-action" aria-hidden="true">
                {scene ? '✓' : sceneKind ? 'Continue' : 'Choose'}
              </span>
            </button>
          </li>
          )}
          {puzzles.map((g) => {
            const status = progress.games[g.kind]?.status;
            const done = status === 'won' || status === 'revealed';
            const usedUp = gate !== undefined && !gate.picked.includes(g.kind) && gate.left === 0;
            const locked = (g.kind === 'finale' && !finaleOpen(c, progress)) || usedUp;
            const who = isInterrogation(g) ? ` ${midSentence(suspectName(g.interrogation.suspect, c.guests))}` : '';
            const reward = usedUp
              ? 'Not tonight: you have used your picks'
              : locked
                ? 'Opens when the other puzzles are done'
                : `${who ? `Question${who}. ` : ''}Unlocks ${g.clues.length} clue${g.clues.length === 1 ? '' : 's'}`;
            return (
              <li key={g.kind}>
                <button
                  className={`puzzle-row ${done ? 'done' : ''} ${locked ? 'locked' : ''}`}
                  disabled={locked || readOnly}
                  onClick={() => open(g.kind)}
                >
                  <span className="puzzle-name">{GAMES[g.kind].name}</span>
                  <span className="puzzle-reward">{done ? (status === 'won' ? 'Solved' : 'Solved for you') : reward}</span>
                  <span className="puzzle-action" aria-hidden="true">
                    {done ? '✓' : usedUp ? '–' : locked ? 'Later' : status === 'playing' ? 'Continue' : 'Play'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </article>
      )}

      <article className="card scene-card">
        <h2>The scene</h2>
        {scene ? (
          <p>{scene}</p>
        ) : (
          <>
            <p>{SCENE_TEASER}</p>
            <p className="muted small">Solve any one word game to fill in the blank.</p>
          </>
        )}
      </article>

      {choosing && !exploring && (
        <Dialog labelId="choose-title" onClose={() => setChoosing(false)}>
          <h2 id="choose-title">Pick a word game</h2>
          <p className="dialog-text">Any one of them shows where the body was found.</p>
          <ul className="scene-choices">
            {sceneGames.map((g) => {
              const status = statusOf(g.kind);
              return (
                <li key={g.kind}>
                  <button
                    className="puzzle-row"
                    onClick={() => {
                      setChoosing(false);
                      onPlay(g.kind);
                    }}
                  >
                    <span className="puzzle-name">{GAMES[g.kind].name}</span>
                    <span className="puzzle-reward">{GAMES[g.kind].blurb}</span>
                    <span className="puzzle-action" aria-hidden="true">
                      {status === 'playing' ? 'Continue' : 'Play'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog>
      )}

      {confirming && gate && (
        <Dialog placement="center" labelId="pick-title" onClose={() => setConfirming(null)}>
          <h2 id="pick-title">Play the {GAMES[confirming].name.toLowerCase()}?</h2>
          <p className="dialog-text">
            {exploring
              ? `This takes ${minutesPerGame(c)} minutes: the clock moves to ${clockAfterNext(c, progress)} when you finish it.`
              : `It uses one of tonight's picks: ${gate.left} left.`}{' '}
            {exploring ? '' : gate.budget > 1 && puzzles.some((g) => g.clues.length < 3)
              ? `Any ${NUMBER_WORDS[gate.budget]} of them are enough to narrow it down.`
              : "Any one puzzle's clues are enough to narrow it down."}
          </p>
          <div className="dialog-actions">
            <button data-autofocus className="secondary" onClick={() => setConfirming(null)}>
              Not yet
            </button>
            <button
              className="primary"
              onClick={() => {
                gate.onPick(confirming);
                setConfirming(null);
                onPlay(confirming);
              }}
            >
              Play it
            </button>
          </div>
        </Dialog>
      )}

      {visible.length > 0 && <p className="hint">Every statement here is true. Tap one to cross it off once you've used it.</p>}
      <ul className="clue-list">
        {visible.map((clue) => (
          <li key={clue.id}>
            <ClueCard
              clue={clue}
              guests={c.guests}
              used={progress.used.includes(clue.id)}
              fresh={fresh.includes(clue.id)}
              onToggle={() => dispatch({ type: 'toggle-used', clue: clue.id })}
            />
          </li>
        ))}
      </ul>
      {waiting.length > 0 && (
        <>
          <p className="hint">Half-heard. Play the sudoku to uncover the coordinates of each blank room.</p>
          <ul className="clue-list">
            {waiting.map((clue) => (
              <li key={clue.id}>
                <ClueCard clue={clue} guests={c.guests} blank />
              </li>
            ))}
          </ul>
        </>
      )}
      {hidden > 0 && !play && (
        <p className="locked-note">
          {hidden} more clue{hidden === 1 ? ' is' : 's are'} hidden in the puzzles.
        </p>
      )}
    </section>
  );
}
