import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { cats } from '../content/index.ts';
import { playerPortrait } from '../content/portraits.ts';
import type { Case, Clue } from '../engine/types.ts';
import { ClueCard } from '../game/ClueCard.tsx';
import { PortraitCard } from '../game/ExploreMap.tsx';
import { GridPanel } from '../game/GridPanel.tsx';
import { HintButton, HintNote, Paw } from '../game/games/Hints.tsx';
import { afterHint, gridHint, markActions } from '../game/gridHints.ts';
import { gridHintText } from '../game/gridHintText.ts';
import { faceClass, itemName, roomName, suspectColour, suspectName } from '../game/names.ts';
import { SCENE_TEASER, sceneText, sceneUnlocked, unlockedClueIds, visibleClues, type Progress, type Subject } from '../game/state.ts';
import { SuspectCounterFace } from '../game/SuspectCounterFace.tsx';
import { TalkSection } from '../game/TalkSection.tsx';
import { youLines } from '../game/youSheet.ts';
import styles from './Notebook.module.css';
import { NOTEBOOK_TABS, peekLine, placementLine, subjectClues, subjectTitle, type NotebookTab } from './notebook.ts';
import { saveNotebookTab, loadNotebookTab } from './shelfStore.ts';
import type { QuickBook, SampleCase } from './useQuickBook.ts';

/** A page on top of a tab: a guest, a weapon or a room, with the tab to go back to. */
interface Page {
  subject: Subject;
  from: NotebookTab;
}

const SWIPE = 28;

/** Pointer handlers that call `onSwipe` when a finger moves up or down far enough. */
function swipe(dir: 'up' | 'down', onSwipe: () => void) {
  let y0: number | null = null;
  return {
    onPointerDown: (e: ReactPointerEvent) => {
      y0 = e.clientY;
    },
    onPointerUp: (e: ReactPointerEvent) => {
      if (y0 === null) return;
      const dy = e.clientY - y0;
      y0 = null;
      if (dir === 'up' ? dy < -SWIPE : dy > SWIPE) onSwipe();
    },
    onPointerCancel: () => {
      y0 = null;
    },
  };
}

function Counter({ id, guests }: { id: string; guests: readonly string[] }) {
  return (
    <span className={`counter static${faceClass(id)}`} style={{ '--counter': suspectColour(id) } as CSSProperties} aria-hidden="true">
      <SuspectCounterFace id={id} guests={guests} />
    </span>
  );
}

function Chip({ item }: { item: string }) {
  return (
    <span className="weapon static" aria-hidden="true">
      {itemName(item)}
    </span>
  );
}

interface ListProps {
  c: Case;
  progress: Progress;
  dispatch: QuickBook['dispatch'];
  clues: readonly Clue[];
  pawed?: readonly string[];
}

/** Clue cards she can tick as used; the ones the cat pawed at are marked. */
function ClueList({ c, progress, dispatch, clues, pawed = [] }: ListProps) {
  return (
    <ul className={styles.clues}>
      {clues.map((clue) => (
        <li key={clue.id} className={pawed.includes(clue.id) ? styles.pawed : undefined}>
          {pawed.includes(clue.id) ? <Paw /> : null}
          <ClueCard clue={clue} guests={c.guests} compact used={progress.used.includes(clue.id)} onToggle={() => dispatch({ type: 'toggle-used', clue: clue.id })} />
        </li>
      ))}
    </ul>
  );
}

function CluesTab({ c, progress, dispatch }: Omit<ListProps, 'clues'>) {
  const clues = visibleClues(c, progress);
  return (
    <>
      <p className={styles.scene}>{sceneText(c, progress) ?? SCENE_TEASER}</p>
      {clues.length ? <ClueList c={c} progress={progress} dispatch={dispatch} clues={clues} /> : <p className={styles.note}>Play a puzzle from page 3 to find some.</p>}
    </>
  );
}

