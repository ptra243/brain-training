// The word games type with the phone's own keyboard through one hidden text
// input. Its value is kept as whatever sits before the cursor; each change is
// turned into "delete n letters, then type these", which survives keyboards
// that autocorrect, predict or resend the whole word.

export interface TypedEdit {
  deleted: number;
  inserted: string;
}

export function typedEdit(before: string, after: string): TypedEdit {
  const a = before.toUpperCase();
  const b = after.toUpperCase();
  let k = 0;
  while (k < a.length && k < b.length && a[k] === b[k]) k++;
  return { deleted: a.length - k, inserted: b.slice(k).replace(/[^A-Z]/g, '') };
}
