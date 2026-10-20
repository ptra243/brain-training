import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { leftovers, lineBetween, wordAt, type Pos, type WordSearchPuzzle } from '../../games/wordsearch.ts';
import { TypingInput } from './TypingInput.tsx';
import { focusTyping } from './typing.ts';
import type { WordSearchData } from './saveData.ts';
import type { GameProps } from './types.ts';

const same = (a: Pos | null, b: Pos | null) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

/** The grid square under a point, from the cells' data attributes. */
function cellAt(x: number, y: number): Pos | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-r]');
  return el ? [Number(el.dataset.r), Number(el.dataset.c)] : null;
}

export function WordSearchGame({ puzzle, data, finished, onChange, onFinish }: GameProps<WordSearchPuzzle, WordSearchData>) {
  const [start, setStart] = useState<Pos | null>(null);
  const [hover, setHover] = useState<Pos | null>(null);
  const [message, setMessage] = useState('');
  const [guess, setGuess] = useState('');
  const [guessFocused, setGuessFocused] = useState(false);
  const guessRef = useRef<HTMLInputElement>(null);
  const press = useRef<{ at: Pos; fresh: boolean } | null>(null);
  const { size, grid, words, answer } = puzzle;
  const found = new Set(data.found);
  const allFound = words.every((w) => found.has(w.word));

  const key = (p: Pos) => `${p[0]},${p[1]}`;
  const foundCells = new Set(words.filter((w) => found.has(w.word)).flatMap((w) => w.cells.map(key)));
  const secretCells = new Set(leftovers(puzzle).map(key));
  const preview = start && hover && !same(start, hover) ? lineBetween(start, hover) : null;
  const previewCells = new Set((preview ?? (start ? [start] : [])).map(key));

  const choose = (a: Pos, b: Pos) => {
    setStart(null);
    setHover(null);
    const line = lineBetween(a, b);
    const hit = line && wordAt(puzzle, line);
    if (!hit) return setMessage(line ? 'No word there.' : 'Words run in straight lines.');
    if (found.has(hit.word)) return setMessage(`You already have ${hit.word}.`);
    setMessage('');
    const next = { found: [...data.found, hit.word] };
    if (words.every((w) => next.found.includes(w.word))) onFinish('won', next);
    else onChange(next);
  };

  // Tap the first letter then the last, or drag from one to the other.
  // One handler for every square, reading its position from data-r / data-c.
  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (finished) return;
    const at: Pos = [Number(e.currentTarget.dataset.r), Number(e.currentTarget.dataset.c)];
    e.preventDefault();
    setMessage('');
    press.current = { at, fresh: !start };
    setHover(null);
    if (!start) setStart(at);
  };
  const move = (e: ReactPointerEvent) => {
    const p = press.current;
    if (!p) return;
    const at = cellAt(e.clientX, e.clientY);
    if (!at || same(at, hover)) return;
    // A drag runs from where this press began, so the highlight matches what she'll get.
    if (!same(at, p.at) && !same(start, p.at)) setStart(p.at);
    setHover(at);
  };
  const up = (e: ReactPointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p || finished) return;
    // Lifting just off the grid or between squares keeps the last square she was on,
    // so a word on the edge counts when it's highlighted.
    const at = cellAt(e.clientX, e.clientY) ?? hover ?? p.at;
    if (!same(at, p.at)) return choose(p.at, at); // a drag
    if (p.fresh) return; // first tap: wait for the second
    if (same(at, start)) {
      setStart(null);
      setHover(null);
      return;
    }
    if (start) choose(start, at);
  };

  const typeGuess = (deleted: number, inserted: string) => {
    setMessage('');
    setGuess((g) => (g.slice(0, Math.max(0, g.length - deleted)) + inserted).slice(0, answer.length));
  };
  const checkGuess = () => {
    if (guess.length < answer.length) return setMessage(`The hidden word has ${answer.length} letters.`);
    if (guess !== answer) return setMessage(`Not ${guess}. Keep looking.`);
    onFinish('won', data);
  };

  return (
    <div className="wordsearch">
      <p className="hint dark">
        Find the listed words: tap the first letter, then the last, or drag across. The letters left over, read from the
        top, spell what the body was lying by.
      </p>
      <div
        className="ws-grid"
        role="grid"
        aria-label="Word search"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          press.current = null;
          setHover(null);
        }}
      >
        {grid.map((row, r) =>
          [...row].map((letter, c) => {
            const k = `${r},${c}`;
            if (letter === '.') return <span key={k} className="ws-cell blank" aria-hidden="true" />;
            const reveal = (finished || allFound) && secretCells.has(k);
            return (
              <button
                key={k}
                data-r={r}
                data-c={c}
                className={`ws-cell ${foundCells.has(k) ? 'found' : ''} ${previewCells.has(k) ? 'picking' : ''} ${reveal ? 'secret' : ''}`}
                aria-label={`${letter}, row ${r + 1}, column ${c + 1}${same(start, [r, c]) ? ', selected' : ''}`}
                onPointerDown={down}
                disabled={!!finished}
              >
                {letter}
              </button>
            );
          }),
        )}
      </div>
      <p className="game-message" role="status">
        {finished ? `The leftover letters spell ${answer}.` : message || `Found ${found.size} of ${words.length}.`}
      </p>
      <ul className="ws-words">
        {words.map((w) => (
          <li key={w.word} className={found.has(w.word) ? 'found' : ''}>
            {w.word}
          </li>
        ))}
      </ul>
      {!finished && (
        <section className="card ws-guess">
          <h2>Know the hidden word already?</h2>
          <div className="typing-host">
            <div className="ws-guess-boxes" onClick={() => focusTyping(guessRef)} style={{ gridTemplateColumns: `repeat(${answer.length}, minmax(0, 1fr))` }}>
              {Array.from({ length: answer.length }, (_, i) => (
                <span key={i} className={`ws-guess-box ${guessFocused && i === Math.min(guess.length, answer.length - 1) ? 'cursor' : ''}`}>
                  {guess[i] ?? ''}
                </span>
              ))}
            </div>
            <TypingInput
              inputRef={guessRef}
              value={guess}
              onType={typeGuess}
              onEnter={checkGuess}
              onFocusChange={setGuessFocused}
              enterKeyHint="go"
              label="The hidden word"
            />
          </div>
          <button className="secondary" onPointerDown={(e) => e.preventDefault()} onClick={checkGuess}>
            Check word
          </button>
        </section>
      )}
    </div>
  );
}
