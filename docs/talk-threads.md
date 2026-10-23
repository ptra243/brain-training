# Talk and threads: settled design and implementer brief

Status: designed 2026-10-21; part A built 2026-10-21 with placeholder lines (`src/content/talk.ts`). Settles the open questions in `docs/theme-draft.md` ("Model" and
"Follow-up threads"). The real lines and threads are written in the "Theme content" session; this build uses
a few placeholder lines so it runs.

## Settled
- **She doesn't move around the house.** (Reversed 2026-10-21 by `docs/exploration-mode.md`: she walks the
  house before midnight and talk opens from a person in her room; `visit` comes back then.) Games open from the casebook and a tap on a counter opens its
  sheet, so the `visit` trigger is dropped. The triggers left are `ask`, `object` and `talk`.
- **Talk lives on the suspect sheet** (`SuspectSheet.tsx`, opened by a short tap on a counter). It shows the
  greeting, the meter, the beats she has heard, a question button ("Tell me about yourself", then "Go on…"), and "Question them" when that
  suspect's questioning game is in the case and not finished. Talk and Play sit in one place.
- **Beats come behind her question** ("Tell me about yourself", then "Go on…"). Each tap plays the next ready beat. Inside a minigame (later), a
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
  cold suspects warm up a step per beat ("Make it quick.", then "Fine, sit down.", then a warm one; the first greeting is for meeting them, never "again"); warm ones
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
   greeting, pips (heard out of thread length), the heard beats as a short log, her question (only when
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

## Part C: relationships (designed 2026-10-23; nothing built yet)
Settled in the "Relationships between characters" session. Everything here is **campaign only**; Quick play keeps
one card thread per guest and loose lines. Content goes in `src/content/talk.ts` (never `Case` or `Content`), sets
stay seeded from the campaign, the round and the guest id, so nothing depends on the killer (rule 5).

### One chain per guest
A guest's `thread` becomes an ordered chain, so `readyBeats` and the pips keep working unchanged:

| Order | Thread | Beats | Source |
|---|---|---|---|
| 1 | Victim thread | 3; beat 1 is the opening's relationship line | relationship type, reading, `{victim}` |
| 2 | Card thread (as today) | 2 or 3 | home or borrowed card |
| 3 | Pair or shared-card thread, only if seated | 3 | pair table or tonight's shared card |

### Victim threads
- Four types: owes money, old rival, secret fondness, family. Each guest lists the 2 or 3 types they can have
  (`src/content/`); the type is rolled per guest from the campaign seed, round and guest id.
- Family is only offered when guest and victim are kin (Host, Hostess, Uncle, both heirs).
- Every seated guest gets one, so the killer's doesn't stand out. Victims have no roll of their own: round 1's
  is the 8th guest in the seating shuffle, later victims are her wrong accusations.
- Size: 4 types x 2 readings x 3 beats = 24 lines, `{victim}` filled in. Beat 1 must work as a single line said in the
  campaign opening. Hearsay only, no times or places.

### Pair threads
- Hand-picked, 4 to start (table below). A pair thread appears only when both guests are seated; it joins the
  end of each guest's chain. Check in `check-cases` that every seated pair has the same beat count for both.
- Beats 1 and 2 are shared wording (either guest can say them, `{other}` is the partner, no pronouns). Beat 3 has
  four variants, picked by the two readings: both upright (they make up), both reversed (they fall out for good),
  or one of each (only one still cares; the variant depends on whether the speaker is the upright one).
- A pair thread never replaces the card thread. A guest in two pairs tonight uses the first in this table order.
- Lines say how people feel, never where they were or when (rule 3), and no witness vouches for themselves.

### Shared card and the heard trigger (not drafted)
- Two guests can share tonight's secondary card (never a home card). Both upright: kindred spirits; both reversed:
  rivals too alike; one of each: one-sided. Start with the 4 or 5 most borrowed cards, about 3 lines per type.
- `heard`: when she has heard a beat naming `{other}` from A, B's next beat becomes ready. It uses only what she
  has seen, so it is safe.

### Draft pair threads (placeholder voice, dry and cosy; not final copy)
Marked U = speaker upright, R = speaker reversed; "partner" = `{other}`'s reading.

**1. Host + Hostess (the marriage)**
1. "{other} and I have an arrangement about who chooses the wine. Neither of us remembers what it was."
2. "We have shared a house, a name and a seating plan for decades. Only the plan has survived intact."
3. both U: "Tonight {other} laughed at something I said. I'm choosing to call that progress."
   both R: "We have agreed to disagree. In writing. {other} has the carbon copy."
   U / partner R: "I would happily start again. {other} would need to find the page first."
   R / partner U: "{other} keeps being kind to me, which is deeply inconvenient."

**2. Elder heir + Younger heir (rivals for the house)**
1. "{other} measures the curtains every time we meet. Not for me, I notice."
2. "We were raised to share. It stuck for toys and failed for everything bigger."
3. both U: "Over the soup, {other} and I decided the house is big enough for two. Nobody believed us."
   both R: "Whichever of us gets the house, the other has promised to haunt it. Politely."
   U / partner R: "I would split it down the middle. {other} has already chosen which half is mine."
   R / partner U: "{other} offered to share. I said I would think about it. I am still thinking."

**3. Host + Uncle (the old quarrel)**
1. "{other} and I haven't spoken about the ladder in years. We are both very loud about not speaking of it."
2. "It began over a borrowed book and a lent opinion. By now it is practically a family heirloom."
3. both U: "Tonight we shook hands over the quarrel. Neither of us can say who offered."
   both R: "The quarrel has outlived the book, the ladder and most of the furniture. It will outlive me."
   U / partner R: "I tried to say sorry at the drinks table. {other} asked for the salt."
   R / partner U: "{other} has been trying to bury it. I keep digging it back up. Old habit."

**4. Detective + Conjurer (the one who sees through tricks, the one who makes them)**
1. "{other} makes things vanish and I make them reappear. We are, professionally, at odds."
2. "I have worked out three of {other}'s tricks. {other} claims all three were mistakes."
3. both U: "We have agreed to swap secrets one evening. Neither of us means to keep ours."
   both R: "{other} and I are done comparing notes. It ends in a draw and an argument about the draw."
   U / partner R: "I would trade tricks for evidence over tea. {other} says a magician never explains."
   R / partner U: "{other} was charming about it, which I found suspicious. It's the job."

### Open for later
- Pairs 5 and 6 (Host + Financier, the debt, is the likely next; it may collide with the owes-money victim type,
  so check them together).
- Whether the Conjurer's pair line leans too close to the Detective's role (rule 5 and the "no lies" rule are fine; the
  question is variety).
