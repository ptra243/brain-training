/** When each round's body is found. */
export const ROUND_TIMES = ['9pm', 'Midnight', '3am'];

export const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

/** The final puzzle before she accuses: the grid alone, or the jigsaw (the end board) as well. Campaigns pick one. */
export type Finish = 'grid' | 'jigsaw';
export const FINISHES: readonly Finish[] = ['grid', 'jigsaw'];
export const FINISH_LABEL: Record<Finish, string> = { grid: 'Grid', jigsaw: 'Jigsaw' };
export const FINISH_HINT: Record<Finish, string> = {
  grid: 'Work out who was where on the map and grid, then accuse.',
  jigsaw: 'A Jigsaw tab instead of the grid: fit your clues together as pieces to see who is still unaccounted for before you accuse.',
};
