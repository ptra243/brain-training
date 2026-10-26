import type { CardReading } from '../../engine/types.ts';

export const reading = (neutral: readonly string[], bound: readonly string[], threads: readonly (readonly string[])[]): CardReading => ({
  lines: { neutral, bound },
  threads,
});
