# Campaign opening: build plan

Status: designed 2026-10-23 with the owner; nothing built yet. Run this in a fresh session that reads this doc,
delegates the pieces to `implementer` agents (see "Delegation") and commits. The design is settled; only the
"Open" list at the end is left to the owner.

## What it is
Round 1 of a campaign opens with a skippable scene before the casebook. The body has been found (sometimes
moved, see below) and, if the map is shown, all seven seated guests stand in the body's room with her. It opens
on "Someone in this room is the culprit." She talks to each guest once, in any order. Each conversation has the
guest's greeting, one line about their relationship with the victim, their first thread beat, and (for some
guests) one of round 1's free clues. After the last guest, or after Skip, the guests disperse to their rooms and
the exploration round begins as it does today.

Quick play, rounds 2 and 3 and every case's clues stay exactly as they are.

## Decisions (all from the owner)
- **Skipping costs no clues.** Every free clue lands in the casebook as it does today. Skipping shows a
  summary of what she missed: how many clues she got and which guests she didn't talk to; their sheets are
  still there. Beats she skipped stay available on the guest's sheet.
- **One beat per guest** in the opening: beat 1 of the guest's thread (always ready, see `readyBeats`).
- **Free order.**
- **Who says a clue.** A testimony clue is told by its existing `speaker`. An evidence clue (about an object
  or a room, not a guest) is delivered by the cat as a last "Talk" after the guests, in the cat's voice
  ("found the candlestick in the bedroom"). It stays evidence. A guest never clears themselves: the
  rule "a witness never vouches for themselves" is already true of every clue, and this adds nothing.
- **No lies.** Every clue is true. "2 truths and a lie" waits for "The killer lies" (`docs/next-sessions.md`).
- **Victim line.** One short line per guest on how they knew the victim. Until the Relationships session
  builds "Victim threads" (`docs/next-sessions.md`, `docs/theme-draft.md`), use placeholder lines per
  relationship type; that session should make its thread's first beat work as this line.
- **Beat review in both places.** (A) a short "so far" line at the top of each guest's Talk sheet, (B) a
  "Story so far" page in the casebook with every guest's line. Make the line from what she has already heard
  (the first sentence of each heard beat); no new content needed.
- **Later rounds' free clues stay as today.** Only round 1 gets the scene.
- **Moved body (option B).** In some rounds (rolled from the campaign seed and round number only, never the
  killer; about 1 in 4 to start) the body is found in a room other than the scene room, with a visible sign it
  was moved (drag marks) that points to the scene. She still knows the scene from the start. No engine change,
  no case change. She starts each round at the body, and the map marks the scene at once.
- **The map during the opening:** all guests in the body's room. That reveals nothing: campaign rounds already
  know the scene from the start (`docs/exploration-mode.md`).

## Rules to keep (from CLAUDE.md)
- Every clue true; nothing may depend on the killer (rule 5): the moved-body roll, the order, the victim
  lines and the guests' placement all come from the campaign seed, round and guest ids only.
- Cases must not change: `npm test` (golden snapshot) must pass untouched. No `Case` or `Content` field is
  added (the golden hash covers the whole `Case`); talk content stays in `src/content/talk.ts`.
- No storage prefix bump: new `Progress` fields are optional and sanitised in `src/game/saveGuards.ts`.
  Old campaigns have no `opening` field and must NOT show the scene.
- Random only through the seeded `Rng` (`hashSeed` of a text containing the case seed).
- 360 × 780, no sideways scroll, touch targets at least 44px. Dialogs use `Dialog`, never `window.confirm`.
  Copy in plain sentence case from her point of view.

## Where things are (verified 2026-10-23)
- Free clues are the clues with `delivery: 'given'`, always visible via `unlockedClueIds`
  (`src/game/state.ts:236`). Testimony clues have `speaker`, evidence clues have none (`src/engine/types.ts:261`).
  Built in `tryRound` (`src/engine/campaign.ts:184`).
- `Progress` (`src/game/state.ts:36`) already has `talk` (beats heard) and `at` (current room). `talk-hear`
  is capped by `readyBeats` (`src/game/talk.ts:31`); beat 1 is always ready.
- A campaign round is shown by `CampaignRounds` (`src/game/CampaignView.tsx:149`), which marks the cases
  `explore: true`. `ExploreMap` (`src/game/ExploreMap.tsx`) draws the map, `roomContents`
  (`src/game/explore.ts:37`) places guests per room on a seeded stream, and a person's screen reuses
  `TalkSection` (`src/game/TalkSection.tsx`).
- `whereAmI` (`src/game/explore.ts:127`) defaults to `c.sceneRoom`; `sceneText` (`state.ts:258`) says "The body
  was found in the {scene room}." for explore cases.
- `NextMurderScene.tsx` is the precedent for a full-screen scene (a `Dialog` with `placement="scene"`).
- New campaign progress comes from `newCampaign` (`src/game/campaignSave.ts:23`).

## The pieces
Do them in this order. Each piece ends with `npm run checks` passing; pieces 1 and 2 can run together (different
files).

