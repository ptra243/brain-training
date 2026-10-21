// The case board's small UI state in one reducer: the undo stack, the note
// shown at the bottom and the pieces the cat circled. Pure; no React here.

import type { BoardSave } from './boardSave.ts';

export interface Toast {
  kind: 'bad' | 'good' | 'cat';
  text: string;
  quote?: string;
}

export const UNDO_LIMIT = 60;

export interface BoardUi {
  undo: readonly BoardSave[];
  toast: Toast | null;
  flagged: ReadonlySet<string>;
}

export type BoardUiAction =
  | { type: 'pushUndo'; save: BoardSave }
  | { type: 'popUndo' }
  | { type: 'say'; toast: Toast | null }
  | { type: 'flag'; ids: readonly string[] }
  | { type: 'unflag'; pid: string }
  | { type: 'clearFlags' };

export const initialBoardUi: BoardUi = { undo: [], toast: null, flagged: new Set() };

export function boardUiReducer(state: BoardUi, action: BoardUiAction): BoardUi {
  switch (action.type) {
    case 'pushUndo': {
      const undo = [...state.undo, action.save];
      return { ...state, undo: undo.length > UNDO_LIMIT ? undo.slice(undo.length - UNDO_LIMIT) : undo };
    }
    case 'popUndo':
      return state.undo.length ? { ...state, undo: state.undo.slice(0, -1) } : state;
    case 'say':
      return { ...state, toast: action.toast };
    case 'flag':
      return { ...state, flagged: new Set(action.ids) };
    case 'unflag': {
      if (!state.flagged.has(action.pid)) return state;
      const flagged = new Set(state.flagged);
      flagged.delete(action.pid);
      return { ...state, flagged };
    }
    case 'clearFlags':
      return { ...state, flagged: new Set() };
  }
}
