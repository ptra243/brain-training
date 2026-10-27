# Triage Labels

The skills speak in terms of five canonical triage roles. This repo has no labels: issues are
entries in `docs/next-sessions.md` (see `issue-tracker.md`), so each role maps to where an entry
lives and how it is ranked.

| Role in mattpocock/skills | How it shows in this repo | Meaning |
| --- | --- | --- |
| `needs-triage` | A stub in `docs/someday-sessions.md` | Owner needs to evaluate it |
| `needs-info` | An entry whose heading names its blocker, e.g. `(blocked: tarot faces)` | Waiting on something before it can start |
| `ready-for-agent` | A tier 1–3 entry: design settled, starting prompt can brief the implementer | Fully specified, ready for an agent |
| `ready-for-human` | A tier 4 entry with `(design)` in its heading | Needs the owner's decisions |
| `wontfix` | Deleted, with the reason in the commit message | Will not be actioned |

When a skill says to apply a role, move or rewrite the entry to match the right-hand column, then
re-rank it (see the header of `docs/next-sessions.md`).
