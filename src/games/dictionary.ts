// Words the word games accept as guesses: public/words.txt, WORD_LENGTH (5) letters,
// built by scripts/build-words.ts. It's large, so it's fetched the first time
// a word game opens rather than bundled.

export type Dictionary = ReadonlySet<string>;

export function parseWords(text: string): Set<string> {
  return new Set(text.split(/\r?\n/).filter(Boolean));
}

/**
 * Whether to accept a guess. The answer always counts, and until the list has
 * loaded (or if it failed to) any word does, so she is never blocked by it.
 */
export function isAllowedGuess(guess: string, answer: string, dictionary: Dictionary | null): boolean {
  return !dictionary || guess === answer || dictionary.has(guess);
}

let loading: Promise<Dictionary | null> | null = null;

/** Fetch the list once per session. Resolves to null if it can't be loaded. */
export function loadDictionary(): Promise<Dictionary | null> {
  loading ??= fetch(`${import.meta.env.BASE_URL}words.txt`)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`words.txt: ${r.status}`))))
    .then(parseWords)
    .catch(() => {
      loading = null; // try again next time a game opens
      return null;
    });
  return loading;
}
