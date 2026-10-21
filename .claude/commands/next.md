---
description: Show the next-session menu from docs/next-sessions.md and start the one picked
---

Grep `docs/next-sessions.md` for `^## Session: ` and reply with the headings as a numbered list (names only, one line each, in file order), then ask which to start. If an argument was given ($ARGUMENTS), treat it as the pick (a number or a name) and skip the list.

When one is picked: first rename this session to the entry's heading (in the desktop app, `mcp__ccd_session_mgmt__set_session_title`, loaded with ToolSearch if deferred; skip it where that tool doesn't exist), so parallel sessions aren't all called "Next steps". Then read only that entry (Read with offset and limit), read its "Reads first" docs, set its "Last touched" date to today, and carry out its starting prompt as if the owner had typed it.
