# End-to-end tests (Playwright)

- **Run** `npm run e2e` (`2>&1 | tail -20`). One Chromium project as her
  phone: 360×780, touch, mobile, scale 3; service workers blocked. The
  `line` reporter keeps output small; screenshots and traces are kept only
  on failure (`test-results/`). Each run starts its own server on a free
  port (`scripts/free-port.ts`; `E2E_PORT` overrides), so runs in different
  folders or worktrees can overlap. In the same folder, give each its own
  `--output test-results/<name>` so they don't clear each other's results.
  Keep it under `test-results/`: the next plain run wipes it there, so
  results never pile up (so don't start a plain run while a named one is
  going).
- **Deterministic cases.** Import `test` from `fixtures.ts`: it replaces
  `crypto.getRandomValues` with a seeded sequence (`test.use({ seed })`,
  default 12345), so "New case" and campaigns build the same case every
  run, and clears localStorage once per tab (a reload keeps her save). No
  app hooks; go through the real UI. Wait on roles and text, never sleeps:
  case building may become async.
- **Every screen gets `checkScreen(page, label)`** (`rules.ts`): no sideways
  scroll and every visible button, link and input at least 44×44. Exceptions
  go only in its `EXCEPTIONS` list, each with a reason; the grid cells at 5
  suspects are the known one.
- **A failing layout check is a bug.** Report it; never loosen the check or
  allowlist it to go green. A known bug may be marked `test.fail()` with a
  comment; remove the mark when it's fixed (Playwright fails a passing one).
- **Selectors**: role or text first; add a `data-testid` only where there is
  no stable accessible name.
- **Touch** uses real CDP events (`Input.dispatchTouchEvent`, see the drag
  helper in `map.spec.ts`): drag with several `touchMove` steps. A tap sends
  a late `click` that can land on whatever it just opened, so after a tap
  check that the opened thing is still open and nothing else happened.
- **`browser-check`** is only for judging the look of new or redesigned
  screens; rules and flows belong here.
