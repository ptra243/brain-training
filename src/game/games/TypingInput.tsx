import { useLayoutEffect, type RefObject } from 'react';
import { typedEdit } from '../../games/typing.ts';

interface Props {
  inputRef: RefObject<HTMLInputElement | null>;
  /** What sits before the cursor, so the keyboard's suggestions make sense. */
  value: string;
  onType: (deleted: number, inserted: string) => void;
  /** The keyboard's Enter / Go key. */
  onEnter?: () => void;
  onArrow?: (key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => void;
  onFocusChange?: (focused: boolean) => void;
  enterKeyHint?: 'go' | 'next' | 'done' | 'enter';
  label: string;
}

/**
 * A hidden text box laid over a word game's board. Tapping the board focuses
 * it, which brings up the phone's own keyboard (or takes a laptop's).
 * Put it inside an element with `position: relative`.
 */
export function TypingInput({ inputRef, value, onType, onEnter, onArrow, onFocusChange, enterKeyHint = 'enter', label }: Props) {
  // Keep the caret at the end, where the next letter goes.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el && document.activeElement === el) el.setSelectionRange(value.length, value.length);
  }, [inputRef, value]);

  return (
    <form
      className="typing"
      onSubmit={(e) => {
        e.preventDefault();
        onEnter?.();
      }}
    >
      <input
        ref={inputRef}
        className="typing-input"
        aria-label={label}
        value={value}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        enterKeyHint={enterKeyHint}
        onChange={(e) => {
          const { deleted, inserted } = typedEdit(value, e.target.value);
          if (deleted || inserted) onType(deleted, inserted);
        }}
        onKeyDown={(e) => {
          // Backspace in an empty box sends no change event.
          if (e.key === 'Backspace' && e.currentTarget.value === '') {
            e.preventDefault();
            onType(1, '');
          } else if (onArrow && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            onArrow(e.key);
          }
        }}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
      />
    </form>
  );
}
