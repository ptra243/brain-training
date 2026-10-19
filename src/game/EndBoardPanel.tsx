import { useMemo } from 'react';
import { content } from '../content/index.ts';
import { UNKNOWN } from '../engine/boardTypes.ts';
import { endBoard } from '../engine/caseBoard.ts';
import { caseContext, caseSpace } from '../engine/caseFacts.ts';
import { possibleKillers } from '../engine/search.ts';
import type { Case } from '../engine/types.ts';
import { CaseBoard, boardInitial, type BoardSave } from './board/CaseBoard.tsx';
import { GAMES } from './games/registry.tsx';
import { roomName, suspectName } from './names.ts';
import { gameDone, sceneUnlocked, unlockedClueIds, type Action, type Progress } from './state.ts';

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  helper: string;
  readOnly?: boolean;
  onAccuse: () => void;
}

const lower = (name: string) => name.replace(/^The /, 'the ');
const listAnd = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * The end board (a starting option): the clues she has found as pieces, a
 * grey piece for each puzzle not played, and the body once she knows the
 * scene. Built again whenever she finds a clue; her moves are kept per board.
 */
export function EndBoardPanel({ c, progress, dispatch, helper, readOnly, onAccuse }: Props) {
  const unlocked = unlockedClueIds(c, progress);
  const scene = sceneUnlocked(c, progress);
  const unplayed = c.games.filter((g) => !g.unlocksScene && !gameDone(progress, g.kind));
  const left = unplayed.length;
  // Grey piece n is a hunch from puzzle n.
  const hunches = unplayed.slice(0, 3).map((g) => `the ${GAMES[g.kind].name.toLowerCase()}`);
  const key = `${[...unlocked].sort().join(',')}|${scene ? 'scene' : ''}|${left}`;
  // Built once per set of clues, not per move.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const board = useMemo(() => endBoard(content, c, unlocked, scene, left), [c, key]);
  if (!board) return <p className="muted">There's no board for these clues. The map and grid still work.</p>;

  const save = progress.endBoard?.key === key ? (progress.endBoard.save as BoardSave) : boardInitial();
  const placedBy = (who: string) => board.pieces.find((p) => p.kind === 'guest' && p.who === who)?.id;
  const placed = c.suspects.filter((s) => placedBy(s) && board.truth[placedBy(s)!].section !== UNKNOWN);
  const open = c.suspects.filter((s) => !placed.includes(s));
  const found = c.clues.filter((cl) => unlocked.has(cl.id)).map((cl) => cl.fact);
  const killers = scene ? possibleKillers(caseSpace(c), found, caseContext(content.house, c), c.sceneRoom) : [];

  const summary = (
    <div className="end-board-summary">
      {placed.length > 0 && (
        <p>
          <b>Placed by your clues:</b>{' '}
          {listAnd(placed.map((s) => `${lower(suspectName(s))} in the ${roomName(board.truth[placedBy(s)!].section)}`))}.
        </p>
      )}
      {open.length > 0 && (
        <p>
          <b>No one can say where they were:</b> {listAnd(open.map((s) => lower(suspectName(s))))}.
        </p>
      )}
      {scene ? (
        <p>
          <b>Could be the killer:</b> {killers.length ? listAnd(killers.map((s) => lower(suspectName(s)))) : 'no one, by these clues'}.
        </p>
      ) : (
        <p className="muted">Play a word game to find where the body was, and the board shows who could be the killer.</p>
      )}
      {!readOnly && (
        <button className="primary" onClick={onAccuse}>
          Accuse
        </button>
      )}
    </div>
  );

  return (
    <CaseBoard
      key={key}
      board={board}
      level={c.levels.logic}
      c={c}
      save={save}
      onChange={(s) => dispatch({ type: 'end-board', key, save: s })}
      finished={!!readOnly}
      helper={helper}
      hunches={hunches}
      intro={
        <p className="muted">
          Your clues so far, as pieces. Fit them all in: guests the clues place go in their room, everyone else in Unknown.
          {left > 0 && ' Grey pieces are hunches: clues from puzzles you haven’t played yet.'}
        </p>
      }
      doneContent={summary}
    />
  );
}
