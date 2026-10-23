// The case board screen: a packing puzzle where every clue is a piece. The
// rules live in boardSave.ts and the words in boardText.ts; this file is the
// drawing and the dragging.

import { useEffect, useEffectEvent, useId, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Board, BoardCell } from '../../engine/boardTypes.ts';
import { UNKNOWN, boardKey } from '../../engine/boardTypes.ts';
import { boardSolvable } from '../../engine/board.ts';
import { Rng, hashSeed } from '../../engine/rng.ts';
import { houseDetails } from '../../content/index.ts';
import type { Case, Difficulty } from '../../engine/types.ts';
import { Dialog } from '../Dialog.tsx';
import { Paw } from '../games/Hints.tsx';
import { suspectColour, roomTint, itemName } from '../names.ts';
import { loadRoomsOverlay, saveRoomsOverlay } from '../storage.ts';
import {
  blocker,
  boardSolvedSave,
  checkBoard,
  clashes,
  clearPlaced,
  dropCheck,
  fitsAnywhere,
  isComplete,
  isFull,
  makeRules,
  occupancy,
  orient,
  partnersOf,
  sectionAt,
  touching,
  trayIds,
  unmetTouches,
  withHint,
  withPlaced,
  withTurn,
  withoutPlaced,
  tokensOf,
  type BoardSave,
} from './boardSave.ts';
import { blockText, caption, clashText, lowerThe, pieceName, rulesOf, sectionName, shortName, theSection } from './boardText.ts';
import { useBoardDrag, type Held } from './useBoardDrag.ts';
import { boardUiReducer, initialBoardUi, type Toast } from './boardUi.ts';
import './board.css';

export type { BoardSave };

const WEAPON_COLOURS = ['#a9bcc6', '#d1bb8f', '#d8bd6a', '#c3b3d3', '#a9cdb4', '#a8bde0'];
const SIDES: readonly (readonly [BoardCell, BoardCell, BoardCell])[] = [
  [[-1, 0], [0, 0], [0, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, -1], [0, 0], [1, 0]],
];

export interface CaseBoardProps {
  board: Board;
  level: Difficulty;
  c: Case;
  save: BoardSave;
  onChange(save: BoardSave): void;
  /** Read-only: show the true packing. */
  finished: boolean;
  /** The cat's name. */
  helper: string;
  intro?: ReactNode;
  doneContent?: ReactNode;
  onComplete?(save: BoardSave): void;
  /** The puzzles she hasn't played, in order: grey piece n is a hunch from puzzle n ("the sudoku"). */
  hunches?: readonly string[];
}

