// Builds public/words.txt, the WORD_LENGTH-letter words (Wordle's length, the
// only game that reads this list) accepted as guesses, from the `word-list`
// package (MIT, Sindre Sorhus). The output is committed so cloud sessions,
// which can't install packages, can use it. It's a big list full of obscure
// words: fine for accepting guesses, not for choosing answers or setting
// targets. Run with: npm run build-words
import { readFileSync, writeFileSync } from 'node:fs';
import wordListPath from 'word-list';
import { WORD_LENGTH } from '../src/games/wordle.ts';

const words = readFileSync(wordListPath, 'utf8')
  .split('\n')
  .filter((w) => w.length === WORD_LENGTH && /^[a-z]+$/.test(w))
  .map((w) => w.toUpperCase());

writeFileSync(new URL('../public/words.txt', import.meta.url), `${words.join('\n')}\n`);
console.log(`Wrote ${words.length} words.`);
