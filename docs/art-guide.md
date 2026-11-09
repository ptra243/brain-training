# Art guide

The rules for every drawing in the game: portraits, full-body standees, room plates and props. Started
2026-11-04 with the owner. Portrait detail (the parts model, sizes, the player and the cat) stays in
`docs/portraits.md`; this doc is the umbrella over it. The housekeeper game (`docs/housekeeper-dispatch.md`)
is the main user of standees, room plates and props, so its needs shape the rules below.

## Settled

- **Everything is SVG drawn in code.** No AI-generated or commissioned images. The style is low detail on
  purpose, so code can draw it, it stays crisp at every size, and a look is a data entry that is cheap to
  change.
- **One visual language: flat facets.** Large flat planes in a lit tone and a shadow tone (derived in code
  with `shade`, never picked by hand), no outlines on figures, no gradients, no texture.
- **Faceless.** People and animals have no eyes or mouth (`docs/portraits.md`). A character is told apart
  by silhouette, hair, costume, one accent and their colours.
- **Quiet colours.** Muted, slightly dusty tones that sit on the baize and ivory paper
  (`src/styles.css`). The floor plan is the one bold element; art never outshouts it.
- **Content is data.** Who looks like what lives in `src/content/` (`portraits.ts` today); shapes live
  in `src/game/portrait*.ts` with generic style ids ("updo", "briefcase"), never a character's name.
  Art is kept outside `Content`, so changing a look never changes a case or a save.
- **Old looks are kept.** Replacing a look moves the old entry to `earlierPortraits` (and the same for
  later art types), with the date and the reason, so it can come back. See "Earlier looks" below.
- **Modern day** (owner, 2026-11-04). Costumes and props are present-day: dinner jackets, open collars,
  phones and laptops. No top hats, monocles, tailcoats or cravats on current looks.
- **The nose** (2026-11-04) is a thin lit bridge, a shadow side and a small tip, two thirds of the face's
  height above the chin, just left of centre: the head is turned slightly to the viewer's left (the narrow
  shadow strip on the right is the side of the head). One position for everyone; a per-character nose
  setting (a bigger nose further left) is an option if a face needs it.

## Art types

| Type | What it is | Frame | Where it shows |
|---|---|---|---|
| Portrait | Head and shoulders, three-quarter view | 100 × 120 | Cards (~100px), counters (52 and 32px, head crop), large view (~150 × 180), talk spread |
| Standee | Full body, the portrait's head and torso with legs, feet and arms added; a cut-out with a thin ivory edge | 160 × 240 (viewBox `-30 0 160 240`, so the portrait's 0–100 stays centred) | Room plates in the housekeeper game; later the opening scene |
| Room plate | A printed plate of one room: the room's tint, a few flat furniture shapes, a landmark, a display spot | 360 × 220 (phone width) | Housekeeper game: staff reports, her own errand, the recall statement |
| Prop | A single object as a line icon in ink on paper colours, like the shelf labels (`labelArt.tsx`) | 34 × 34 viewBox | On room plates, request cards, picture choices, clue notes |

### Standees

- **Same character, taller.** The head and torso are the portrait's parts at the same scale, so she
  recognises a guest from their card. The new parts are below the waist (trousers, skirt or gown, shoes)
  and the arms, chosen per costume like hair is now.
- **Proportions** follow the portrait (big head, wide shoulders), so a standee is about 3.7 heads tall:
  a chunky game piece, on purpose.
- **Arms are one or two flat blocks each**, with a shirt cuff and a hand as a plain skin-tone block in
  the lit and shadow tones: no fingers. A carried prop sits against the body.
- **Poses are data** (`pose` in `standees`, shapes in `src/game/standee.ts`). The first is
  `hands-on-hips` (the Host, elbows out, feet wide), which is why the frame is 160 wide. Every extra pose
  needs arm and leg shapes for every costume, so a pose is added only when a game needs it.
- **The mood tint does not apply** to standees.

### Room plates

- **Straight-on view**, as if looking at one wall: floor, back wall, and 3–4 furniture shapes from the
  room's `things` list (`docs/housekeeper-dispatch.md`, Rooms table).
- **The room's tint** (the content's room colour) on the wall, so the plate matches the floor plan.
- **One landmark per room** that no other room has (stove, piano, fountain, staircase), placed in the
  same spot every time.
- **Fixed layout per room.** The same room always draws the same; only people, props and the display
  spot change. This is what makes the vanishing object fair.
