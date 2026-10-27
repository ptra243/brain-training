# Issue tracker: next-sessions.md

Work for this repo is tracked in `docs/next-sessions.md`, not GitHub Issues. Read that file's own
header before changing it: it holds the format, ranking tiers and upkeep rules, and a `SessionStart`
hook (`.claude/hooks/stale-sessions.mjs`) turns it into the menu shown at the start of each session.

## Conventions

- **An issue is a `## Session: <short title>` entry.** About 8 lines, under 1 KB: heading,
  `Last touched: YYYY-MM-DD`, `Reads first`, a one- or two-sentence `Goal`, and a fenced
  `Starting prompt`. The heading is the menu line, so keep it short.
- **The list is a ranked backlog.** First entry is next. Tiers: (1) done work waiting to ship, and
  blockers; (2) fixes and small wins; (3) builds with a settled design; (4) design work. Place a new
  or changed entry at its rank; never leave it where it stood.
- **Detail goes in a linked doc.** Specs, decisions and open questions live in `docs/<slug>.md`;
  the entry points to it under `Reads first`.
- **Exploratory ideas** with no settled design go in `docs/someday-sessions.md` as short stubs.
- **Blocked** entries keep their rank and name the blocker in the heading.
- Edits to these files go in the same commit as the work they describe.

## When a skill says "publish to the issue tracker"

- **A spec** (`/to-spec`): write it to `docs/<slug>.md`, then add or update one entry that points to it.
- **Tickets** (`/to-tickets`): one entry per ticket, each with its own starting prompt, ranked into
  the list. If a ticket needs more than ~8 lines, its detail goes in the linked doc, not the entry.
- **An idea not yet designed**: a stub in `docs/someday-sessions.md`.

## When a skill says "fetch the relevant ticket"

Find the `## Session:` heading in `docs/next-sessions.md` (or `docs/someday-sessions.md`) that the
owner names or numbers (menu numbers follow file order, next-sessions first), then read the docs it
lists under `Reads first`.

## Comments and closing

- There are no comments: update the entry (its `Last touched`, what is done, what is left, and a
  starting prompt that begins where the work stopped) or its linked doc.
- To close an issue, delete the entry in the commit that finishes it.

## Wayfinding operations

Used by `/wayfinder`.

- **Map**: `docs/<effort>.md`, with Notes / Decisions so far / Fog sections. One entry in
  `docs/next-sessions.md` points to it.
- **Child ticket**: a `### NN. <question>` section in the map doc, numbered from `01`, with a
  `Type:` line (`research`/`prototype`/`grilling`/`task`), a `Status:` line (`open`/`claimed`/
  `resolved`) and, if needed, `Blocked by: NN, NN`.
- **Frontier**: the open, unblocked, unclaimed sections; lowest number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: add the answer under the section, set `Status: resolved`, and add a one-line gist to
  Decisions so far.