### 1. Opening script and state (pure; implementer)
- `Progress.opening?: { talked: string[]; cat?: true; done?: true; skipped?: true }` (optional). `newCampaign`
  sets `{ talked: [] }` on round 1 only. Absent = no opening. Actions: `opening-talk` (guest id, also does the
  `talk-hear` for beat 1), `opening-cat`, `opening-skip`, `opening-finish`. Reducer tests; sanitise in
  `saveGuards.ts` (drop unknown shapes) with a test that an old save loads with no opening.
- `src/game/opening.ts`: `openingScript(c)` returns the round-1 conversation list: per seated guest `{ guest,
  clues: Clue['id'][], victimLineKey }`, plus `catClues` (the free evidence clues) and the gathering room. A
  free testimony clue goes to its `speaker`; a free evidence clue goes to the cat; guests with no clue just
  talk. `openingSummary(c, progress)` returns `{ cluesGot, guestsMissed }` for the skip summary. Tests: every
  free clue is delivered exactly once; a speaker never gets a clue that clears themselves (use the clue's
  existing fact; assert the speaker is not the clue's cleared suspect); a sweep over seeds covers all seven
  guests with no killer input (the module must not import or read the killer).
- Moved body: `bodyRoom(c)` in `explore.ts` (own stream `${c.seed}-explore-body`; moved about 1 in 4, to a
  room in `c.rooms` other than `c.sceneRoom`). `whereAmI` defaults to `bodyRoom(c)`. `sceneText` for a moved
  body says where it was found and that the marks lead back to the scene room. Tests: deterministic, never
  equal to the scene room when moved, same result for the same round. Check `ExploreMap` and anything else
  reading `c.sceneRoom` as "where the body is" (grep `sceneRoom` in `src/game`) and decide per use: the
  accusation room stays the scene.
- `roomContents(content, details, c, opts?)`: with `opts.gathered` every living guest is in `bodyRoom(c)`.
  Default behaviour unchanged (golden-like test: same output as before for the default).

### 2. Content (mechanical; implementer, no review notes)
In `src/content/talk.ts` (outside `Content`), all marked placeholder for the Theme content session:
- `victimLines`: 4 relationship types (owes them money, old rival, secret fondness, family), 2 lines each, with
  `{victim}`; a guest's type from a seeded pick on the campaign seed + guest + victim (a helper in
  `src/game/opening.ts`, not in the content file). Lines are about feelings, never where anyone was.
- `opening`: the "Someone in this room is the culprit." line, the cat's lines (leading into an evidence clue),
  the guest-conversation connector lines, the skip-summary copy, the drag-marks line.
- Tests: no card names in the lines (same rule as other talk content).

### 3. UI (implementer; start after 1 and 2 are merged)
- `OpeningScene` shown by `CampaignView` before `CampaignRounds` when round 1's `progress.opening` exists and
  isn't done. Reuse `ExploreMap` in a gathered mode (no moving, no puzzle marks, no clock) if that stays
  small; otherwise a dedicated screen with the room name and a row of guest counters. Either way: the
  top line, "n of 7 spoken to", a Skip button, a person screen reusing `TalkSection`'s portrait frame, and a
  "Talk" with the cat once the guests are done (only when there are evidence clues). Clues appear in the
  scene as they are told. Reloading mid-opening resumes (state is in `Progress.opening`).
- Skip opens a `Dialog` ("Skip the introductions?") then the summary (clues got, guests not spoken to), then
  the casebook. Finishing shows a one-line version and a "The guests go their own ways" beat, then the
  casebook.
- Beat review: the "so far" line in `TalkSection` (first sentence of each heard beat), and the casebook's
  "Story so far" page (a row per seated guest with their line; guests with nothing heard say so).
- The map in later rounds marks both the body's room and the scene room when they differ.

### 4. Checks, e2e, docs (implementer)
- `scripts/check-cases.ts` via a `*Sweeps.ts` helper (see `src/game/faceSweeps.ts`): quick sample of
  campaign seeds, `openingScript` covers every free clue and every guest, moved-body rate in a sane range and
  never the scene room. Keep `npm test` under ~5 s.
- e2e (`e2e/CLAUDE.md` first): new campaign shows the opening; talk to a guest, a clue appears; skip shows the
  summary and the casebook has all free clues; reload mid-opening resumes; an old save with no `opening`
  goes straight to the casebook. Existing campaign specs need one shared helper to skip the opening.
  Check 360px, no sideways scroll.
- Docs: a line each in `src/game/CLAUDE.md` (the opening scene), `src/engine/CLAUDE.md` (nothing changes in
  the engine; note that), README layout if it lists files; update `docs/talk-threads.md` with the opening's
  beat; mark the "Campaign opening" entry in `docs/next-sessions.md` done and delete it once committed.

## Delegation
Keep nothing in the main session except review and the final `check-cases --full` (not needed: the engine is
untouched, so `npm run checks` is enough). Write `.claude/handoff/campaign-opening.md` with the points above
before briefing. Brief per piece, reports of about 8 lines. Run `browser-check` for the look of the scene.

## Open (owner's call, defaults given)
- The moved-body rate: 1 in 4 (default).
- Opening length with a 7-guest cast: seven short conversations. If it feels long in play, shorten the
  connector lines, not the count.
- Whether the "so far" recap should later come from authored one-line recaps (Theme content session).
