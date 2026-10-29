/** The UI's random in [0, 1), from the browser's crypto (the engine stays seeded, never `Math.random()`). */
export const randomUnit = (): number => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
