// Dragging for the case board, built on the shared usePointerDrag hook: the
// press, the 8 px lift, the ghost at the finger and the drop come from there.
// This adds what is board-only: what is under the finger, turning the held
// piece (second finger, right button, wheel, R), the tooltip, taps and hover.

import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type SetStateAction } from 'react';
import type { BoardCell } from '../../engine/boardTypes.ts';
import { usePointerDrag } from '../usePointerDrag.ts';
import { orient, turnCells, withTurn, withoutPlaced, type BoardSave, type Rules } from './boardSave.ts';

export type Over = { kind: 'cell'; r: number; c: number; sec: string } | { kind: 'hint' } | { kind: 'tray' };

/** A piece being held: `cells` turn while it is held, `gr`/`gc` is the held square. */
export interface Held {
  pid: string;
  cells: BoardCell[];
  gi: number;
  gr: number;
  gc: number;
  fromBoard: boolean;
}
interface Press extends Held {
  lifted: boolean;
  right: boolean;
  over: Over | null;
}

/** What the screen draws from. */
export interface DragView {
  pid: string;
  cells: BoardCell[];
  gr: number;
  gc: number;
  over: Over | null;
}
export interface Tip {
  pid: string;
  holding: boolean;
}

const sameOver = (a: Over | null, b: Over | null) => (a === b ? true : !a || !b ? false : a.kind === b.kind && (a.kind !== 'cell' || (b.kind === 'cell' && a.r === b.r && a.c === b.c)));

export interface BoardDragOptions {
  rules: Rules;
  save: BoardSave;
  finished: boolean;
  /** Pixel size of one board square. */
  cell: number;
  commit(next: BoardSave): void;
  tryPlace(d: Held, r: number, c: number): void;
  askHint(pid: string): void;
  pushUndo(): void;
  setSelected: Dispatch<SetStateAction<string | null>>;
  /** Turn the selected piece (the R key when nothing is held). */
  turnSelected(): void;
  /** Is a piece selected (so R has something to turn)? */
  hasSelection: boolean;
  /** A short tap changed the selection (the panel it opens may be below the screen). */
  onTap(): void;
}

