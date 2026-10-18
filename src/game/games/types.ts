export interface GameProps<P, D> {
  puzzle: P;
  data: D;
  /** Set once the game is won or revealed; the board is then read-only. */
  finished: 'won' | 'revealed' | null;
  /** Name of the cat who gives hints on this case. */
  helper?: string;
  /** Save in-progress state. */
  onChange: (data: D) => void;
  /** End the game. 'revealed' means the answer was shown rather than found. */
  onFinish: (status: 'won' | 'revealed', data: D) => void;
}
