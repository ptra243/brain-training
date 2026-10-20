// PostToolUse hook (Edit|Write): count the distinct code files the main
// session has edited itself, and remind Claude to hand the work to the
// `implementer` agent. Markdown and other docs don't count. It only reminds.
//
// Fires when the count reaches THRESHOLD, then again every THRESHOLD new files.
// Tune with DELEGATE_REMIND_FILES.

import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

const THRESHOLD = Number(process.env.DELEGATE_REMIND_FILES) || 3;
const CODE = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.json', '.html']);

const REMINDER = `DELEGATION REMINDER (from a hook). You have edited {{n}} different code files yourself in this session. See "Token budget" in CLAUDE.md.

Every turn here runs on the main model and re-reads the whole context. If the remaining work is well-defined (you can describe it in a few sentences, or it is tests, CSS, copy, content lists or a bug fix with a known cause), stop editing and hand it to the \`implementer\` agent with a full brief: files, behaviour, how to test. Keep working directly only if you are still working out the design. Say in one line which you chose.`;

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

// Edits made by a subagent (the implementer itself) don't count.
if (input.agent_id) process.exit(0);

const file = input.tool_input?.file_path;
const id = input.session_id;
if (!file || !id || !CODE.has(extname(file).toLowerCase())) process.exit(0);

const stateFile = join(tmpdir(), `claude-delegate-${String(id).replace(/[^\w-]/g, '')}.json`);
let state = { files: [], reminded: 0 };
try {
  state = JSON.parse(readFileSync(stateFile, 'utf8'));
} catch {
  // first code edit in this session
}

const norm = String(file).replace(/[\\]/g, '/');
if (!state.files.includes(norm)) state.files.push(norm);
const n = state.files.length;

const due = n >= THRESHOLD && n >= state.reminded + THRESHOLD;
if (due) state.reminded = n;
try {
  writeFileSync(stateFile, JSON.stringify(state));
} catch {
  // counting again next edit is harmless
}
if (!due) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: REMINDER.replace('{{n}}', String(n)),
    },
  }),
);
