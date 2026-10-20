import { useEffect, useRef, useState } from 'react';
import { isAllowedGuess, loadDictionary, type Dictionary } from '../../games/dictionary.ts';
import { MAX_GUESSES, WORD_LENGTH, keyboardState, scoreGuess } from '../../games/wordle.ts';
import { TypingInput, focusTyping, hasFinePointer } from './TypingInput.tsx';
import type { GameProps } from './types.ts';

export interface WordleData {
  guesses: string[];
}

export interface WordlePuzzle {
  answer: string;
  /** The "body was found by" line; Play cases show a half-heard clue instead. */
  teaser?: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const wordleInitial = (): WordleData => ({ guesses: [] });
export const wordleSolved = (p: WordlePuzzle): WordleData => ({ guesses: [p.answer] });

export function WordleGame({ puzzle, data, finished, onChange, onFinish }: GameProps<WordlePuzzle, WordleData>) {
  const [typing, setTyping] = useState('');
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState(false);
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { guesses } = data;

  useEffect(() => {
    let live = true;
    loadDictionary().then((d) => live && setDictionary(d));
    if (!finished && hasFinePointer()) focusTyping(inputRef);
    return () => {
      live = false;
    };
  }, []); // once, when the game opens
  const letters = keyboardState(guesses, puzzle.answer);

  const type = (deleted: number, inserted: string) => {
    if (finished) return;
    setMessage('');
    setTyping((t) => (t.slice(0, Math.max(0, t.length - deleted)) + inserted).slice(0, WORD_LENGTH));
  };

  const submit = () => {
    if (finished) return;
    if (typing.length < WORD_LENGTH) return setMessage(`Type ${WORD_LENGTH} letters first.`);
    if (!isAllowedGuess(typing, puzzle.answer, dictionary)) return setMessage(`${typing} isn't in the word list.`);
    const next = { guesses: [...guesses, typing] };
    setTyping('');
    if (typing === puzzle.answer) return onFinish('won', next);
    if (next.guesses.length >= MAX_GUESSES) return onFinish('revealed', next);
    return onChange(next);
  };

  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    if (r < guesses.length) return { letters: guesses[r], scores: scoreGuess(guesses[r], puzzle.answer), current: false };
    if (r === guesses.length && !finished) return { letters: typing, scores: null, current: true };
    return { letters: '', scores: null, current: false };
  });

  return (
    <div className="wordle">
      {puzzle.teaser && <p className="teaser-line">{puzzle.teaser}</p>}
      <div className="typing-host">
        <div className="wordle-board" role="grid" aria-label="Guesses">
          {rows.map((row, r) => (
            <div
              key={r}
              className={`wordle-row ${row.current ? 'current' : ''} ${row.current && focused ? 'active' : ''}`}
              role="row"
              onClick={row.current ? () => focusTyping(inputRef) : undefined}
            >
              {Array.from({ length: WORD_LENGTH }, (_, i) => {
                const letter = row.letters[i] ?? '';
                const score = row.scores?.[i];
                const cursor = row.current && focused && i === Math.min(typing.length, WORD_LENGTH - 1);
                return (
                  <span
                    key={i}
                    role="gridcell"
                    className={`wordle-tile ${score ?? (letter ? 'typed' : '')} ${cursor ? 'cursor' : ''}`}
                    aria-label={letter ? `${letter}${score ? `, ${score === 'hit' ? 'right place' : score === 'near' ? 'wrong place' : 'not in word'}` : ''}` : 'empty'}
                  >
                    {letter}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        {!finished && (
          <TypingInput
            inputRef={inputRef}
            value={typing}
            onType={type}
            onEnter={submit}
            onFocusChange={setFocused}
            enterKeyHint="go"
            label="Your guess"
          />
        )}
      </div>
      <p className="game-message" role="status">
        {finished
          ? guesses.at(-1) === puzzle.answer
            ? `Got it in ${guesses.length}.`
            : `The word was ${puzzle.answer}.`
          : message || (focused ? '' : 'Tap the empty row to type.')}
      </p>
      {!finished && (
        <button
          className="primary check-word"
          // Keep the keyboard up: don't let the button take focus.
          onPointerDown={(e) => e.preventDefault()}
          onClick={submit}
        >
          Check word
        </button>
      )}
      <div className="letter-strip" aria-label="Letters tried">
        {ALPHABET.map((l) => (
          <span key={l} className={`letter-chip ${letters[l] ?? ''}`}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