function YouTab({ c, progress }: { c: Case; progress: Progress }) {
  return (
    <>
      <h2 className={styles.title}>You</h2>
      <div className={styles.you}>
        <PortraitCard parts={playerPortrait} tint="none" caption="You" />
      </div>
      <ul className={styles.lines}>
        {youLines(c, progress).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </>
  );
}

function GuestsTab({ c, onPick }: { c: Case; onPick: (s: Subject) => void }) {
  return (
    <>
      <ul className={styles.rows}>
        {c.suspects.map((s) => (
          <li key={s}>
            <button type="button" className={styles.row} onClick={() => onPick({ kind: 'suspect', id: s })}>
              <Counter id={s} guests={c.guests} />
              <span>{suspectName(s, c.guests)}</span>
            </button>
          </li>
        ))}
      </ul>
      <h2 className={styles.heading}>Weapons</h2>
      <ul className={styles.rows}>
        {c.items.map((item) => (
          <li key={item}>
            <button type="button" className={styles.row} onClick={() => onPick({ kind: 'item', id: item })}>
              <Chip item={item} />
              <span>The {itemName(item)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function GridTab({ book, onPick }: { book: QuickBook; onPick: (s: Subject) => void }) {
  const { c, progress, dispatch } = book;
  // Hints on the grid come from the house cat, as in the Casebook.
  const helper = cats[c.number % cats.length];
  const [hintNote, setHintNote] = useState<string | null>(null);
  const [pawed, setPawed] = useState<string[]>([]);
  const askHint = () => {
    const clues = visibleClues(c, progress);
    const state = progress.gridHints ?? {};
    // Only fill a square in once every clue is found: until then, a puzzle can still help.
    const unlocked = unlockedClueIds(c, progress);
    const h = gridHint(c, progress, clues, state, c.clues.every((cl) => unlocked.has(cl.id)));
    setHintNote(gridHintText(helper, h, clues, sceneUnlocked(c, progress), c.guests));
    setPawed(h.kind === 'why' && h.reason.type === 'clues' ? h.reason.clues : []);
    if (h.kind === 'fill') markActions(h.cell, h.value).forEach(dispatch);
    dispatch({ type: 'grid-hint', hints: afterHint(state, h) });
  };
  const pawedClues = visibleClues(c, progress).filter((clue) => pawed.includes(clue.id));
  return (
    <>
      <div className={styles.hintBar}>
        <HintButton helper={helper} onAsk={askHint} />
      </div>
      {hintNote ? (
        <HintNote
          helper={helper}
          text={hintNote}
          onClose={() => {
            setHintNote(null);
            setPawed([]);
          }}
        />
      ) : null}
      {pawedClues.length ? <ClueList c={c} progress={progress} dispatch={dispatch} clues={pawedClues} pawed={pawed} /> : null}
      <div className={styles.grid}>
        <GridPanel c={c} progress={progress} dispatch={dispatch} focus={null} onFocus={onPick} pawedSquare={hintNote ? progress.gridHints?.target : undefined} />
      </div>
      <p className={styles.note}>Tap a name to read what you know about it.</p>
    </>
  );
}

/** A guest's, a weapon's or a room's page. */
function SubjectPage({ book, page, onBack }: { book: QuickBook; page: Page; onBack: () => void }) {
  const { c, progress, dispatch } = book;
  const { subject } = page;
  const back = NOTEBOOK_TABS.find((t) => t.id === page.from)?.label ?? 'Back';
  const clues = subjectClues(c, progress, subject);
  const them = subject.kind === 'suspect' ? 'them' : 'it';
  let head: ReactNode;
  if (subject.kind === 'room') {
    head = <h2 className={styles.title}>Clues about the {roomName(subject.id)}</h2>;
  } else {
    head = (
      <>
        <h2 className={`${styles.title} ${styles.withBadge}`}>
          {subject.kind === 'suspect' ? <Counter id={subject.id} guests={c.guests} /> : <Chip item={subject.id} />}
          <span>{subjectTitle(c, subject)}</span>
        </h2>
        <p className={styles.where}>{placementLine(c, progress, subject)}</p>
      </>
    );
  }
  return (
    <>
      <button type="button" className={styles.back} onClick={onBack}>
        ‹ {back}
      </button>
      {head}
      {subject.kind === 'room' ? null : <h3 className={styles.heading}>Clues that name {them}</h3>}
      {clues.length ? (
        <ClueList c={c} progress={progress} dispatch={dispatch} clues={clues} />
      ) : (
        <p className={styles.note}>{subject.kind === 'room' ? "No clue you've found mentions it yet." : `No clue you've found names ${them} yet.`}</p>
      )}
      {subject.kind === 'suspect' ? (
        <>
          <h3 className={styles.heading}>What they said</h3>
          <TalkSection c={c} progress={progress} dispatch={dispatch} suspect={subject.id} />
        </>
      ) : null}
    </>
  );
}

/** The spiral binding along the top edge. Decorative. */
function Rings() {
  return (
    <span className={styles.rings} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} />
      ))}
    </span>
  );
}

interface Props {
  book: QuickBook;
  /** The dev preview's sample: where to start, and nothing is saved. */
  sample?: SampleCase;
  /** A puzzle page is open over the book: the notebook steps aside. */
  hidden: boolean;
}

/**
 * Her notebook, on every page of the #shelf book: a strip at the bottom (the peek) that pulls up into
 * a kraft-covered pad with You, Clues, Grid and Guests tabs. It reuses the casebook's grid, clue cards
 * and talk, restyled under body.shelf. Her last tab is remembered; a subject page belongs to its tab.
 */
export function Notebook({ book, sample, hidden }: Props) {
  const start = sample?.notebook;
  const [open, setOpen] = useState(start?.open ?? false);
  const [tab, setTab] = useState<NotebookTab>(() => start?.tab ?? (sample ? 'clues' : loadNotebookTab()));
  const [page, setPage] = useState<Page | null>(() => (start?.subject ? { subject: start.subject, from: start.tab ?? 'guests' } : null));
  const peekRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(open);

  // Focus goes into the pad when it opens and back to the strip when it closes (not on the first render).
  useEffect(() => {
    if (wasOpen.current === open) return;
    wasOpen.current = open;
    if (open) panelRef.current?.focus({ preventScroll: true });
    else peekRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const choose = (t: NotebookTab) => {
    setTab(t);
    setPage(null);
    if (!sample) saveNotebookTab(t);
  };
  const pick = (from: NotebookTab) => (subject: Subject) => setPage({ subject, from });

  let content: ReactNode;
  if (page) content = <SubjectPage book={book} page={page} onBack={() => setPage(null)} />;
  else if (tab === 'you') content = <YouTab c={book.c} progress={book.progress} />;
  else if (tab === 'clues') content = <CluesTab c={book.c} progress={book.progress} dispatch={book.dispatch} />;
  else if (tab === 'grid') content = <GridTab book={book} onPick={pick('grid')} />;
  else content = <GuestsTab c={book.c} onPick={pick('guests')} />;

  const close = () => setOpen(false);
  return (
    <div className={`${styles.root} ${open ? styles.isOpen : ''}`} hidden={hidden}>
      <button ref={peekRef} type="button" className={styles.peek} inert={open} onClick={() => setOpen(true)} {...swipe('up', () => setOpen(true))}>
        <Rings />
        <span className={styles.peekLine}>{peekLine(book.c, book.progress)}</span>
      </button>
      <div className={styles.scrim} aria-hidden="true" onClick={close} />
      <section ref={panelRef} tabIndex={-1} className={styles.panel} inert={!open} aria-label="Your notebook">
        <Rings />
        <div className={styles.paper}>
          <button type="button" className={styles.handle} aria-label="Put the notebook away" onClick={close} {...swipe('down', close)}>
            <span className={styles.bar} />
            <span className={styles.handleText}>Pull down to put away</span>
          </button>
          <div className={styles.scroll} key={`${tab}:${page ? `${page.subject.kind}:${page.subject.id}` : ''}`}>
            {content}
          </div>
          <nav className={styles.tabs} aria-label="Notebook pages">
            {NOTEBOOK_TABS.map((t) => (
              <button key={t.id} type="button" aria-current={tab === t.id ? 'page' : undefined} onClick={() => choose(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </section>
    </div>
  );
}