export function useBoardDrag(o: BoardDragOptions) {
  const [drag, setDrag] = useState<DragView | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const press = useRef<Press | null>(null);
  const lastTap = useRef<{ pid: string; t: number } | null>(null);
  const lastDragEnd = useRef(0);
  const lastWheel = useRef(0);
  const tipBox = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const tipRef = useRef<HTMLDivElement>(null);

  const view = (d: Press): DragView => ({ pid: d.pid, cells: d.cells, gr: d.gr, gc: d.gc, over: d.over });

  const placeTip = () => {
    const t = tipRef.current;
    if (!t) return;
    const box = tipBox.current;
    const w = t.offsetWidth;
    const h = t.offsetHeight;
    const x = Math.min(Math.max(8, box.x + box.width / 2 - w / 2), window.innerWidth - w - 8);
    let y = box.y - h - 10;
    if (y < 8) y = box.y + box.height + 10;
    t.style.left = `${x}px`;
    t.style.top = `${Math.max(8, Math.min(y, window.innerHeight - h - 8))}px`;
  };
  /** The tip sits above the ghost: measure it, then place the tip. */
  const syncTip = () => {
    const g = pd.ghostRef.current;
    if (g && press.current?.lifted) {
      const b = g.getBoundingClientRect();
      tipBox.current = { x: b.left, y: b.top, width: b.width, height: b.height };
    }
    placeTip();
  };

  const turnHeld = () => {
    const d = press.current;
    if (!d?.lifted) return;
    d.cells = turnCells(d.cells);
    [d.gr, d.gc] = d.cells[d.gi];
    if (!d.fromBoard) o.commit(withTurn(o.save, d.pid));
    setDrag(view(d));
  };

  const finishTap = (d: Press) => {
    const now = Date.now();
    const double = lastTap.current && lastTap.current.pid === d.pid && now - lastTap.current.t < 350;
    lastTap.current = { pid: d.pid, t: now };
    o.onTap();
    if (double && !o.save.placed[d.pid]) {
      o.setSelected(d.pid);
      o.commit(withTurn(o.save, d.pid));
    } else o.setSelected((s) => (s === d.pid ? null : d.pid));
  };

  const pd = usePointerDrag<Press>({
    onLift: (d) => {
      d.lifted = true;
      setTip({ pid: d.pid, holding: true });
      setHovered(null);
      setDrag(view(d));
    },
    onMove: (d, _at, e) => {
      let changed = false;
      if (e.pointerType === 'mouse') {
        const r = !!(e.buttons & 2);
        if (r && !d.right) turnHeld();
        d.right = r;
      }
      const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      let over: Over | null = null;
      const cellEl = under?.closest<HTMLElement>('[data-cbr]');
      if (cellEl) over = { kind: 'cell', r: +(cellEl.dataset.cbr as string), c: +(cellEl.dataset.cbc as string), sec: cellEl.dataset.cbsec as string };
      else if (under?.closest('[data-cbhint]')) over = { kind: 'hint' };
      else if (under?.closest('[data-cbtray]')) over = { kind: 'tray' };
      if (!sameOver(over, d.over)) {
        d.over = over;
        changed = true;
      }
      if (changed) setDrag(view(d));
      syncTip();
    },
    onDrop: (d) => {
      press.current = null;
      lastDragEnd.current = Date.now();
      setDrag(null);
      setTip(null);
      const over = d.over;
      if (over?.kind === 'cell') o.tryPlace(d, over.r, over.c);
      else if (over?.kind === 'hint') o.askHint(d.pid);
      else if (over?.kind === 'tray' && o.save.placed[d.pid]) {
        o.pushUndo();
        o.commit(withoutPlaced(o.save, d.pid));
      }
      o.setSelected(d.pid);
    },
    onTap: (d) => {
      press.current = null;
      setDrag(null);
      setTip(null);
      finishTap(d);
    },
    onCancel: (d) => {
      press.current = null;
      if (d.lifted) lastDragEnd.current = Date.now();
      setDrag(null);
      setTip(null);
      // As before, a press cancelled before it lifted still counts as a tap.
      if (!d.lifted) finishTap(d);
      else o.setSelected(d.pid);
    },
    onExtraPointer: () => turnHeld(),
  });

  // Keep the tip over the ghost after every render (a turn or a new tip changes both).
  useLayoutEffect(() => {
    syncTip();
  });

  /** Root onPointerDown: press on any piece square. */
  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (o.finished || press.current || e.button > 0) return;
    const el = (e.target as Element).closest<HTMLElement>('[data-cbpid]');
    if (!el) {
      // A pinned piece can't move, but a short tap selects it so its clue can be read (no mouse hover on a phone).
      const pin = (e.target as Element).closest<HTMLElement>('[data-cbtip]');
      if (!pin || !pin.closest('.cb-board')) return;
      const pinPid = pin.dataset.cbtip as string;
      const { pointerId, clientX, clientY } = e;
      const end = () => {
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', end);
      };
      const up = (u: PointerEvent) => {
        if (u.pointerId !== pointerId) return;
        end();
        if (Math.hypot(u.clientX - clientX, u.clientY - clientY) > 8) return;
        o.onTap();
        o.setSelected((s) => (s === pinPid ? null : pinPid));
      };
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', end);
      return;
    }
    const pid = el.dataset.cbpid as string;
    const placed = o.save.placed[pid];
    const cells = placed ? placed.shape.map((x) => [x[0], x[1]] as BoardCell) : orient(o.rules.piece[pid].shape, o.save.rot[pid] || 0);
    const gi = Math.min(+(el.dataset.cbi ?? 0), cells.length - 1);
    const d: Press = { pid, cells, gi, gr: cells[gi][0], gc: cells[gi][1], fromBoard: !!placed, lifted: false, right: false, over: null };
    press.current = d;
    pd.start(d, e);
  };

  // Window listeners are added once; effect events call the latest handlers.
  const hoverMove = useEffectEvent((e: PointerEvent) => {
    if (press.current || e.pointerType !== 'mouse') return;
    const t = (e.target as Element | null)?.closest?.<HTMLElement>('[data-cbtip]');
    const pid = t?.dataset.cbtip ?? null;
    tipBox.current = { x: e.clientX - 10, y: e.clientY - 14, width: 20, height: 28 };
    if (pid !== (tip?.pid ?? null)) setTip(pid ? { pid, holding: false } : null);
    else placeTip();
    if (pid !== hovered) setHovered(pid);
  });
  const wheelTurn = useEffectEvent(() => {
    if (Date.now() - lastWheel.current > 180) {
      lastWheel.current = Date.now();
      turnHeld();
    }
  });
  const turnKey = useEffectEvent(() => {
    if (press.current?.lifted) turnHeld();
    else if (o.hasSelection) o.turnSelected();
  });
  useEffect(() => {
    const move = (e: PointerEvent) => hoverMove(e);
    const menu = (e: Event) => {
      if (press.current?.lifted || Date.now() - lastDragEnd.current < 400) e.preventDefault();
    };
    const wheel = (e: WheelEvent) => {
      if (!press.current?.lifted) return;
      e.preventDefault();
      wheelTurn();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      turnKey();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('contextmenu', menu);
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('contextmenu', menu);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', key);
    };
  }, []);

  // The hook puts the ghost's top-left at the finger; this puts the held square there instead.
  const ghostOffset = drag ? { marginLeft: -(drag.gc + 0.5) * o.cell, marginTop: -(drag.gr + 0.5) * o.cell } : null;

  return { drag, hovered, tip, onPointerDown, ghostRef: pd.ghostRef, tipRef, ghostOffset };
}
