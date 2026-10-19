// SessionStart hook: if an entry in docs/next-sessions.md has not been touched
// for STALE_DAYS or more, tell Claude to mention it and ask what to do. It only
// reminds; Claude does not edit or delete entries without being asked.
//
// Entries look like:
//   ## Session: <name>
//   Last touched: YYYY-MM-DD

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STALE_DAYS = Number(process.env.SESSION_STALE_DAYS) || 14;
const DAY = 86_400_000;

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let text;
try {
  text = readFileSync(join(root, 'docs', 'next-sessions.md'), 'utf8');
} catch {
  process.exit(0);
}

const now = Date.now();
const stale = [];
for (const part of text.split(/^## Session: /m).slice(1)) {
  const name = part.split('\n', 1)[0].trim();
  const date = /^Last touched:\s*(\d{4}-\d{2}-\d{2})/m.exec(part)?.[1];
  const age = date ? Math.floor((now - Date.parse(date)) / DAY) : NaN;
  if (!date) stale.push(`"${name}" (no Last touched date)`);
  else if (age >= STALE_DAYS) stale.push(`"${name}" (last touched ${date}, ${age} days ago)`);
}
if (!stale.length) process.exit(0);

const message = `STALE SESSION IDEAS (from a hook). These entries in docs/next-sessions.md have not been touched for ${STALE_DAYS}+ days:
${stale.map((s) => `- ${s}`).join('\n')}

In your first reply, briefly mention them (one or two lines) and ask whether to keep, update or drop each. Do not edit or delete anything until the user answers. If they say keep or update, change that entry's "Last touched" date to today.`;

process.stdout.write(
  JSON.stringify({
    systemMessage: `${stale.length} session idea${stale.length === 1 ? '' : 's'} in docs/next-sessions.md ${stale.length === 1 ? 'is' : 'are'} getting stale.`,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: message },
  }),
);
