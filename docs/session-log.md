# Session log

Moved out of `docs/next-sessions.md` on 2026-10-26 so the menu file stays short. The weekly
"Session hygiene review" entry there reads this file.

## Review checklist

When: once a week at most, or once "Why sessions ran long" has three or more new lines since the last
review. Not in between. Time box: one short session, no more than about six steps. When the checklist
is done, stop; don't audit the audit.

1. Run `/context` in a fresh session and note the startup tokens (it was about 81k on 2026-10-23: tools 38k, MCP 21k, memory 5k). A rise of 10k or more means something new is loading.
2. Check the weekly usage figure and whether any limit was hit.
3. Skim the new "Why sessions ran long" lines for a cause that appears twice or more.
4. Change a rule only for a repeat cause; anything seen once stays a note.
5. Note what you reviewed and the date, then close the session.
Also check whether the 250k-token reminder fires at the right moment (it was a 1 MB transcript size
until 2026-10-23; tune it with `SESSION_REMIND_TOKENS`). Compare the token totals and the minutes the dated lines quote, not just their causes: a session can be cheap in tokens and still slow (long agent runs, full checks), and the fixes differ. Use the `explain-usage` skill on a session only if a cause is unclear. Mark the
lines you reviewed with the date.

## Why sessions ran long

One dated line per long session, added when the split is written up (the session-length hook asks for
it). Not a menu entry; the "Session hygiene review" entry in `docs/next-sessions.md` reads it.
Each line should also say where the minutes went: per agent run (the task notification gives its
duration), each full check, and how many ran in order versus alongside. Older lines have tokens only.

- 2026-10-22, Nosing around grid and dog: one session did design plus four builds. Briefs bundled
  engine and UI, the dog tuning took three rounds instead of one sweep, and follow-ups were piled onto
  a 200k-token agent. Rules added: small briefs, measure first, split after the first piece lands,
  reminder lowered to 700 KB.
- 2026-10-22, Faster e2e from saved state: the timing experiments (five full runs and a trace) and
  the review of the agent's work ran in the main session instead of a fresh one.
- 2026-10-22, Portraits (player and cat mockups): reading the Design canvas (its type instructions
  and the full reference board) filled about 90k of a 111k context before any drawing; two drawing
  rounds. Totals: 14 replies, 1.2M read from cache, 56k written, 13k output, transcript 1.1 MB.
- 2026-10-22, Nosing board polish (icons, key, encounter card, shorter boards): the board code was
  read in the main session before the design questions, and two implementer hand-backs were reviewed
  here on one task. Totals: main 22 replies, 2.1M read from cache, 60k written, 14k output, context
  115k; subagents (2) 60 replies, 4.4M read from cache, 165k written; transcript 1.0 MB.
- 2026-10-23, Houses (plumbing, nosing per house, rotation and new shapes): the main session stayed small
  but the wall clock did not. Minutes: plumbing agent 6, nosing-per-house agent 24.5 (61 tool calls, 105k
  tokens), `check-cases --full` 7.6, rotation/long house/T lodge agent 49.6 (75 tool calls, 123k tokens; it reported no
  trouble; its stop rule arrived by message mid-run and was not needed). The steps ran in order on purpose (same files), so nothing overlapped. Causes: (1) tuning was
  inside the implementer's brief, so the agent built throwaway measuring scripts, ran them and rebuilt
  them (the diagnosis scripts were a copy of the real code, which can drift from it); (2) no progress
  signal: the main session cannot see an agent until it reports, so "slow" and "going in circles"
  look the same, and it feared the sweep said one thing while the implementation could never match;
  (3) mechanism problems (`enterMax`, the lodge's early stop) surfaced mid-tuning, which a data-only
  tuner would have had to hand back. Rules added to CLAUDE.md: tuning is its own brief with a
  grid sweep script on the real builders, a stop rule (two rounds without improvement means stop and
  write "stuck"), a progress line per round in the handoff file, `npm run checks` decides done, and
  "none passes" goes to the main session before a fresh implementer. The rotation agent's brief
  predated those rules, so its stop rule was sent mid-run by message. Open question for the review:
  does the split (tuner apart from implementer) cost more in re-reads than it saves? Compare this
  session's minutes with the first run that follows the new rule.
  The rotation agent's own retrospective (from memory, not measured): about 25% waiting on checks and
  e2e (quick `check-cases` ran 4 times at 65-90s, one sweep hit the 600s foreground limit), 20% tuning
  sweeps, 15% rework. Detours: stock 25 obstacles cannot fit a 40-square path (the handoff's "25 fit"
  note covered one house only); a dead-end library (one door on a 1-cell wall) failed 14 of 120
  builds; an explicit `undefined` override overwrote stock values (528 failures). It guessed the
  variant id grammar, mirror direction and grid swap. What would have helped: a ready tuning script
  taking house, length, turns and obstacles, with a time cap; a handoff line "the path needs about
  obstacles + ladders + snakes + 8 plain squares, and a room with one 1-cell door can only end the
  path"; and `check-cases --only nosing` so a tuning loop does not rerun the whole quick check.
  Mostly missing tools and unstated constraints, not unclear goals.
  Totals for the same session at 2.9 MB: main 155 replies, 25.3M read from cache, 301k written, 82k output,
  context 252k; subagents (6) 234 replies, 16.5M read from cache, 1.2M written, 186k output. What made it
  large: three agent runs of 24, 50 and 26 minutes (the last a prototype that ended in a no-go), and a design
  discussion that kept growing after the main goal was done. The no-go prototype cost about 115k tokens and
  26 minutes to learn that the slow part was the board length windows, not the search; a measurement of
  fill per house, done first, would have shown that in minutes.
- 2026-10-26, Puzzle book mockups (real screenshots, games on paper, Quick play screens): the topic grew
  from "swap in real screenshots" into designing the puzzle book, all in one session. Every look-and-fix
  round read screenshots back into the main context (contact sheets, side-by-side shots), and design
  rounds ran here instead of handing the capture scripts to an agent. Totals: 140 replies, 25.2M read
  from cache, 547k written, 109k output, context 289k, transcript 21 MB.
