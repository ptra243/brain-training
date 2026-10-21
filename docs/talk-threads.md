# Talk and threads: settled design and implementer brief

Status: designed 2026-10-21; part A built 2026-10-21 with placeholder lines (`src/content/talk.ts`). Settles the open questions in `docs/theme-draft.md` ("Model" and
"Follow-up threads"). The real lines and threads are written in the "Theme content" session; this build uses
a few placeholder lines so it runs.

## Settled
- **She doesn't move around the house.** (Reversed 2026-10-21 by `docs/exploration-mode.md`: she walks the
  house before midnight and talk opens from a person in her room; `visit` comes back then.) Games open from the casebook and a tap on a counter opens its
  sheet, so the `visit` trigger is dropped. The triggers left are `ask`, `object` and `talk`.
- **Talk lives on the suspect sheet** (`SuspectSheet.tsx`, opened by a short tap on a counter). It shows the
  greeting, the meter, the beats she has heard, an "Anything else?" button, and "Question them" when that
  suspect's questioning game is in the case and not finished. Talk and Play sit in one place.
- **Beats come behind "Anything else?"** Each tap plays the next ready beat. Inside a minigame (later), a
  ready beat comes along unprompted as the tangent, at most one per answer.
- **When beats are ready** (only uses games she has finished, won or revealed):
  `ready = min(beats, 1 + about + floor(other / 2))`, where `about` counts her finished games that are about
  this suspect and `other` counts her other finished games. Once the case is solved, every beat is ready.
  - A game is about a suspect when one of its clues names them in its fact (`suspect` or `suspects`), or it
    is their questioning.
  - Measured over 400 cases per level: the killer's count of games about them averages the same as everyone
    else's and is the unique top less often than chance, so the meter doesn't point at the killer. Without
    the fallback, a quarter of suspects in easy and medium cases would stop at beat 1.
- **One thread per suspect** (2 or 3 beats) plus their loose lines. No "favourite".
- **The borrowed card is rolled once per suspect per case** (one secondary for the night, about 35%;
  otherwise the home card), so a suspect sounds like one person.
- **The meter** is a row of pips on the sheet: beats heard out of the thread's length. It only goes up and
  works the same for everyone, killer included.
- **Hostile to warm**: a suspect whose reading is reversed starts cold. The greeting is picked by beats heard:
  cold suspects warm up a step per beat ("You again?", then "Fine, sit down.", then a warm one); warm ones
  stay warm. Copy only; the meter never drops.
- **Hostility makes the questioning harder** (part B below): a cold suspect's questioning game is built one
  level harder (hard stays hard), fixed at case start so a puzzle she has started never changes.
- **Side characters**: later. The set model allows them; none are added now.
- **All games done in small cases** (settled while building): in a 3-game Play case a guest with no games
  about them reaches only 2 beats, so a 3-beat thread finishes once the case is solved. Kept on purpose;
  `check-cases` asks for at least min(2, thread length) ready with all games done.
- **Campaigns keep one voice all night**: the sets are seeded from the campaign, so card, reading, thread and
  lines stay the same every round. Mood is a level (0 = coldest, top = warm; the greeting steps). It starts
  cold if reversed, else warm, and at rounds 2 and 3 it stays (50%) or moves one step warmer or colder (25%
  each), rolled per guest from the campaign seed, round number and guest id only (`moodFor`). Random for now; story reasons may come later.
  Beats heard still count per round.

## Implementer brief, part A (build now)
Cases must not change: the sets live outside `Case` and roll on their own stream. Check with `npm test`
(golden snapshot) and `npm run check-cases`.

1. **Content shape** (`src/engine/types.ts` `Content`, data in `src/content/`): per suspect `card` (home
   card id) and `mayAlsoRoll` (secondary card ids). Per card, for `upright` and `reversed`: `lines`
   (`neutral: string[]`, `bound: string[]`, bound = home suspect only) and `threads` (arrays of 2 to 3 beat
   strings). Greetings: `greetings.cold` and `greetings.warm`, short ordered lists in `src/content/`. Add
   placeholder data so every suspect in content has a card, at least 2 neutral lines and 1 thread per card
   reading, clearly marked as placeholder for the Theme content session. Never name a card in the lines.
2. **`src/engine/sets.ts`**: `characterSets(content, seed, suspects)` returns per suspect `{ home, borrowed,
   reversed, cold, lines, thread }`. It takes no `Case`, so it can't see the killer. Uses its own `Rng` from
   `hashSeed` of the case seed plus `'sets'`. Borrowed card: rolled once per suspect (about 35% a secondary,
   else the home card). Thread: from the home card's pool for the reading (or the borrowed card's when
   borrowed). Loose lines: neutral from the cards used, bound from the home card only. No line or thread is
   used twice in a case (re-roll). `cold = reversed`.
   Tests: same seed, same sets; changing which suspect is the killer (same seed and suspects) changes nothing;
   over 500 seeds no suspect's reversed rate is an outlier; no repeats within a case.
3. **`src/game/talk.ts`** (pure): `gamesAbout(c, game)` (suspect ids), `readyBeats(c, progress, suspect,
   threadLength)` per the formula above, `greeting(set, heard, content)`. Tests for the formula, the
   solved-case override, and that only finished games count.
4. **State**: `Progress.talk?: Record<string, number>` (beats heard per suspect, optional so old saves
   load). Action `{ type: 'talk-hear'; suspect }` raises it by one, never past `readyBeats`. Reducer test.
   Saved through the existing guarded storage; no prefix bump.
5. **UI** (`SuspectSheet.tsx`, styles in `src/styles.css`): under the clues, a Talk section with the
   greeting, pips (heard out of thread length), the heard beats as a short log, "Anything else?" (only when
   a beat is ready; otherwise "Nothing more to say yet."), and "Question them" when their questioning game is
   in the case and unfinished (opens it the way the casebook does). Sentence case, from her point of view.
   Touch targets at least 44px; no sideways scroll at 360px. Add an e2e flow: open a counter, tap "Anything
   else?", see beat 1 and one pip filled.
6. **`check-cases`**: for every checked case, `characterSets` builds, every suspect gets a thread, and with
   all games finished every beat is ready.

## Part B (with the Theme content session's storage prefix bump)
- A cold suspect's questioning game is built one level harder (hard stays hard). This changes cases, so it
  lands with the real content, with a prefix bump in `src/game/storage.ts` and a refreshed golden snapshot.
- Tangents inside minigame answers (at most one ready beat per answer, sharing `Progress.talk`), and the
  `object` trigger for card + object threads.
