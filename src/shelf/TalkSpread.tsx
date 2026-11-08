import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { playerPortrait, portraits } from '../content/portraits.ts';
import type { Case, GameKind } from '../engine/types.ts';
import { PortraitCard } from '../game/ExploreMap.tsx';
import { GAMES } from '../game/games/registry.tsx';
import { suspectInitials, suspectName, suspectColour } from '../game/names.ts';
import { hasPortrait } from '../game/Portrait.tsx';
import type { Action, Progress } from '../game/state.ts';
import { TalkSection } from '../game/TalkSection.tsx';
import { moodTint, setsFor } from '../game/talk.ts';
import { personGame } from './campaignBook.ts';
import type { ClueRow } from './findAClue.ts';
import { labelAngle, labelName } from './labels.ts';
import { PuzzleLabel } from './PuzzleLabel.tsx';
import styles from './TalkSpread.module.css';
import { useBackLayer } from './useBackLayer.ts';

type Tab = 'talk' | 'minigame' | 'clues';
const TABS: readonly (readonly [Tab, string])[] = [
  ['talk', 'Talk'],
  ['minigame', 'Minigame'],
  ['clues', 'Clues'],
];

interface Props {
  c: Case;
  progress: Progress;
  dispatch: (a: Action) => void;
  person: string;
  picked: readonly GameKind[];
  left: number;
  /** The page-3 row of the guest's questioning game, for its label. */
  gameRow: ClueRow | undefined;
  caseRef: string;
  onClose: () => void;
  /** Close the spread and open this puzzle through the room page. */
  onPlay: (kind: GameKind) => void;
  /** Close the spread and open this guest's page in the notebook. */
  onClues: () => void;
}

/**
 * The face-to-face talk, drawn on the card table: her portrait and theirs as two ivory cards on green
 * baize, then Talk, Minigame and Clues. Full screen over the book (rendered on `document.body` to escape
 * the book's transform), a Back layer, Escape and Close both close it.
 */
export function TalkSpread({ c, progress, dispatch, person, picked, left, gameRow, caseRef, onClose, onPlay, onClues }: Props) {
  const [tab, setTab] = useState<Tab>('talk');
  const closeRef = useRef<HTMLButtonElement>(null);
  const name = suspectName(person, c.guests);
  const tint = moodTint(setsFor(c)[person], progress.talk?.[person] ?? 0, setsFor(c)[person].greetings);
  const game = personGame(c, progress, person, picked, left);

  useBackLayer(true, onClose);
  const close = useEffectEvent(() => onClose());
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return createPortal(
    <div className={styles.table} role="dialog" aria-modal="true" aria-labelledby="talk-spread-title" data-testid="talk-spread">
      <div className={styles.column}>
        <header className={styles.head}>
          <h2 id="talk-spread-title" className={styles.title}>
            <span className="sr-only">Talking to </span>
            {name}
          </h2>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className={styles.cards}>
          <PortraitCard parts={playerPortrait} tint="none" caption="You" />
          <PortraitCard
            parts={hasPortrait(person) ? portraits[person] : undefined}
            tint={tint}
            caption={name}
            initials={suspectInitials(person, c.guests)}
            colour={suspectColour(person)}
          />
        </div>
        <div className={styles.tabs} role="tablist" aria-label="With them">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className={styles.pane} role="tabpanel">
          {tab === 'talk' && <TalkSection c={c} progress={progress} dispatch={dispatch} suspect={person} idleLine="Nothing more to say for now." />}
          {tab === 'minigame' && (
            <div className={styles.note}>
              {game.state === 'none' && <p>Nothing to play with them.</p>}
              {game.state === 'done' && <p>{game.solved ? 'Solved.' : 'Solved for you.'}</p>}
              {game.state === 'used-up' && <p>Not tonight: you have used your picks.</p>}
              {game.state === 'open' && (
                <>
                  <div className={styles.game}>
                    {gameRow ? (
                      <PuzzleLabel game={game.kind} level={gameRow.level} page={gameRow.page} angle={labelAngle(caseRef, game.kind)} />
                    ) : (
                      <p className={styles.gameName}>{labelName(GAMES[game.kind].label.kind, GAMES[game.kind].name)}</p>
                    )}
                  </div>
                  <p>Unlocks {game.clues} clue{game.clues === 1 ? '' : 's'}.</p>
                  <button type="button" className={styles.primary} onClick={() => onPlay(game.kind)}>
                    {game.continuing ? 'Continue' : 'Play'}
                  </button>
                </>
              )}
            </div>
          )}
          {tab === 'clues' && (
            <div className={styles.note}>
              <p>What you&apos;ve found about them is in your notebook.</p>
              <button type="button" className={styles.primary} onClick={onClues}>
                Open their page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
