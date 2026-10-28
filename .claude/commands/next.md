---
description: Show the next-session menu from docs/next-sessions.md and start the one picked
---

This file is the one place that says how the menu works; the `SessionStart` hook (`.claude/hooks/stale-sessions.mjs`) only lists the entries and points here.

If an argument was given ($ARGUMENTS) and it names an entry (a number or a name), treat it as the pick and skip straight to "When one is picked". Otherwise show the menu:

Grep `docs/next-sessions.md` for `^## Session: ` and reply with the headings as a numbered list (names only, one line each, in file order). Then a "Later ideas" line and the headings from `docs/someday-sessions.md`, numbered on from the first list. Then give a markdown link to `docs/next-sessions.md`, and recommend one entry. The list is a ranked backlog, so recommend the first entry unless its heading names a blocker, in which case recommend the first unblocked one. One sentence, taken from that entry's Goal, saying why it is next. Then ask which to start.

When one is picked: first rename this session to the entry's heading, so parallel sessions stay distinguishable. The owner asked for this rename. In Cursor, call `rename_chat` on `cursor-app-control` with that heading (discover the schema, then call it). In the desktop app, call `mcp__ccd_session_mgmt__set_session_title`, loaded with ToolSearch if deferred. Use whichever of those tools exists. Then read only that entry, in whichever of the two files has it (Grep for its `## Session:` heading, then Read with offset and limit), read its "Reads first" docs, set its "Last touched" date to today, and carry out its starting prompt as if the owner had typed it.

Before the session finishes, update that entry (what is done, what is left, a starting prompt that picks up from there, its rank), or delete it if the work is finished, and commit that with the work.