- **Layers:** plate, furniture, display spot, standees, props, so a game can show, move or hide any one.

### Props

- **Line icons** in `--ink`, strokes 1–1.6px, fills only from the paper's muted colours.
- **Distinct outlines:** no two props that can appear in the same game share a silhouette (a phone and a
  folder must differ by shape, not just detail).
- **Weapons are props too**, drawn from `docs/housekeeper-dispatch.md` (Weapons table). Decoration never
  looks like a weapon that isn't in the content.

## Memory rules (for any picture she has to recall)

The housekeeper game quizzes her on what she saw (`docs/housekeeper-dispatch.md`, rules 3 and 4), so its
pictures must be easy to remember.

1. **One signature per character, everywhere.** A guest keeps the same main colour and accent on their
   portrait, standee and counter. Their signature prop (the Lawyer's briefcase, the Detective's
   notebook) is drawn the same way every time.
2. **Staff are told apart by colour and icon** (speech bubble, eye, wrench), also on their standees, and
   always look like staff (aprons, overalls), never like a guest.
3. **Few things per picture,** following the difficulty table in `docs/housekeeper-dispatch.md`.
4. **A quizzed detail is drawn large** and in clear view, never a tiny shape in a corner.
5. **Picture choices are drawn identically**: same size, frame and style, so the right answer never
   stands out.
6. **Nothing moves between visits** except what the game means to change.

## Cast

The single list of who is who. Ids never change (`docs/portraits.md`); roles and looks can.

| Id | Role now | Gender (`docs/story.md`) | Portrait | Notes for the look |
|---|---|---|---|---|
| `host` | Host | Man | Current (modern since 2026-11-04: velvet dinner jacket, open-collar shirt) | Signature: bottle green, gold pocket square. Has the first standee (hands on hips) |
| `hostess` | Hostess | Woman | Current | |
| `butler` | Fixer | Man | **Needs a new look** (still drawn as a butler) | Worked up from the factory floor; sorts out the Host's problems quietly. Signature props: folder, car keys |
| `conjurer` | Investor | Never given | **Needs a new look** (still drawn as a conjurer in a top hat) | Runs the fund that made the offer; charming. Signature props: tablet or papers, a glass |
| `housekeeper` | Housekeeper | Never given | Current (reads as a woman: bun, dress) | See open question 1 |
| `financier` | Lawyer | Never given | **Needs a new look** (still drawn as a financier with a monocle) | The family's lawyer; holds the will. Signature props: briefcase, documents |
| `uncle` | Uncle | Man | Current | |
| `elder-heir` | Elder heir | Woman (daughter) | **Needs a new look** (still drawn as a young man in a military jacket) | Works at the company and expects to run it. Signature props: files, coffee |
| `younger-heir` | Younger heir | Man (son) | Current | |
| `detective` | Detective | Never given | **Needs a modern touch** (the fedora reads as a period costume); reads as a woman: bob, blouse with a bow | See open question 1 |

## Pipeline: adding or changing art

1. **Describe it here first:** the cast table row (or the type's section) says what it looks like and
   its signature colour, accent and prop.
2. **Keep the old one:** if a look is replaced, move the old entry to `earlierPortraits`
   (`src/content/portraits.ts`) with the date and the reason.
3. **Add the data:** the new entry in `src/content/` (parts and colours only).
4. **Add shapes if needed:** a new generic style in `src/game/portraitParts.ts` (or the matching file for
   standees, plates and props), node-tested.
5. **Check it in the art gallery** (`#dev/portraits`) at 360 × 780: next to its neighbours, at 32px for
   counters, and on a room plate for standees and props. The owner picks looks from the gallery.
6. **Run `npm run checks`** and the portrait e2e test (`e2e/portraits.spec.ts`), then commit.

## Earlier looks

Looks no longer in use, kept in `earlierPortraits` so they can come back.

| Id | Look | Replaced | Why |
|---|---|---|---|
| `host` | Smoking jacket: bottle-green, quilted shawl lapels, cravat | 2026-11-04 | The setting is modern |

Next to move here: the Butler, Conjurer, Financier and the male Elder heir, when their new looks land
(descriptions in the first-pass table in `docs/portraits.md`).

## Open

1. **Ungendered characters.** The Investor, Lawyer, Housekeeper and Detective are never given a gender in
   copy. Should their looks be androgynous too? Today the Housekeeper and Detective read as women.
2. **Staff looks.** The three hired staff (`docs/housekeeper-dispatch.md`) need standees and a colour
   each; their names and faces are still placeholders.
