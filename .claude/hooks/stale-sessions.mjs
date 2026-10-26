// SessionStart hook for docs/next-sessions.md. On a fresh session (startup or
// /clear, not resume or compact) it:
// - shows the owner a notice listing the session ideas, numbered, so they can
//   pick one ("start 3") instead of copying a starting prompt;
// - tells Claude to offer that menu when the first message doesn't already
//   name a task, and to run the picked entry's starting prompt;
// - flags entries untouched for STALE_DAYS or more and asks whether to keep,
//   update or drop them. It only reminds; Claude edits nothing unasked.
//
// Entries look like:
//   ## Session: <name>
//   Last touched: YYYY-MM-DD

import { readFileSync } from 'node:fs';
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

const now = Date.now();
const entries = [];
const stale = [];
for (const part of text.split(/^## Session: /m).slice(1)) {
  const name = part.split('\n', 1)[0].trim();
  const date = /^Last touched:\s*(\d{4}-\d{2}-\d{2})/m.exec(part)?.[1];
  const age = date ? Math.floor((now - Date.parse(date)) / DAY) : NaN;
  entries.push(name);
  if (!date) stale.push(`"${name}" (no Last touched date)`);
  else if (age >= STALE_DAYS) stale.push(`"${name}" (last touched ${date}, ${age} days ago)`);
}
if (!entries.length) process.exit(0);

const menu = entries.map((name, i) => `${i + 1}. ${name}`).join('\n');

let context = `NEXT SESSIONS MENU (from a hook). docs/next-sessions.md has these session ideas. The terminal CLI shows the user this numbered list, but the desktop app does not display hook messages, so assume they have NOT seen it:
${menu}

If the user's first message already names a task, just do that task; do not show the menu. If it is a greeting, vague, "menu", "next", or asks what to work on, reply with the numbered list (names only, one line each), a markdown link to docs/next-sessions.md, and a recommendation. The list is a ranked backlog, so recommend the first entry unless its heading names a blocker, in which case recommend the first unblocked one. One sentence, taken from that entry's Goal, saying why it is next. Then ask which to start. When they pick one (by number or name), first rename this session to that entry's heading so parallel sessions stay distinguishable. The owner asked for this rename. In Cursor, call rename_chat on cursor-app-control with that heading (discover the schema, then call it). In the desktop app, call mcp__ccd_session_mgmt__set_session_title, loaded with ToolSearch if deferred. Use whichever of those tools exists. Then read only that entry in docs/next-sessions.md (Grep for its "## Session:" heading, then Read with offset and limit), read its "Reads first" docs, set its "Last touched" date to today, and carry out its starting prompt as if they had typed it. Before the session finishes, update that entry (what is done, what is left, a starting prompt that picks up from there, its rank), or delete it if the work is finished, and commit that with the work.`;

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
