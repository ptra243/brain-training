// Small wording helpers shared by the engine and the screens.

/** Upper-case the first letter. */
export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "The Butler" -> "the Butler", for use in the middle of a sentence. */
export const midSentence = (name: string) => name.replace(/^The /, 'the ');

/** Replace {key} placeholders; unknown keys are left as the bare key name. */
export const fillIn = (template: string, fill: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => fill[k] ?? k);
