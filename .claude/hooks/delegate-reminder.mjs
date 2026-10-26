// PreToolUse hook (Edit|Write|MultiEdit|Task|Agent): before the main session
// edits its THRESHOLD-th distinct app code file itself, stop that one edit and
// ask it to delegate to the `implementer` agent or say why not. The next edit
// after that goes through. Once the session has briefed an implementer it stays
// quiet. Only files under src/, e2e/ and scripts/ count; scratchpad scripts,
// docs, mockups and handoff files don't.
//
// Fires again every THRESHOLD new files. Tune with DELEGATE_REMIND_FILES.

import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, relative, isAbsolute, resolve } from 'node:path';

const THRESHOLD = Number(process.env.DELEGATE_REMIND_FILES) || 3;
const CODE = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.json', '.html']);
const APP_DIRS = ['src', 'e2e', 'scripts'];

const REMINDER = `DELEGATION CHECK (from a hook; this edit was held back once). This would be the {{n}}th different app code file you edit yourself in this session. See "Token budget" in CLAUDE.md.

A request the owner typed directly counts the same as a next-sessions entry. If the rest of this change is well-defined (you can describe it in a few sentences, or it is tests, CSS, copy, content lists or a bug fix with a known cause), hand it to the \`implementer\` agent with a full brief: files, behaviour, how to test. If you are still working out the design, or only a line or two is left, retry this same edit; it will go through. Either way, say in one line which you chose and why.`;

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

// Subagents (the implementer itself) are never held back.
if (input.agent_id) process.exit(0);

const id = input.session_id;
if (!id) process.exit(0);

const stateFile = join(tmpdir(), `claude-delegate-${String(id).replace(/[^\w-]/g, '')}.json`);
let state = { files: [], reminded: 0, delegated: false };
try {
  state = { ...state, ...JSON.parse(readFileSync(stateFile, 'utf8')) };
} catch {
  // first counted call in this session
}
const save = () => {
  try {
    writeFileSync(stateFile, JSON.stringify(state));
  } catch {
    // counting again next call is harmless
  }
};

if (input.tool_name === 'Task' || input.tool_name === 'Agent') {
  if (input.tool_input?.subagent_type === 'implementer') {
    state.delegated = true;
    save();
  }
  process.exit(0);
}

if (state.delegated) process.exit(0);

const file = input.tool_input?.file_path;
if (!file || !CODE.has(extname(file).toLowerCase())) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd;
if (!root) process.exit(0);
const rel = relative(root, resolve(root, file)).replace(/\\/g, '/');
if (isAbsolute(rel) || rel.startsWith('../')) process.exit(0);
if (!APP_DIRS.includes(rel.split('/')[0])) process.exit(0);

const key = rel.toLowerCase();
if (state.files.includes(key)) process.exit(0);

const n = state.files.length + 1;
if (n >= THRESHOLD && n >= state.reminded + THRESHOLD && !state.pending) {
  state.pending = true;
  save();
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: REMINDER.replace('{{n}}', String(n)),
      },
    }),
  );
  process.exit(0);
}

if (state.pending) {
  state.reminded = n;
  delete state.pending;
}
state.files.push(key);
save();
