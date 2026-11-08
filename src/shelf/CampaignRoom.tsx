import { useEffect, useMemo, useRef, useState } from 'react';
import { houseDetails } from '../content/index.ts';
import { ROUNDS } from '../engine/campaign.ts';
import type { GameKind } from '../engine/types.ts';
import { atMidnight, clockLine, roomContents, whereAmI } from '../game/explore.ts';
import { DIFFICULTY_LABEL } from '../game/labels.ts';
import { GAMES } from '../game/games/registry.tsx';
import { roomName, suspectName } from '../game/names.ts';
import type { Subject } from '../game/state.ts';
import { accusationsLeft, candleLabel, chapterTitle, guestLine, personGame, roomLine, roomRowAria, roomRows, walkTargets, type RoomRow } from './campaignBook.ts';
import { clueRows } from './findAClue.ts';
import { TalkSpread } from './TalkSpread.tsx';
import styles from './CampaignRoom.module.css';
import rowStyles from './FindAClue.module.css';
import { labelAngle, labelName } from './labels.ts';
import { PuzzleLabel } from './PuzzleLabel.tsx';
import { PuzzlePage } from './PuzzlePage.tsx';
import type { CampaignBook } from './useCampaignBook.ts';

/** One drawn candle: lit with a flame, or blown out with a thin curl of smoke. */
function Candle({ lit }: { lit: boolean }) {
  return (
    <svg width="16" height="38" viewBox="0 0 16 38" aria-hidden="true" className={styles.candle}>
      <rect x="4" y="16" width="8" height="20" rx="1.5" fill="#f3ead3" stroke="#6b5a3a" strokeWidth="1" />
      <path d="M4.5 22h7" stroke="#d9c9a0" strokeWidth="1" />
      <path d="M8 16v-3" stroke="#2a2118" strokeWidth="1.2" strokeLinecap="round" />
      {lit ? (
        <path d="M8 3c2.6 3 3.4 5.2 3.4 6.8A3.4 3.4 0 0 1 8 13.2a3.4 3.4 0 0 1-3.4-3.4C4.6 8 6.3 6.6 8 3z" fill="#e8b23c" stroke="#b9791f" strokeWidth="0.8" />
      ) : (
        <path d="M8 12c-2-1.6 2-3 0-5s1.8-2.6 1-4.6" fill="none" stroke="#8d8676" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
      )}
    </svg>
  );
}

function Row({ r, caseRef, onOpen }: { r: RoomRow; caseRef: string; onOpen: (kind: GameKind) => void }) {
  const entry = GAMES[r.kind];
  const name = labelName(entry.label.kind, entry.name);
  return (
    <li>
      <button
        type="button"
        className={`${rowStyles.row} ${r.row.done ? rowStyles.done : ''} ${r.enabled ? '' : rowStyles.locked}`}
        disabled={!r.enabled}
        aria-label={roomRowAria(r, name, r.row.level ? DIFFICULTY_LABEL[r.row.level] : undefined)}
        onClick={() => onOpen(r.kind)}
      >
        <PuzzleLabel game={r.kind} level={r.row.level} page={r.row.page} angle={labelAngle(caseRef, r.kind)} sticker={r.row.status} hints={r.row.hints} />
        <span className={rowStyles.story}>
          {r.label}
          <span className={r.row.done ? rowStyles.found : styles.until}>{r.line}</span>
        </span>
      </button>
    </li>
  );
}

/**
 * The campaign book's Room page: the clock and candles, where she is and who is there, the objects as
 * page-3 rows (opening one spends a pick, then its puzzle page), and the other rooms to walk to.
 * Her moves go through the campaign book, which saves them. Tapping a guest opens the face-to-face talk spread.
 */
