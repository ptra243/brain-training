# Weapons that matter (campaign)

Status: proposed 2026-10-25, nothing built. Feeds the "Hunting the weapon" session in
`docs/next-sessions.md` and answers its open question (what the shortlist puzzle is). Related:
`docs/story-layer.md` (act breaks, summation), `docs/secrets.md`, `docs/killer-lies.md` (the weapon
lie), `src/engine/clues.ts`, `src/content/index.ts` (`items`).

## The problem
A weapon is a bare name today (`items`: knife, rope, candlestick, wrench, poison bottle, vase). Nothing
about the body points at one, nobody has a reason to own or touch one, and "with what" is settled only by
holder clues. The campaign also rolls a new weapon each round. She has no reason to wonder why each one
could have been the weapon.

## 1. The body is the evidence
- **Each weapon leaves marks.** Content gives every item a wound and a trace (example below). The sets
  overlap, so one sign leaves two or three weapons.
- **Each body shows a sign.** A round opens with the cat examining the body: a short scene, then a true
  evidence clue ("a bruise at the temple, and a smear of wax"). Evidence is fact, so this fits "every clue
  is true" with no change to the testimony rules.
- **One weapon all night** (the Hunting plan). Every new body adds a sign, so the second body narrows the
  weapon. A wrong accusation is grim but useful, which is a reason later murders matter.
- **The arc it gives**, matching the Hunting plan: night 1, the wound gives a loose shortlist; night 2,
  the trace narrows it; night 3, holder clues settle it. If she's right on night 1, the round's holder
  clues settle the weapon as they do now.

Example (6 items; a campaign uses 5, so the table must work for any 5):

| Weapon | Wound | Trace |
|---|---|---|
| Knife | blood | a clean cut |
| Candlestick | bruise, blood | wax |
| Wrench | bruise, blood | oil |
| Vase | bruise | water and shards |
| Rope | no blood | a mark on the neck |
| Poison | no mark | a bitter smell |

## 2. Each weapon has a story
- **A home and an owner**, fixed in content, never by the killer: the Housekeeper's rat poison in the
  pantry, the Conjurer's rope from the act, the Host's carving knife. The owner is the killer only as often
  as chance, so ownership is the classic red herring ("it was his knife, but he didn't do it"). A guest's
  talk may mention their own weapon; never where it was tonight (rule 3).
- **A weapon sheet**, like the suspect sheet: what it is, where it's kept and whose it is, the marks it
  would leave (greyed once a sign rules it out), and any talk lines that mention it. Opened from the
  Accuse tab, the grid and the clue cards.
- **Guests' theories.** In the act breaks (`docs/story-layer.md`) guests argue over the weapon. A theory
  only ever names a weapon that still fits the signs she has found, and reads as opinion ("Looks like the
  candlestick to me"), never as a clue. Picked from the speaker's mood, never the killer.
- **Payoff after the verdict.** The summation shows the weapon's path: where it was kept, the killer
  taking it, the scene. With secrets, the motive line can name it.

## 3. Theme the weapons
The six are generic. Matching them to the tarot ties them to the dog fight's suits and tarot mode:
a poisoned goblet (Cups), a letter opener (Swords), a fire poker (Wands), a brass paperweight
(Pentacles), the rope (the Hanged Man) and the candlestick. Any rename is a content change: storage prefix
bump and new goldens, so do it in the Hunting the weapon commit, not alone. Weapon names stay out of
puzzle answers (the CLAUDE.md rule), so check the word lists.

## Engine and fairness
- **A body sign is information**, so it must be a clue the engine knows about. Shown as flavour only, it
  could rule weapons, and through holder clues guests, out, which would break the guarantee that each round
  before the last ends with 2 or 3 possible killers.
- Proposed fact: the murder weapon is one of a set (`weapon-one-of`), compiled against the killer's item.
  Check how `search.ts` and `possibleWeapons` treat it, and whether it should be a free clue of the round
  (it opens the round) rather than a puzzle's.
- `roundProblems` and `check-cases` must prove each night with the signs included: night 1's sign leaves
  at least two weapons, and the last round still settles the weapon.
- Sign choice: the generator picks which mark each body shows (wound first, then trace) from the true
  weapon's marks; it must not pick the mark that alone settles it before the last round.
- Homes, owners, sheets and theories are content and UI only: no case change, any time.

## Open (owner's calls; defaults given)
- The tarot-themed weapons, or keep the six (default: themed, with the Hunting bump).
- Two marks per weapon, or three for more variety (default two).
- Who examines the body: the cat, or the Detective when seated (default: the cat, always available).
- Owners: a guest, a room, or both (default both, guest only where it suits the role).
- Quick play: signs too, or campaign only (default campaign only to start).
