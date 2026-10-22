// UserPromptSubmit hook: when the session transcript gets big, remind Claude to
// recommend splitting the session. It only reminds. It never writes handoff
// files or changes anything; Claude suggests, the owner decides.
//
// Fires once the context (the last reply's input plus cache tokens: tools,
// system prompt and the whole conversation) passes THRESHOLD tokens, then again
// each time it has grown by GROWTH since the last reminder. Every turn re-reads
// the whole context, so this tracks what a turn costs. Tune with
// SESSION_REMIND_TOKENS. Transcripts under MIN_BYTES are skipped unparsed: they
// can't hold that much conversation.
// The reminder carries token totals summed from the transcript's usage fields
// (and the subagent transcripts beside it), so the "Why sessions ran long" line
// can quote them.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

const THRESHOLD = Number(process.env.SESSION_REMIND_TOKENS) || 250_000;
const MIN_BYTES = 400_000;
const GROWTH = 1.5;

const REMINDER = `SESSION LENGTH REMINDER (from a hook). This session's context is large and every turn re-reads all of it (see "Token budget" in CLAUDE.md).

Answer the user's message as normal first. Then, at the end of your reply, add a short note recommending they split the session. Do NOT write any handoff files, edit anything, or start the split yourself; only recommend, and offer to write the handoff docs if they want them.

In the note:
1. Say what topics this session has covered and whether they have drifted from the original one.
2. List the handoff documents worth writing. For each: a file name (docs/<topic>.md, or a section in the Build Plan doc), and one line on what goes in it (settled decisions, open questions, rules, draft content). Only decisions that exist solely in this chat need one; skip anything already in the repo.
3. List the new sessions to start. For each: what it does, which handoff docs it should read first, and a one-line starting prompt. Keep design decisions in a main session; say when a well-defined piece could go to the implementer agent.
4. Name in one line what made this session large (for example bundled briefs, rework rounds, follow-ups piled onto one agent). When the split is written up, add that line, dated and with the token totals below, to "Why sessions ran long" at the end of docs/next-sessions.md.
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
if (size < MIN_BYTES) process.exit(0);

const main = usageOf(transcript);
if (main.context < THRESHOLD) process.exit(0);

const stateFile = join(tmpdir(), `claude-session-length-${String(id).replace(/[^\w-]/g, '')}.json`);
let last = 0;
try {
  last = JSON.parse(readFileSync(stateFile, 'utf8')).context ?? 0;
} catch {
  // first reminder for this session
}
if (last && main.context < last * GROWTH) process.exit(0);

try {
  writeFileSync(stateFile, JSON.stringify({ context: main.context }));
} catch {
  // reminding again next prompt is harmless
}

// Sums usage over a transcript. One reply can span several lines (one per
// content block) carrying the same usage, so count each message id once.
function usageOf(file) {
  const total = { replies: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, context: 0 };
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return total;
  }
  const seen = new Set();
  for (const line of text.split('\n')) {
    if (!line.includes('"usage"')) continue;
    let message;
    try {
      message = JSON.parse(line).message;
    } catch {
      continue;
    }
    const usage = message?.usage;
    if (!usage || seen.has(message.id)) continue;
    seen.add(message.id);
    total.replies++;
    total.input += usage.input_tokens ?? 0;
    total.cacheRead += usage.cache_read_input_tokens ?? 0;
    total.cacheWrite += usage.cache_creation_input_tokens ?? 0;
    total.output += usage.output_tokens ?? 0;
    total.context =
      (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
  }
  return total;
}

const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
const describe = (t) =>
  `${t.replies} replies, ${fmt(t.cacheRead)} read from cache, ${fmt(t.cacheWrite)} written to cache, ` +
  `${fmt(t.input)} uncached input, ${fmt(t.output)} output`;

let tokens = `Main session: ${describe(main)}; context now ${fmt(main.context)}.`;
// Subagent transcripts live in <session id>/subagents/ next to the main one.
const subDir = join(dirname(transcript), basename(transcript, '.jsonl'), 'subagents');
try {
  const files = readdirSync(subDir).filter((f) => f.endsWith('.jsonl'));
  if (files.length) {
    const sub = { replies: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
    for (const f of files) {
      const t = usageOf(join(subDir, f));
      for (const k of Object.keys(sub)) sub[k] += t[k];
    }
    tokens += ` Subagents (${files.length}): ${describe(sub)}.`;
  }
} catch {
  // no subagents yet
}

process.stdout.write(
  JSON.stringify({
    systemMessage: 'This session is getting long. Claude will suggest how to split it.',
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: `${REMINDER}\n\nToken totals so far (transcript ${fmt(size)}B): ${tokens}`,
    },
  }),
);