export function CampaignRoom({ book, onPuzzleOpen, onSubject, initialTalk }: { book: CampaignBook | null | false; onPuzzleOpen?: (open: boolean) => void; onSubject?: (s: Subject) => void; initialTalk?: string }) {
  const [picked, setPicked] = useState<GameKind | null>(null);
  const [talking, setTalking] = useState<string | null>(initialTalk ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The notebook strip stays away while a puzzle page or the talk spread is up.
  const puzzleOpen = picked !== null || talking !== null;
  useEffect(() => {
    onPuzzleOpen?.(puzzleOpen);
  }, [puzzleOpen, onPuzzleOpen]);
  const c = book ? book.c : null;
  const contents = useMemo(() => (c ? roomContents(houseDetails, c) : null), [c]);

  if (book === null) return <p className={styles.lede}>Laying out the cards…</p>;
  if (book === false || !contents) return <p className={styles.lede}>That campaign wouldn&apos;t open. Go back and try again.</p>;
  const { progress, dispatch } = book;
  const here = whereAmI(book.c, progress);
  const mine = contents[here];
  const midnight = atMidnight(book.c, progress);
  const ref = `${book.save.ref.code}-${book.round}`;
  const rows = roomRows(book.c, progress, ref, mine.objects, book.picked, book.left);
  const left = accusationsLeft(book.save.victims.length);
  const open = (kind: GameKind) => {
    if (!book.picked.includes(kind) && !rows.find((r) => r.kind === kind)?.row.done) book.onPick(kind);
    setPicked(kind);
  };
  // A guest's questioning game is not one of the room's objects, so its row comes from the whole case.
  const allRows = clueRows(book.c, progress, ref);
  const row = picked ? (rows.find((r) => r.kind === picked)?.row ?? allRows.find((r) => r.kind === picked)) : undefined;
  const spec = picked ? book.c.games.find((g) => g.kind === picked) : undefined;
  return (
    <>
      <div className={styles.scroll} ref={scrollRef}>
        <header className={styles.head}>
          <div>
            <p className={styles.clock}>{clockLine(book.c, progress)}</p>
            <p className={styles.chapter}>{chapterTitle(book.round)}</p>
          </div>
          <div className={styles.candles} role="img" aria-label={candleLabel(left)}>
            {Array.from({ length: ROUNDS }, (_, i) => (
              <Candle key={i} lit={i < left} />
            ))}
          </div>
        </header>

        <h2 className={styles.here}>{roomLine(roomName(here))}</h2>
        {mine.looks.map((line) => (
          <p key={line} className={styles.look}>
            {line}
          </p>
        ))}
        {mine.guests.length > 0 ? (
          <>
            <p className={styles.guests}>
              <span>Here with you:</span>
            </p>
            <ul className={styles.people}>
              {mine.guests.map((s) => (
                <li key={s}>
                  <button type="button" disabled={midnight} onClick={() => setTalking(s)}>
                    <span className={styles.who}>{suspectName(s, book.c.guests)}</span>
                    <span className={styles.talk}>{guestLine(personGame(book.c, progress, s, book.picked, book.left))}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {rows.length > 0 ? (
          <>
            <h3 className={styles.sub}>Things to try</h3>
            <ul className={styles.rows}>
              {rows.map((r) => (
                <Row key={r.kind} r={r} caseRef={ref} onOpen={open} />
              ))}
            </ul>
          </>
        ) : null}

        <h3 className={styles.sub}>Walk to</h3>
        <ul className={styles.walk}>
          {walkTargets(book.c, here).map((room) => (
            <li key={room}>
              <button type="button" disabled={midnight} onClick={() => dispatch({ type: 'move', room })}>
                {roomName(room)}
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.note}>{midnight ? "It's midnight. There's no time left to look around." : 'No time taken.'}</p>
      </div>
      {talking && !midnight ? (
        <TalkSpread
          c={book.c}
          progress={progress}
          dispatch={dispatch}
          person={talking}
          picked={book.picked}
          left={book.left}
          gameRow={(() => {
            const q = personGame(book.c, progress, talking, book.picked, book.left);
            return q.state === 'open' ? allRows.find((r) => r.kind === q.kind) : undefined;
          })()}
          caseRef={ref}
          onClose={() => setTalking(null)}
          onPlay={(kind) => {
            setTalking(null);
            open(kind);
          }}
          onClues={() => {
            const id = talking;
            setTalking(null);
            onSubject?.({ kind: 'suspect', id });
          }}
        />
      ) : null}
      {picked && row && spec ? (
        <PuzzlePage
          c={book.c}
          spec={spec}
          progress={progress}
          dispatch={dispatch}
          page={row.page}
          level={row.level}
          turn
          turnSource={() => scrollRef.current?.closest<HTMLElement>('[data-section]') ?? null}
          onClose={() => setPicked(null)}
          backTo="the room"
        />
      ) : null}
    </>
  );
}