export function CaseBoard(props: CaseBoardProps) {
  const { board, level, c, onChange, finished, helper, intro, doneContent, onComplete, hunches } = props;
  const uid = useId().replace(/[^a-z0-9]/gi, '');
  // The clues behind the pieces live in a sheet, so the board, tray and legend are all there is on screen.
  const [cluesOpen, setCluesOpen] = useState(false);
  const [rooms, setRooms] = useState(loadRoomsOverlay);
  const rules = useMemo(() => {
    // Each filler piece is something she noticed about the house, picked on the case's own seed.
    const fog = board.pieces.filter((p) => p.kind === 'fog').map((p) => p.id);
    const details = new Rng(hashSeed(`${c.seed}-noticed-${fog.join(',')}`)).shuffle(houseDetails);
    const grey = board.pieces.filter((p) => p.kind === 'grey').map((p) => p.id);
    const labels = {
      noticed: Object.fromEntries(fog.map((id, i) => [id, details[i % details.length]])),
      hunchFor: Object.fromEntries(grey.flatMap((id, i) => (hunches?.[i] ? [[id, hunches[i]]] : []))),
    };
    return { ...makeRules(board, level, finished, c.guests), labels };
  }, [board, level, finished, c.seed, c.guests, hunches]);
  const solved = useMemo(() => boardSolvedSave(board, level), [board, level]);
  const save = finished ? solved : props.save;

  const [selected, setSelected] = useState<string | null>(null);
  const [clueSel, setClueSel] = useState<string | null>(null);
  const [legend, setLegend] = useState<string | null>(null);
  const [ui, dispatch] = useReducer(boardUiReducer, initialBoardUi);
  const { toast, flagged } = ui;
  const [cell, setCell] = useState(36);

  const cardRef = useRef<HTMLDivElement>(null);
  const fired = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  const revealPanel = useRef(false);

  // ---------- Size: as big as fits, up to 40px a square ----------
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => {
      const avail = el.clientWidth - 22;
      if (avail > 0) setCell(Math.max(20, Math.min(40, Math.floor(avail / board.W))));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [board.W]);

  // ---------- Actions and dragging ----------
  const commit = (next: BoardSave) => onChange(next);
  const undoN = ui.undo.length;
  const pushUndo = () => dispatch({ type: 'pushUndo', save });
  const say = (t: Toast | null) => dispatch({ type: 'say', toast: t });

  const { drag, hovered, tip, onPointerDown, ghostRef, tipRef, ghostOffset } = useBoardDrag({
    rules,
    save,
    finished,
    cell,
    commit,
    tryPlace,
    askHint,
    pushUndo,
    setSelected,
    turnSelected,
    hasSelection: !!selected,
    onTap: () => {
      revealPanel.current = true;
    },
  });

  // A tap on the board opens the panel below the tray, often off a phone screen: bring it up.
  // Only after taps, so a drop never scrolls the tray away from the board.
  useEffect(() => {
    if (!revealPanel.current) return;
    revealPanel.current = false;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    panelRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [selected]);

  // ---------- What's on the board ----------
  const heldPid = drag ? drag.pid : null;
  const viewSave = useMemo(() => (heldPid && save.placed[heldPid] ? withoutPlaced(save, heldPid) : save), [save, heldPid]);
  const occ = useMemo(() => occupancy(rules, viewSave), [rules, viewSave]);
  const clashList = useMemo(() => clashes(rules, viewSave), [rules, viewSave]);
  const full = useMemo(() => isFull(rules, viewSave, occ), [rules, viewSave, occ]);
  const metSyms = useMemo(() => new Set(rules.touch.filter((t) => touching(rules, viewSave, t.a, t.b, occ)).map((t) => t.sym)), [rules, viewSave, occ]);
  const complete = finished || (full && isComplete(rules, viewSave));
  const unmet = useMemo(() => full && !clashList.length && unmetTouches(rules, viewSave, occ).length > 0, [full, clashList, rules, viewSave, occ]);
  const focus = drag ? drag.pid : selected;
  const loose = (pid: string) => !rules.pinned.has(pid);
  const tray = trayIds(rules, save);
  const pins = new Set(board.pinned[level] ?? []);

  const hl = new Set<string>();
  if (clueSel) rules.board.pieces.filter((p) => p.clue === clueSel).forEach((p) => hl.add(p.id));
  if (legend) rules.board.pieces.filter((p) => legendKey(p.kind, p.who) === legend).forEach((p) => hl.add(p.id));
  if (focus) partnersOf(rules, focus).forEach((q) => hl.add(q));

  const hintStep = focus && loose(focus) ? save.hints[focus] || 0 : 0;
  const catSec = hintStep >= 1 && focus ? board.truth[focus].section : null;
  const trace = new Set(hintStep >= 2 && focus ? board.truth[focus].cells.map(([r, k]) => boardKey(r, k)) : []);

  // ---------- Colours and patterns ----------
  const guestIdx = (who: string) => Math.max(0, c.suspects.indexOf(who));
  const weaponIdx = (who: string) => Math.max(0, c.items.indexOf(who));
  const colourOf = (pid: string) => {
    const p = rules.piece[pid];
    if (p.kind === 'guest') return suspectColour(p.who as string);
    if (p.kind === 'weapon') return WEAPON_COLOURS[weaponIdx(p.who as string) % WEAPON_COLOURS.length];
    return p.kind === 'grey' ? '#8f918b' : p.kind === 'fog' ? '#6d726e' : 'var(--brass)';
  };

  function runCheck(): { flagged: string[]; text: string; kind: Toast['kind'] } {
    const res = checkBoard(rules, save, boardSolvable);
    const n = (k: number, one: string, many: string) => (k === 1 ? one : many);
    if (res.kind === 'empty') return { flagged: [], kind: 'cat', text: `${helper} says there's nothing to check yet. Put some pieces on the board first.` };
    if (res.kind === 'ok') return { flagged: [], kind: 'good', text: 'Nothing wrong so far. Every piece is somewhere the clues allow, and the rest can still fit around them.' };
    if (res.kind === 'sections') {
      return {
        flagged: res.flagged,
        kind: 'cat',
        text: res.flagged.length
          ? `${helper} circled ${n(res.flagged.length, "a piece that can't", `${res.flagged.length} pieces that can't`)} stay in ${n(res.flagged.length, 'its room', 'their rooms')}: the clues rule it out once the rest has to fit.`
          : "Each piece could be in its room on its own, but not all of them together. Try moving one you weren't sure about.",
      };
    }
    const where = res.sections.map(theSection);
    const list = where.length < 2 ? where.join('') : `${where.slice(0, -1).join(', ')} and ${where[where.length - 1]}`;
    return {
      flagged: res.flagged,
      kind: 'cat',
      text: res.flagged.length
        ? `Every piece is in a room the clues allow, but ${n(res.flagged.length, 'the circled piece sits so that', 'the circled pieces sit so that')} the squares left in ${list} can't fit what has to go there. Try shifting or turning ${n(res.flagged.length, 'it', 'them')}.`
        : 'Every piece is in a room the clues allow, but together they leave gaps nothing can fill. Try shifting or turning a piece.',
    };
  }
  function check() {
    const res = runCheck();
    dispatch({ type: 'flag', ids: res.flagged });
    say({ kind: res.kind, text: res.text });
  }
  function askHint(pid: string) {
    if (finished) return;
    if (!loose(pid)) {
      say({ kind: 'cat', text: `${helper} says that one is pinned already.` });
      return;
    }
    const { save: next, step } = withHint(save, pid);
    if (next !== save) commit(next);
    setSelected(pid);
    const where = theSection(board.truth[pid].section);
    const name = lowerThe(pieceName(rules, pid));
    say({
      kind: 'cat',
      text: step === 1 ? `${helper} curled up in ${where}. That's where ${name} goes. Ask again for its outline.` : `${helper} traced the outline in ${where}. Turn the piece to match it.`,
    });
  }
  function stuck(pid: string) {
    const res = runCheck();
    dispatch({ type: 'flag', ids: res.flagged });
    const name = lowerThe(pieceName(rules, pid));
    const k = res.flagged.length;
    say({
      kind: 'cat',
      text: `There's no space left that ${name} fits. ${k ? `${helper} circled ${k === 1 ? "the piece that's" : 'the pieces that are'} in the way: move ${k === 1 ? 'it' : 'them'} and the space opens up.` : 'Something placed earlier is in its spot. Try Check, or take a piece back and look again.'}`,
    });
  }
  /**
   * The clue behind a refusal: one of the case's clues about this guest or weapon that rules the room out.
   * A piece can carry marks from several clues (past two pieces a guest's later clues add to the last one).
   */
  function ruleClue(pid: string, section: string, fallback: string | null) {
    const who = rules.piece[pid].who;
    const rulesOut = (f: Case['clues'][number]['fact']) => {
      if (!who) return false;
      if ((f.type === 'suspect-not-room' && f.suspect === who) || (f.type === 'item-not-room' && f.item === who)) return f.room === section;
      if ((f.type === 'suspect-room' && f.suspect === who) || (f.type === 'item-room' && f.item === who)) return f.room !== section;
      if (f.type === 'suspect-either-room' && f.suspect === who) return !f.rooms.includes(section);
      return false;
    };
    const own = fallback ? c.clues.find((x) => x.id === fallback) : undefined;
    if (own && rulesOut(own.fact)) return own;
    return c.clues.find((x) => rulesOut(x.fact) && rules.board.pieces.some((p) => p.clue === x.id || p.who === who));
  }
  function tryPlace(d: Held, br: number, bc: number) {
    const pid = d.pid;
    const aimed = sectionAt(rules.board, br, bc);
    if (!aimed) return;
    const early = blocker(rules, pid, aimed);
    if (early) {
      const clue = ruleClue(pid, aimed, early.clue);
      say({ kind: 'bad', text: blockText(rules, pid, aimed, early), quote: clue?.text });
      if (clue) setClueSel(clue.id);
      return;
    }
    const target = d.cells.map(([r, k]) => [br - d.gr + r, bc - d.gc + k] as BoardCell);
    const res = dropCheck(rules, save, pid, target);
    if (!res.ok) {
      if (!fitsAnywhere(rules, save, pid)) return stuck(pid);
      say({ kind: 'bad', text: res.why === 'wall' ? "A piece can't cross a wall: it has to sit inside one room, or inside Unknown." : "That shape doesn't fit there. Try turning it, or another spot." });
      return;
    }
    pushUndo();
    const next = withPlaced(save, pid, { section: res.section, cells: target, shape: d.cells });
    dispatch({ type: 'unflag', pid });
    const clash = clashes(rules, next).find((x) => x.ids.includes(pid));
    say(clash ? { kind: 'bad', text: `Placed, but something doesn't add up. ${clashText(rules, clash)}` } : null);
    commit(next);
  }
  function undo() {
    const prev = ui.undo[ui.undo.length - 1];
    dispatch({ type: 'popUndo' });
    if (!prev) return;
    dispatch({ type: 'clearFlags' });
    // Hints stay asked.
    commit({ ...prev, hints: save.hints, hintCount: save.hintCount });
  }
  function restart() {
    pushUndo();
    dispatch({ type: 'clearFlags' });
    commit(clearPlaced(save));
    say({ kind: 'good', text: 'Board cleared. Undo brings it back.' });
  }
  function turnSelected() {
    if (selected && loose(selected) && !save.placed[selected]) commit(withTurn(save, selected));
  }

  // A note fades after a few seconds.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dispatch({ type: 'say', toast: null }), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Tell the parent once when the board becomes complete.
  const completeNow = !finished && isComplete(rules, props.save);
  const reportComplete = useEffectEvent((complete: boolean) => {
    if (complete && !fired.current) {
      fired.current = true;
      onComplete?.(props.save);
    } else if (!complete) fired.current = false;
  });
  useEffect(() => reportComplete(completeNow), [completeNow]);

  // ---------- Pieces ----------
  function square(pid: string, i: number, opts: { draggable: boolean; flat: boolean; shape?: boolean }) {
    const p = rules.piece[pid];
    const cls = p.kind === 'guest' ? `cb-gp-${guestIdx(p.who as string) % 7}` : p.kind === 'weapon' ? `weapon cb-wp-${weaponIdx(p.who as string) % 6}` : p.kind;
    const bg = p.kind === 'guest' || p.kind === 'weapon' ? { backgroundColor: colourOf(pid) } : undefined;
    const all = tokensOf(rules, pid);
    const toks = i === p.shape.length - 1 ? all.slice(i) : all.slice(i, i + 1);
    const pinned = !loose(pid);
    return (
      <div
        className={`cb-pc ${cls} ${pinned ? 'fixed' : ''} ${pinned && i === 0 && pins.has(pid) ? 'pin' : ''} ${hl.has(pid) ? 'hl' : ''} ${hovered === pid ? 'hov' : ''}`}
        style={{ ...bg, borderWidth: opts.flat ? 0 : 1 }}
        data-cbtip={pid}
        data-cbpid={opts.draggable && !finished ? pid : undefined}
        data-cbi={i}
      >
        {toks.map((tok) => (
          <span key={tok.cls + tok.s} className={`cb-tok ${tok.cls} ${tok.cls === 'sym' && metSyms.has(tok.s) ? 'met' : ''}`}>
            {tok.s}
          </span>
        ))}
      </div>
    );
  }

  function miniGrid(pid: string, cells: readonly BoardCell[], extra = '') {
    const h = Math.max(...cells.map((x) => x[0])) + 1;
    const w = Math.max(...cells.map((x) => x[1])) + 1;
    const at = new Map(cells.map((x, i) => [boardKey(x[0], x[1]), i]));
    const out: ReactNode[] = [];
    for (let r = 0; r < h; r++) {
      for (let k = 0; k < w; k++) {
        const i = at.get(boardKey(r, k));
        out.push(<div key={`${r},${k}`}>{i === undefined ? null : square(pid, i, { draggable: extra === 'tray', flat: false })}</div>);
      }
    }
    return { w, node: out };
  }

  // ---------- The board ----------
  const geometry = useMemo(() => {
    const lines: { key: string; cls: string; sec: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    const first: Record<string, BoardCell> = {};
    const mine: Record<string, BoardCell[]> = {};
    for (let r = 0; r < board.H; r++) {
      for (let k = 0; k < board.W; k++) {
        const s = board.cells[boardKey(r, k)];
        if (!s) continue;
        (mine[s] ??= []).push([r, k]);
        first[s] ??= [r, k];
        SIDES.forEach(([[dr, dc], [r1, c1], [r2, c2]], n) => {
          const nb = board.cells[boardKey(r + dr, k + dc)];
          if (nb !== s) lines.push({ key: `w${r},${k},${n}`, cls: 'wall', sec: s, x1: k + c1, y1: r + r1, x2: k + c2, y2: r + r2 });
          else if (dr > 0 || dc > 0) lines.push({ key: `g${r},${k},${n}`, cls: 'grid', sec: s, x1: k + c1, y1: r + r1, x2: k + c2, y2: r + r2 });
        });
      }
    }
    const centre: Record<string, BoardCell> = {};
    for (const [s, cs] of Object.entries(mine)) {
      const mr = cs.reduce((n, x) => n + x[0], 0) / cs.length;
      const mc = cs.reduce((n, x) => n + x[1], 0) / cs.length;
      centre[s] = cs.reduce((best, x) => ((x[0] - mr) ** 2 + (x[1] - mc) ** 2 < (best[0] - mr) ** 2 + (best[1] - mc) ** 2 ? x : best));
    }
    return { lines, first, centre };
  }, [board]);

  const holding = !!drag;
  const blockedFor = (sec: string) => (drag ? blocker(rules, drag.pid, sec) : null);
  const overSec = drag?.over?.kind === 'cell' ? drag.over.sec : null;
  const W = board.W * cell;
  const H = board.H * cell;
  const free: Record<string, number> = {};
  for (const [k, s] of Object.entries(board.cells)) if (!occ[k]) free[s] = (free[s] || 0) + 1;

  const cellEls: ReactNode[] = [];
  for (let r = 0; r < board.H; r++) {
    for (let k = 0; k < board.W; k++) {
      const key = boardKey(r, k);
      const s = board.cells[key];
      if (!s) {
        cellEls.push(<div key={key} className="cb-bc" />);
        continue;
      }
      const isOver = drag?.over?.kind === 'cell' && drag.over.r === r && drag.over.c === k;
      cellEls.push(
        <div
          key={key}
          className={`cb-bc ${s === UNKNOWN ? 'unknown' : ''} ${holding && blockedFor(s) ? 'no' : ''} ${isOver ? 'over' : ''} ${catSec === s ? 'catroom' : ''} ${trace.has(key) && !occ[key] ? 'trace' : ''}`}
          style={s === UNKNOWN ? undefined : ({ '--tint': roomTint(s) } as CSSProperties)}
          data-cbr={r}
          data-cbc={k}
          data-cbsec={s}
        />,
      );
    }
  }

  const onBoard = [...new Set(Object.values(occ).map((o) => o.pid))];
  const squares: ReactNode[] = [];
  const outlines: ReactNode[] = [];
  const clips: ReactNode[] = [];
  const clashing = new Set(clashList.flatMap((x) => x.ids));
  for (const pid of onBoard) {
    const mine = Object.entries(occ).filter(([, o]) => o.pid === pid).map(([key, o]) => ({ key, i: o.i, r: +key.split(',')[0], k: +key.split(',')[1] }));
    const has = new Set(mine.map((m) => m.key));
    let d = '';
    for (const m of mine) {
      squares.push(
        <div key={`${pid}:${m.i}`} className="cb-psq" style={{ left: m.k * cell, top: m.r * cell }}>
          {square(pid, m.i, { draggable: loose(pid), flat: true })}
        </div>,
      );
      for (const [[dr, dc], [r1, c1], [r2, c2]] of SIDES) {
        if (has.has(boardKey(m.r + dr, m.k + dc))) continue;
        d += `M${(m.k + c1) * cell} ${(m.r + r1) * cell}L${(m.k + c2) * cell} ${(m.r + r2) * cell}`;
      }
    }
    const id = `cp${uid}${pid.replace(/[^a-z0-9]/gi, '')}`;
    clips.push(
      <clipPath key={id} id={id}>
        {mine.map((m) => (
          <rect key={m.key} x={m.k * cell} y={m.r * cell} width={cell} height={cell} />
        ))}
      </clipPath>,
    );
    const state = `${hl.has(pid) ? 'hl' : ''} ${flagged.has(pid) || clashing.has(pid) ? 'flag' : ''} ${hovered === pid ? 'hov' : ''}`;
    outlines.push(<path key={`b${pid}`} className={`cb-outl band ${state}`} d={d} clipPath={`url(#${id})`} />, <path key={`e${pid}`} className={`cb-outl edge ${state}`} d={d} clipPath={`url(#${id})`} />);
  }

  const names = board.sections.map((sec) => {
    const ctr = geometry.centre[sec];
    if (!ctr) return null;
    const blocked = holding && blockedFor(sec);
    return (
      <span key={sec} className={`cb-roomname ${blocked ? 'blocked' : ''}`} style={{ left: (ctr[1] + 0.5) * cell, top: (ctr[0] + 0.5) * cell }}>
        {sectionName(sec)}
        <small>{blocked ? 'not here' : free[sec] ? `${free[sec]} empty` : 'full'}</small>
      </span>
    );
  });

  // ---------- Selected piece, legend, clues ----------
  const clueText = (id: string | null) => (id ? c.clues.find((x) => x.id === id)?.text : undefined);
  const showClue = (pid: string) => (!rules.piece[pid].hidden || finished ? clueText(rules.piece[pid].clue) : undefined);

  const pieceKinds = new Set(board.pieces.map((p) => p.kind));
  const legendItems: { k: string; label: string; style: CSSProperties; cls: string }[] = [
    ...c.suspects.filter((s) => board.pieces.some((p) => p.kind === 'guest' && p.who === s)).map((s) => ({ k: legendKey('guest', s), label: shortName(c.guests, s), cls: `cb-gp-${guestIdx(s) % 7}`, style: { backgroundColor: suspectColour(s) } })),
    ...c.items.filter((w) => board.pieces.some((p) => p.kind === 'weapon' && p.who === w)).map((w) => ({ k: legendKey('weapon', w), label: itemName(w)[0].toUpperCase() + itemName(w).slice(1), cls: `cb-wp-${weaponIdx(w) % 6}`, style: { backgroundColor: WEAPON_COLOURS[weaponIdx(w) % WEAPON_COLOURS.length] } })),
    ...(pieceKinds.has('body') ? [{ k: 'body', label: 'Body', cls: '', style: { background: '#3b2b2b' } }] : []),
    ...(pieceKinds.has('grey') ? [{ k: 'grey', label: 'Hunch', cls: '', style: { background: '#8f918b' } }] : []),
    ...(pieceKinds.has('fog') ? [{ k: 'fog', label: 'Noticed', cls: 'fog', style: {} }] : []),
  ];
  const clueIds = [...new Set(rules.board.pieces.filter((p) => p.clue && (!p.hidden || finished) && clueText(p.clue)).map((p) => p.clue as string))];

  const tipPiece = tip ? rules.piece[tip.pid] : null;
  const tipLines = tip && tipPiece ? [...rulesOf(rules, tip.pid, finished), ...(loose(tip.pid) && (save.hints[tip.pid] || 0) ? [`${helper} curled up in ${theSection(board.truth[tip.pid].section)}.`] : [])] : [];
  const ghostW = drag ? Math.max(...drag.cells.map((x) => x[1])) + 1 : 1;
  const ghostH = drag ? Math.max(...drag.cells.map((x) => x[0])) + 1 : 1;
  const ghostAt = drag ? new Map(drag.cells.map((x, i) => [boardKey(x[0], x[1]), i])) : new Map<string, number>();

  return (
    <div className={`cb-root ${holding ? 'cb-dragging' : ''} ${rooms ? 'cb-rooms' : ''}`} style={{ '--cell': `${cell}px` } as CSSProperties} onPointerDown={onPointerDown}>
      {intro && <div className="cb-intro">{intro}</div>}
      <details className="cb-how">
        <summary>How to play</summary>
        <ul>
          <li>Fit every piece into a room or into Unknown. Pieces can't cross the thick walls.</li>
          <li>Pieces with the same symbol must touch. A crossed-out symbol means those two were never in the same room.</li>
          <li>Grey pieces are hunches: clues from puzzles you haven't played. They only fit in Unknown.</li>
          <li>Speckled pieces are things you noticed about the house that have nothing to do with the case. They're already in place and never move.</li>
          <li>All of one person's pieces go in the same place.</li>
          <li>Pick up a piece and the rooms it can't go in go dark.</li>
          <li>Turn a piece: double-tap it, or press Turn. While dragging: right-click, press R, scroll, or tap with another finger.</li>
          <li>Stuck? Drag a piece onto the cat, or pick one and tap Hint.</li>
        </ul>
      </details>

      <section className="cb-boardcard" aria-label="Board" ref={cardRef}>
        <div className="cb-board" style={{ '--w': board.W } as CSSProperties}>
          {cellEls}
          <svg className="cb-layer lines" width={W} height={H} aria-hidden="true">
            {geometry.lines.map((l) => (
              <line key={l.key} className={l.cls === 'wall' ? `cb-wall-line ${overSec === l.sec ? 'strong' : ''}` : 'cb-grid-line'} x1={l.x1 * cell} y1={l.y1 * cell} x2={l.x2 * cell} y2={l.y2 * cell} />
            ))}
          </svg>
          {squares}
          <svg className="cb-layer outlines" width={W} height={H} aria-hidden="true">
            <defs>{clips}</defs>
            {outlines}
          </svg>
          {rooms && (
            <svg className="cb-layer walls" width={W} height={H} aria-hidden="true">
              {geometry.lines.filter((l) => l.cls === 'wall').map((l) => (
                <line key={l.key} className="cb-wall-top" x1={l.x1 * cell} y1={l.y1 * cell} x2={l.x2 * cell} y2={l.y2 * cell} />
              ))}
            </svg>
          )}
          {catSec && geometry.first[catSec] && (
            <span className="cb-paw" style={{ left: geometry.first[catSec][1] * cell + 2, top: geometry.first[catSec][0] * cell + 2 }}>
              <Paw />
            </span>
          )}
          {names}
        </div>
      </section>

      <button
        className="cb-tool cb-rooms-btn"
        aria-pressed={rooms}
        onClick={() => {
          setRooms(!rooms);
          saveRoomsOverlay(!rooms);
        }}
      >
        Rooms
      </button>

      {!finished && (
        <>
          <div className={`cb-tray ${drag?.over?.kind === 'tray' ? 'over' : ''}`} data-cbtray="1" aria-label="Pieces">
            {tray.length ? (
              tray.map((pid) => {
                const cells = orient(rules.piece[pid].shape, save.rot[pid] || 0);
                const g = miniGrid(pid, cells, 'tray');
                return (
                  <button
                    key={pid}
                    className={`cb-tpiece ${selected === pid ? 'selected' : ''}`}
                    style={drag?.pid === pid ? { opacity: 0.35 } : undefined}
                    aria-label={pieceName(rules, pid)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected((s) => (s === pid ? null : pid));
                      }
                    }}
                  >
                    <div className="cb-tgrid" style={{ '--w': g.w } as CSSProperties}>
                      {g.node}
                    </div>
                    <span className="cb-cap">{caption(rules, pid)}</span>
                  </button>
                );
              })
            ) : (
              <span className="cb-muted">Every piece is on the board.</span>
            )}
          </div>

          <div className="cb-toolbar">
            <button
              className={`cb-cat ${drag?.over?.kind === 'hint' ? 'over' : ''}`}
              data-cbhint="1"
              aria-label={`Hint from ${helper}: drag a piece onto the cat, or pick a piece and tap`}
              onClick={() => (selected ? askHint(selected) : say({ kind: 'cat', text: `Drag a piece onto the cat, or tap a piece first, and ${helper} will help with that one.` }))}
            >
              <Paw />
              <span>Hint{save.hintCount ? <small> {save.hintCount}</small> : null}</span>
            </button>
            <button className="cb-tool" disabled={!undoN} onClick={undo}>
              Undo
            </button>
            <button className="cb-tool" disabled={!Object.keys(save.placed).length} onClick={check}>
              Check
            </button>
            <button className="cb-tool" disabled={!Object.keys(save.placed).length} onClick={restart}>
              Restart
            </button>
          </div>
          <p className="cb-muted" style={{ textAlign: 'center', marginTop: -6 }}>
            Drag a piece onto the cat for a hint. Check tells you if a piece can't be right.
          </p>
        </>
      )}

      {focus && !drag && !finished && rules.piece[focus] && (
        <section ref={panelRef} className="cb-panel" style={{ '--who': colourOf(focus) } as CSSProperties} aria-label="Selected piece">
          <div className="head">
            <h2>{pieceName(rules, focus)}</h2>
            {loose(focus) && !save.placed[focus] && (
              <button className="cb-rot" onClick={turnSelected}>
                Turn
              </button>
            )}
          </div>
          <ul className="cb-rules">
            {rulesOf(rules, focus, finished).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {showClue(focus) && <p className="cb-quote">“{showClue(focus)}”</p>}
        </section>
      )}

      <ul className="cb-legend" aria-label="Pieces: tap one to light it up">
        {legendItems.map((it) => (
          <li key={it.k}>
            <button className={legend === it.k ? 'on' : ''} aria-pressed={legend === it.k} onClick={() => { setLegend((l) => (l === it.k ? null : it.k)); setClueSel(null); }}>
              <span className={`cb-sw ${it.cls}`} style={it.style} />
              {it.label}
            </button>
          </li>
        ))}
      </ul>

      {!finished && clashList.map((x, i) => (
        <p key={i} className="cb-note">
          {clashText(rules, x)}
        </p>
      ))}
      {!finished && unmet && <p className="cb-note">Every square is full, but some matching symbols aren't touching yet.</p>}

      {complete && (
        <section className="cb-done" aria-live="polite">
          <h2>The pieces fit</h2>
          {doneContent}
          {!finished && save.hintCount > 0 && <p className="cb-muted" style={{ color: 'var(--ink-soft)' }}>You asked {helper} {save.hintCount} time{save.hintCount === 1 ? '' : 's'}.</p>}
        </section>
      )}

      {clueIds.length > 0 && (
        <button className="secondary cb-clues-open" onClick={() => setCluesOpen(true)}>
          Clues on the board ({clueIds.length})
        </button>
      )}
      {cluesOpen && (
        <Dialog labelId={`${uid}-clues`} onClose={() => setCluesOpen(false)}>
          <header className="sheet-head">
            <span aria-hidden="true" />
            <div>
              <h2 id={`${uid}-clues`}>Clues on the board</h2>
              <p className="muted">Tap one to light up its pieces.</p>
            </div>
            <button data-autofocus className="sheet-close" aria-label="Close" onClick={() => setCluesOpen(false)}>
              ×
            </button>
          </header>
          <ul className="cb-clues">
            {clueIds.map((id) => {
              const first = rules.board.pieces.find((p) => p.clue === id);
              return (
                <li key={id}>
                  <button
                    className={`cb-clue ${clueSel === id ? 'on' : ''}`}
                    style={{ '--who': first ? colourOf(first.id) : 'var(--brass)' } as CSSProperties}
                    onClick={() => {
                      // Close so she sees the pieces light up.
                      setClueSel((s) => (s === id ? null : id));
                      setLegend(null);
                      setCluesOpen(false);
                    }}
                  >
                    {clueText(id)}
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog>
      )}

      {toast && (
        <div className={`cb-toast ${toast.kind === 'good' ? 'good' : toast.kind === 'cat' ? 'cat' : ''}`} role="status">
          {toast.kind === 'cat' && <Paw />}
          <p>
            {toast.text}
            {toast.quote && <> “{toast.quote}”</>}
          </p>
          <button aria-label="Close" onClick={() => say(null)}>
            ×
          </button>
        </div>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <>
            {drag && (
              <div ref={ghostRef} className="cb-ghost" style={{ '--w': ghostW, '--cell': `${cell}px`, ...ghostOffset } as CSSProperties}>
                {Array.from({ length: ghostH * ghostW }, (_, n) => {
                  const r = Math.floor(n / ghostW);
                  const k = n % ghostW;
                  const i = ghostAt.get(boardKey(r, k));
                  return <div key={n}>{i === undefined ? null : square(drag.pid, i, { draggable: false, flat: false })}</div>;
                })}
              </div>
            )}
            {tip && tipPiece && (
              <div ref={tipRef} className="cb-tip" role="tooltip" style={{ '--who': colourOf(tip.pid) } as CSSProperties}>
                <b>{pieceName(rules, tip.pid)}</b>
                <ul>
                  {tipLines.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {tip.holding && <div className="how">Turn: right-click, R, scroll, or tap with another finger. Drop on the cat for a hint.</div>}
              </div>
            )}
          </>,
          document.body,
        )}
    </div>
  );
}

function legendKey(kind: string, who: string | null) {
  return kind === 'guest' ? `g:${who}` : kind === 'weapon' ? `w:${who}` : kind;
}

