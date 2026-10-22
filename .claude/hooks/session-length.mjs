// UserPromptSubmit hook: when the session transcript gets big, remind Claude to
// recommend splitting the session. It only reminds. It never writes handoff
// files or changes anything; Claude suggests, the owner decides.
//
// Fires once the transcript passes THRESHOLD bytes, then again each time it has
// grown by GROWTH since the last reminder. Tune with SESSION_REMIND_BYTES.

import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const THRESHOLD = Number(process.env.SESSION_REMIND_BYTES) || 1_000_000;
const GROWTH = 1.5;

const REMINDER = `SESSION LENGTH REMINDER (from a hook). This session's context is large and every turn re-reads all of it (see "Token budget" in CLAUDE.md).

Answer the user's message as normal first. Then, at the end of your reply, add a short note recommending they split the session. Do NOT write any handoff files, edit anything, or start the split yourself; only recommend, and offer to write the handoff docs if they want them.

In the note:
1. Say what topics this session has covered and whether they have drifted from the original one.
2. List the handoff documents worth writing. For each: a file name (docs/<topic>.md, or a section in the Build Plan doc), and one line on what goes in it (settled decisions, open questions, rules, draft content). Only decisions that exist solely in this chat need one; skip anything already in the repo.
3. List the new sessions to start. For each: what it does, which handoff docs it should read first, and a one-line starting prompt. Keep design decisions in a main session; say when a well-defined piece could go to the implementer agent.
4. Name in one line what made this session large (for example bundled briefs, rework rounds, follow-ups piled onto one agent). When the split is written up, add that line, dated, to "Why sessions ran long" at the end of docs/next-sessions.md.
5. Keep the whole note under about 12 lines. If the user has already declined a split this session, say it in one line at most.`;

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const { transcript_path: transcript, session_id: id } = input;
if (!transcript || !id) process.exit(0);

let size;
try {
  size = statSync(transcript).size;
} catch {
  process.exit(0);
}
if (size < THRESHOLD) process.exit(0);

const stateFile = join(tmpdir(), `claude-session-length-${String(id).replace(/[^\w-]/g, '')}.json`);
let last = 0;
try {
  last = JSON.parse(readFileSync(stateFile, 'utf8')).size ?? 0;
} catch {
  // first reminder for this session
}
if (last && size < last * GROWTH) process.exit(0);

try {
  writeFileSync(stateFile, JSON.stringify({ size }));
} catch {
  // reminding again next prompt is harmless
}

process.stdout.write(
  JSON.stringify({
    systemMessage: 'This session is getting long. Claude will suggest how to split it.',
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: REMINDER },
  }),
);
