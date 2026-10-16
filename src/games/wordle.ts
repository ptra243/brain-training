export type LetterScore = 'hit' | 'near' | 'miss';

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/**
 * Standard Wordle scoring, including repeated letters: exact matches first,
 * then each remaining answer letter can mark at most one 'near'.
 */
export function scoreGuess(guess: string, answer: string): LetterScore[] {
  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  const result: LetterScore[] = Array(g.length).fill('miss');
  const left = new Map<string, number>();
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) result[i] = 'hit';
    else left.set(a[i], (left.get(a[i]) ?? 0) + 1);
  }
  for (let i = 0; i < g.length; i++) {
    if (result[i] === 'hit') continue;
    const n = left.get(g[i]) ?? 0;
    if (n > 0) {
      result[i] = 'near';
      left.set(g[i], n - 1);
    }
  }
  return result;
}

/** Best score seen so far for each letter, for colouring the keyboard. */
export function keyboardState(guesses: readonly string[], answer: string): Record<string, LetterScore> {
  const rank: Record<LetterScore, number> = { miss: 0, near: 1, hit: 2 };
  const keys: Record<string, LetterScore> = {};
  for (const guess of guesses) {
    scoreGuess(guess, answer).forEach((s, i) => {
      const letter = guess[i].toUpperCase();
      if (!keys[letter] || rank[s] > rank[keys[letter]]) keys[letter] = s;
    });
  }
  return keys;
}
