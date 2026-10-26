# Everyone has a secret (campaign)

Status: proposed 2026-10-25, nothing built. Needs the owner's calls in "Open" before a build plan.
Related: `docs/relationships.md` and part C of `docs/talk-threads.md` (victim threads, the `heard`
trigger), `docs/killer-lies.md` ("Why a guest lies"), `docs/face-to-face.md`, `docs/story-layer.md`
(the summation ending, which pays this off).

## The problem it solves
A whodunnit pays off when the reveal changes what earlier scenes meant: everyone had a reason, everyone
was hiding something, and only one of those secrets was murder. Rule 5 (nothing may depend on the killer)
seems to forbid that, so today every line is neutral and the ending is a generic confession.

Earlier attempts ("everyone has a motive", "everyone lies once") got stuck because they mixed two
different things:

| | Story secrets (this doc) | Logic lies (`docs/killer-lies.md`) |
|---|---|---|
| What it is | Something each guest is hiding, told through talk | Casebook claims that may be false |
| Touches the case? | Never. Clues, solution, `Case` and goldens unchanged | Yes: new clue model and solver |
| Rule 5 | Rolled without the killer; only text shown after the verdict reads the killer | Fair by proof, not by blindness |
| Cost | Content plus a little UI | Engine work, every clue consumer |

Do the story version first. If lies are ever built, each innocent's one lie is explained by their secret,
so the content gets reused rather than thrown away.

## The trick: roll blind, interpret after
1. **Before the verdict**, every seated guest has one secret, rolled from the campaign seed and guest id
   only. Each secret comes with a reason the victim might have mattered ("{victim} knew"). So all seven
   guests look like they had a motive, the killer exactly as much as anyone else.
2. **After the verdict**, the killer is known, so the text may read it:
   - the killer's secret becomes the motive in the ending ("{victim} found out about the debt");
   - each innocent's secret is shown to be what they were really hiding (the red herring cleared);
   - an innocent she accuses confesses their secret in face to face, in place of the generic line.

Nothing she sees before she accuses depends on who did it, and a secret is never a clue.

## Worked example
Seated: Host, Hostess, Butler, Financier, Housekeeper, Elder heir, Detective. Round 1's victim: the Uncle.
The killer is the Butler (the roll below never looks at that).

| Guest | Secret (rolled) | What she can hear before accusing |
|---|---|---|
| Financier | Debt | Rumour (from the Hostess): "Someone's creditors have been writing to this house." Tell: "Money's only a problem if you let people see you worry." |
| Butler | Theft (the silver) | Rumour (from the Detective): "The inventory doesn't add up, and only one person keeps it." |
| Elder heir | Forged will | Tell: "Papers can say anything. It's who reads them that matters." |
| Housekeeper | Letters she burned | Rumour (from the Heir): "There was smoke from the grate before anyone lit a fire." |
| ... | | |

- She accuses the Financier (wrong). Face to face ends with a confession of the debt, not murder: "Yes,
  I owed {victim}. I'd have paid. Dead men don't settle accounts." The Financier is the next body, and she
  now knows one secret was a red herring.
- Round 3, she accuses the Butler (right). The ending: "{victim} counted the silver." The summation clears
  everyone else in one line each ("The Housekeeper burned letters, not evidence").

## How it plays
- **One secret per seated guest, all campaign.** Victims change per round; secret lines use `{victim}`, so
  the same secret reads as a motive for whoever died tonight.
- **Three stages per secret**, saved as her moves (like `Progress.talk`), shared across rounds:
  1. **Rumour**: another guest hints at it. Every seated guest carries exactly one rumour about another
     (a seeded derangement over the seated guests), so everyone, the killer included, is gossiped about
     once. A rumour is a loose talk line of the speaker, not a beat in their pips.
  2. **Tell**: the guest's own evasive beat. It joins their chain after the victim thread (see Chain). The
     `heard` trigger: hearing the rumour makes the tell ready even if her games wouldn't yet.
  3. **Out**: revealed after a verdict: in face to face (accused innocent), or in the ending (everyone).
- **Secrets page** in the casebook: a row per guest (portrait, "Nothing heard", "A rumour", "Hiding
  something", "Out: the debt"). It's the visual novel's relationship chart. Never tappable as evidence and
  never in the Clues tab (rule 8). One line at the top: "Everyone here is hiding something. Clues decide
  who did it."
- **Face to face, innocent**: the scene still looks the same until the last line. The last line is the
  secret's confession instead of "It all lines up. Maybe they're innocent." If the secret is already out,
  use a short "I told you what I was hiding" line.
- **Endings**: the killer's motive line from their secret kind, then the summation (`docs/story-layer.md`)
  with one clearing line per innocent whose secret she heard, and the rest as "never told you".
- **Got away**: the same motive line, said by the cat or narrator, so she still gets the story.

## Content (in `src/content/talk.ts`, outside `Content`)
- **Secret kinds**, start with 6: debt, theft, forged will, burned letters, a gambling habit, a harmless
  one (planning a surprise; the best red herring). Later: paired kinds (affair, blackmail, a secret deal,
  covering for a friend) where two guests share one secret.
- **Per guest**, the 2 to 4 kinds that suit them (the Financier: debt, gambling; the Butler: theft,
  burned letters). Rolled from that list, so each campaign recasts who hides what.
- **Per kind**: 2 rumour lines (`{other}` is the guest it's about), 2 tell lines per reading, 2 innocent
  confessions, 2 killer motive lines, 1 clearing line. About 13 lines a kind, about 80 for six kinds.
- **Line rules**: a secret line never says where anyone was, what they held or when (rules 1 and 3), so it
  can never be mistaken for a clue. No weapon secrets (the "propped the door with the candlestick" idea in
  `docs/killer-lies.md` touches case facts; it belongs to logic lies). No card names (rule 4).

## Chain and engine
- Part C of `docs/talk-threads.md` makes each guest's thread a chain: victim thread, card thread, pair
  thread. The tell slots in after the victim thread (it reads as "how they knew the victim, and what they
  aren't saying"). Pips and `readyBeats` keep working.
- `secretsFor(talk, campaignSeed, seated)` in `src/engine/sets.ts` (or beside it): own stream
  `${campaignSeed}-secrets`, takes no `Case`, so it cannot see the killer. Returns per guest the kind and
  the rumour target. Built over the seated seven in round 1 and kept for the campaign.
- Saved as her moves: optional `CampaignSave.secrets?: Record<string, 1 | 2 | 3>` (stage reached),
  sanitised in `saveGuards.ts`; no storage prefix bump, cases and goldens unchanged.
- Tests and sweeps: same seed, same secrets; swapping the killer changes nothing (the function doesn't take
  one); over many campaigns the killer's kind and the rumours about the killer are not outliers; every
  seated guest is the target of exactly one rumour.

## Open (owner's calls; defaults given)
- Campaign only, or a cut-down version in Quick play (default: campaign only).
- Six kinds to start, paired kinds later (default yes).
- The accused innocent confesses their secret in face to face (default yes).
- Should a victim's secret come out when they die ("the Uncle's letters were found in the grate")? It adds
  story but touches the moment of death; default: later.
- Does the Secrets page show which stage each guest is at, or just what she's heard (default: what she's
  heard)?
