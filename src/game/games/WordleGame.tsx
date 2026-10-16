import { useEffect, useState } from 'react';
import { MAX_GUESSES, WORD_LENGTH, keyboardState, scoreGuess } from '../../games/wordle.ts';
import type { GameProps } from './types.ts';

export interface WordleData {
  guesses: string[];
}

export interface WordlePuzzle {
  answer: string;
  teaser: string;
}

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export const wordleInitial = (): WordleData => ({ guesses: [] });
export const wordleSolved = (p: WordlePuzzle): WordleData => ({ guesses: [p.answer] });

export function WordleGame({ puzzle, data, finished, onChange, onFinish }: GameProps<WordlePuzzle, WordleData>) {
  const [typing, setTyping] = useState('');
  const [message, setMessage] = useState('');
  const { guesses } = data;
  const keys = keyboardState(guesses, puzzle.answer);

  const press = (key: string) => {
    if (finished) return;
    setMessage('');
    if (key === 'BACK') return setTyping((t) => t.slice(0, -1));
    if (key === 'ENTER') {
      if (typing.length < WORD_LENGTH) return setMessage(`Type ${WORD_LENGTH} letters first.`);
      const next = { guesses: [...guesses, typing] };
      setTyping('');
      if (typing === puzzle.answer) return onFinish('won', next);
      if (next.guesses.length >= MAX_GUESSES) return onFinish('revealed', next);
      return onChange(next);
    }
    if (/^[A-Z]$/.test(key) && typing.length < WORD_LENGTH) setTyping((t) => t + key);
  };

  // A physical keyboard works too (handy on a laptop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') press('ENTER');
      else if (e.key === 'Backspace') press('BACK');
      else if (/^[a-z]$/i.test(e.key)) press(e.key.toUpperCase());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    if (r < guesses.length) return { letters: guesses[r], scores: scoreGuess(guesses[r], puzzle.answer) };
    if (r === guesses.length && !finished) return { letters: typing, scores: null };
    return { letters: '', scores: null };
  });

  return (
    <div className="wordle">
      <p className="teaser-line">{puzzle.teaser}</p>
      <div className="wordle-board" role="grid" aria-label="Guesses">
        {rows.map((row, r) => (
          <div key={r} className="wordle-row" role="row">
            {Array.from({ length: WORD_LENGTH }, (_, i) => {
              const letter = row.letters[i] ?? '';
              const score = row.scores?.[i];
              return (
                <span
                  key={i}
                  role="gridcell"
                  className={`wordle-tile ${score ?? (letter ? 'typed' : '')}`}
                  aria-label={letter ? `${letter}${score ? `, ${score === 'hit' ? 'right place' : score === 'near' ? 'wrong place' : 'not in word'}` : ''}` : 'empty'}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <p className="game-message" role="status">
        {finished
          ? guesses.at(-1) === puzzle.answer
            ? `Got it in ${guesses.length}.`
            : `The word was ${puzzle.answer}.`
          : message}
      </p>
      {!finished && (
        <div className="keyboard">
          {ROWS.map((row, i) => (
            <div key={row} className="key-row">
              {i === 2 && (
                <button className="key wide" onClick={() => press('ENTER')}>
                  Enter
                </button>
              )}
              {row.split('').map((k) => (
                <button key={k} className={`key ${keys[k] ?? ''}`} onClick={() => press(k)}>
                  {k}
                </button>
              ))}
              {i === 2 && (
                <button className="key wide" aria-label="Delete letter" onClick={() => press('BACK')}>
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
