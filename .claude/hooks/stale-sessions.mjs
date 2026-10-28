// SessionStart hook for docs/next-sessions.md. On a fresh session (startup or
// /clear, not resume or compact) it:
// - shows the owner a notice listing the session ideas, numbered, so they can
//   pick one ("start 3") instead of copying a starting prompt;
// - tells Claude to follow the /next command (.claude/commands/next.md) when
//   the first message doesn't already name a task;
// - flags entries untouched for STALE_DAYS or more and asks whether to keep,
//   update or drop them;
// - flags .claude/handoff/ files older than HANDOFF_DAYS and asks whether to
//   delete them. It only reminds; Claude edits nothing unasked.
//
// Entries look like:
//   ## Session: <name>
//   Last touched: YYYY-MM-DD

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const STALE_DAYS = Number(process.env.SESSION_STALE_DAYS) || 14;
const DAY = 86_400_000;

let source = 'startup';
try {
  source = JSON.parse(readFileSync(0, 'utf8')).source || source;
} catch {
  // no stdin or not JSON: treat as a fresh start
}
if (source !== 'startup' && source !== 'clear') process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let text;
try {
  text = readFileSync(join(root, 'docs', 'next-sessions.md'), 'utf8');
} catch {
  process.exit(0);
}

// Exploratory ideas live in docs/someday-sessions.md: listed after the ranked
// entries, numbered on from them, and never flagged as stale.
let someday = '';
try {
  someday = readFileSync(join(root, 'docs', 'someday-sessions.md'), 'utf8');
} catch {
  // optional file
}

const headings = (source) =>
  source.split(/^## Session: /m).slice(1).map((part) => [part.split('\n', 1)[0].trim(), part]);

const now = Date.now();
const entries = [];
const stale = [];
for (const [name, part] of headings(text)) {
  const date = /^Last touched:\s*(\d{4}-\d{2}-\d{2})/m.exec(part)?.[1];
  const age = date ? Math.floor((now - Date.parse(date)) / DAY) : NaN;
  entries.push(name);
  if (!date) stale.push(`"${name}" (no Last touched date)`);
  else if (age >= STALE_DAYS) stale.push(`"${name}" (last touched ${date}, ${age} days ago)`);
}
if (!entries.length) process.exit(0);
const later = headings(someday).map(([name]) => name);

const menu =
  entries.map((name, i) => `${i + 1}. ${name}`).join('\n') +
  (later.length
    ? `\nLater ideas (docs/someday-sessions.md):\n` +
      later.map((name, i) => `${entries.length + i + 1}. ${name}`).join('\n')
    : '');

// How to show the menu and start an entry lives only in the /next command.
let context = `NEXT SESSIONS MENU (from a hook). The terminal CLI shows the user this numbered list, but the desktop app does not display hook messages, so assume they have NOT seen it:
${menu}

If the user's first message already names a task, just do that task; do not show the menu. If it is a greeting, vague, "menu", "next", a number or an entry name, or asks what to work on, follow .claude/commands/next.md (read it first) as if they had typed /next with that message as its argument.`;

// Handoff files are meant to be deleted once their task is committed.
const HANDOFF_DAYS = 3;
const handoffDir = join(root, '.claude', 'handoff');
let oldHandoffs = [];
try {
  oldHandoffs = readdirSync(handoffDir).filter(
    (name) => now - statSync(join(handoffDir, name)).mtimeMs >= HANDOFF_DAYS * DAY,
  );
} catch {
  // no handoff folder
}
if (oldHandoffs.length) {
  context += `

OLD HANDOFF FILES. .claude/handoff/ has ${oldHandoffs.length} entries untouched for ${HANDOFF_DAYS}+ days: ${oldHandoffs.join(', ')}. In your first reply, mention this in one line and ask whether to delete them (they are gitignored, so deleting is permanent). Delete nothing unasked.`;
}

if (stale.length) {
  context += `

STALE SESSION IDEAS. These entries have not been touched for ${STALE_DAYS}+ days:
${stale.map((s) => `- ${s}`).join('\n')}

In your first reply, briefly mention them (one or two lines) and ask whether to keep, update or drop each. Do not edit or delete anything until the user answers. If they say keep or update, change that entry's "Last touched" date to today.`;
}

const staleNote = stale.length
  ? `\n${stale.length} of them ${stale.length === 1 ? 'is' : 'are'} getting stale (${STALE_DAYS}+ days untouched).`
  : '';

process.stdout.write(
  JSON.stringify({
    systemMessage: `Next sessions: docs/next-sessions.md. Recommended: 1. ${entries[0]} (the list is ranked; this is next, unless its heading names a blocker). Say "start <number>" to run one, or type anything else:\n${menu}${staleNote}`,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
  }),
);
