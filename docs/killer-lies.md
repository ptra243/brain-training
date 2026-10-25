# The killer lies, in hard mode

Exploratory design, moved from `docs/next-sessions.md`. Low priority: only if hard cases feel too easy.
Reads first: `src/engine/CLAUDE.md` (one solution, own seed stream, interrogations, campaign),
`src/engine/clues.ts`, `src/engine/solver.ts`, `src/engine/search.ts`, `src/engine/wording.ts`.

## Idea

A new optional hard logic level where everyone tells the truth except the killer, and everything the
killer says is false. She reasons "if the Butler did it, their story is false; does that still fit?"
It's the one form of casebook lie that stays fair. Lies inside a minigame (the interrogation) already
exist and are unaffected; outside this level, "every clue is true" stays.

## Two variants (decided 2026-10-23: build A first, then B on the same claim model)

- **A: only the killer lies.** Medium-hard. Solver tries each suspect as the killer with their claims
  negated.
- **B (hard mode): everyone lies at most once, the killer always lies.** "Whoever fibs twice did it",
  so it becomes a counting puzzle, as in a real mystery. Only the killer needs 2+ claims (else their
  one lie looks like an innocent's); innocents make zero or one, so no 14+ claim blow-up. Solver: 7
  killers x each innocent's choice of lie (about 2^6 to 3^6); fine for `search.ts`. Prefer claims whose
  negation narrows things down ("not the kitchen" alone is weak). Innocents can vouch for themselves in
  B, so that rule is dropped there.
- Every innocent lie must be provable: another claim or the cat's evidence contradicts it.

## Why a guest lies

The story version of this list, with no logic change, is `docs/secrets.md` (2026-10-25). If lies are built,
each innocent's one lie should be explained by their secret from there.

A content list for `src/content/`, one flavour line each, shown on the Solve screen as "the Butler lied
because ..."; the casebook shows only the claim.
- **Paired** (one secret uses both guests' single lie; finding one reveals the other): affair,
  blackmail, secret deal, covering for a friend, a private quarrel.
- **Solo:** stealing or searching for something, snooping, a habit (drink, gambling), a debt, a private
  call, embarrassment, burning a letter, a secret tarot reading.
- **Harmless** (best red herrings): planning a surprise, a secret drink.
- **Weapon:** an innocent used the murder weapon for something else (propped a door with the
  candlestick) and lies about being near it. It looks like the killer's lie, so the "killer lies about
  the crime, innocents about private matters" shortcut does not exist. At most one such innocent per
  case, and the cat's evidence of where the weapon was found must be able to contradict their claim. It
  links to "Hunting the weapon".

Paired lies: A says they were in the bedroom, but really was in the study with B. B's statement then
also fails to match, and a third claim or cat evidence ("two glasses in the study") gives it away.

## Rooms and clue count

- In 7-guest cases 7 guests share 5 rooms (`src/engine/CLAUDE.md`), so two guests can already be
  together and paired lies need no model change. Hard mode is 7 guests only (4 and 5 give one room each).
- A claim is the same `compileClue` test, flipped for a liar, so a lie replaces a true clue rather than
  adding one; a flipped clue says less, so expect a few more clues than today (measure the current
  7-guest hard count first).
- To keep it small: innocents lie at most once (zero or one claim each), only the killer needs two
  provable lies, lean on cat evidence (stays fact), and let the finale interrogation carry some lies.
- The real work is every consumer that treats a clue as fact: casebook, case board marks, map and grid
  hints.

## Explore and settle

- **Clue model:** testimony becomes a claim ("the Butler says X"), evidence stays fact. How the casebook
  shows claims; whether "a witness never vouches for themselves" still holds or the lie replaces it.
- **Solver:** try each suspect as the killer with their claims negated; exactly one suspect must fit,
  with a minimal clue set. Cost for 7 guests (already needs `search.ts`).
- **Fairness:** the killer must make at least one claim she can prove false, so she never has to guess.
  In B, the killer needs at least 2 provable falsehoods.
- **Open:** does the Solve button reveal which claims were lies (leaning yes); is there a campaign round
  that introduces lies before the full rule.
- **Scope at first:** no case board, no campaign; how map and grid hints treat claims.
- **Seeds:** new level on its own seed stream, after the existing draw; presets, campaigns and the
  golden snapshot stay unchanged. `check-cases` covers the new level.
