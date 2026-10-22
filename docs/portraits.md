# Character portraits

Decided 2026-10-22 with the owner, from mockups on the canvas
https://claude.ai/artifact/KawPqx6XDKshtWkMVBbAQV (the "Faceted, three-quarter" board is the chosen
one; its SVG source is the reference drawing).

## Settled

- **SVG drawn in code, not commissioned or AI-generated art.** Realistic detail is lost at counter
  size, and the cast is still changing (`docs/theme-draft.md`).
- **Style: faceless, faceted, three-quarter view.** Large flat facets in the manner of geometric
  "low-poly" portraits of the Mona Lisa or Girl with a Pearl Earring: no eyes or mouth, one small nose
  facet. The face is a lit plane, a shadow plane, a chin shadow and the nose. The head is turned slightly
  to her left. The profile version was tried and is not wanted.
- **Proportions:** the head is big (scaled 1.25 from the crown in the mockup) and the neck short; the
  body is wide (scaled 1.2 sideways about the centre line), with the shoulders reaching nearly to the
  frame edges.
- **Each character is told apart by silhouette, hair, costume and one accent**, never by a face. Mockup
  examples: the Hostess has a dark updo, a burgundy gown with a gold sash, a pearl necklace and one round
  pearl earring; the Maid has a white mob cap and a blue dress with a white collar and apron; the Butler
  has short grey hair, a black tailcoat, a white shirt front and a bow tie.
- **Each portrait has its own muted background** in two tones (one diagonal lighter half).
- **Mood is a tint over the whole portrait:** warm is a gold wash (`#e8a040` at about 16%), neutral has
  none, hostile is a blue-grey wash (`#2a4a6a` at about 24%). This fits the hostile line pool idea in
  `docs/theme-draft.md`. Facial expressions (brows, a mouth facet, a head tilt) are a later layer, not
  part of the first build.
- **Sizes to work at:** cards about 100px wide, floor-plan counters at 52px and 32px (a circular crop
  of the head in a brass ring), and a large view of about 150 x 180px on the person screen.

## The player and the cat

Decided 2026-10-22 from the "You and the cat" board on the same canvas (its SVG is the reference).

- **The player** uses the guests' base figure and parts model. Her parts: long black hair falling
  behind the shoulders and framing the lit side of the face; large round glasses, **both lenses the same
  size and facing forward** (no foreshortened far lens, no arm to the ear: that read as wrapped round
  the head); a rust-red scarf wrapped at the neck with one end hanging down the front; a dark charcoal
  coat with the collar turned up, a lapel notch, a shoulder seam, a front edge line, two pocket flaps and
  two rows of brass buttons. Dusty-rose background, so the dark hair keeps its silhouette.
- **The cat is its own figure, not the human base** (the human base made it look like a person). A
  chubby tabby, faceless like the guests: a wide round head that fills most of the frame (wider than
  tall), big ears in the top corners, fluffy cheek ruffs, two pale whisker pads, a chin and a small pink
  nose, the forehead "M" and side stripes; the body is a low mound reaching both frame edges, with a
  cream chest and two paws. Sage background.
- **The cat is zoomed in compared to the people**: its counter crop is almost the whole frame
  (`viewBox 4 6 92 92`), where a guest's crop is the head only (about 50 x 50).
- Coats are recoloured per cat name (settled below).

## Settled 2026-10-22 (second pass)

- **Cast: the theme-draft pool of 10** (Host, Hostess, Butler, Conjurer, Housekeeper, Financier, Uncle,
  Elder heir, Younger heir, Detective), keyed by the ids the theme content will use: `host`, `hostess`,
  `butler`, `conjurer`, `housekeeper`, `financier`, `uncle`, `elder-heir`, `younger-heir`, `detective`.
  The theme session must keep these ids. A guest id with no parts keeps today's initials counter, so
  only the Butler shows a portrait until the theme lands; the `#dev` inspector has a gallery of all 10.
- **The portrait sits in an ivory card frame** on the person screen, with the role name under it. Normal
  play never shows a tarot card. When tarot mode exists, only the label changes (card numeral and name).
- **Mood tint follows the greeting:** the step is `min(mood + beats heard, top)` (`greeting` in
  `src/game/talk.ts`): step 0 is the hostile wash, middle steps have no tint, the top step is the warm
  wash. The tint shows on the large view and cards, **never on counters** (52px, 32px, grid mini).
- **The cat is one tabby figure recoloured per cat name** (`cats` has five); the coat follows the case's
  cat (`cats[c.number % cats.length]`).

## Parts model

Kept outside `Content` (like `cats` and talk), so portraits never change a case: no golden or storage
change.

- **Frame:** `viewBox 0 0 100 120`. Layers, back to front: background (two tones, one diagonal lighter
  half), hair back, body group, head group, front accents. The body group is
  `translate(-10,0) scale(1.2,1)`, the head group `translate(-12.5,-7) scale(1.25)`, as in the
  mockup; parts are drawn in the untransformed coordinates. Head and body stay separate groups (head
  tilt later).
- **Base figure** (code): face lit plane, shadow plane, chin shadow, nose facet; neck and neck shadow;
  left (lit) and right (shadow) shoulder blocks in the costume colour.
- **Per-guest data** (`src/content/portraits.ts`): `skin`, `hair {style, colour}`,
  `headwear? {style, colour}`, `costume {style, main, trim}`, `accent? {style, colour}`,
  `background [dark, light]`, and an optional counter crop (default `25 20 50 50`). One colour per
  part; lit and shadow tones are derived in code (`shade`). Style ids name generic shapes ("updo",
  "tailcoat"), never a person.
- **Shapes** (`src/game/portrait*.ts`, plain TS, node-tested): a library of styles returning polygons and
  circles in that frame, plus `portraitShapes(parts, tint)`. `Portrait.tsx` is a thin SVG over it with
  two views: `full` (100 x 120) and `counter` (the crop, circle-clipped by the counter's CSS).
- **The player** uses the same model (long hair, glasses as an accent, scarf and coat costume). **The
  cat** is its own figure with a coat (`base`, `shade`, `stripe`, `chest`, `nose`) per cat; its counter
  crop is `4 6 92 92`.

### The ten guests (first pass; tune in the gallery)

| Guest | Hair / headwear | Costume | Accent | Background |
|---|---|---|---|---|
| Host | short dark grey, side parting; full short beard | bottle-green smoking jacket, quilted shawl lapels, cravat | gold pocket square | oxblood |
| Hostess | dark updo | burgundy gown, gold sash | pearl necklace, one pearl earring | plum brown (mockup) |
| Butler | short grey | black tailcoat, white shirt front | bow tie | stone (mockup) |
| Conjurer | slick black; tall top hat | black cape with red lining, white tie | red lining at the collar | deep teal |
| Housekeeper | grey bun | high-necked black dress, white lace collar | silver keys at the waist | sage (the Maid mockup's) |
| Financier | slicked-back dark | charcoal suit, red waistcoat | monocle, gold watch chain | dusty gold |
| Uncle | bald crown, white sides; bushy white beard | brown tweed jacket, knitted waistcoat | none | slate blue |
| Elder heir | sandy, swept back | navy high-collar jacket, brass buttons | medal ribbon | brick |
| Younger heir | golden curls | cream summer jacket, open collar | flower in the buttonhole | sky |
| Detective | short auburn bob; grey fedora | slate tailored jacket, white blouse with a bow | silver brooch | heather |

Skin tones vary across the ten (light to deep); every silhouette differs from its neighbours at 32px.

## Open

- Where the player's portrait appears (the case intro, a profile). Not in the first build.
- Whether the cat's counter replaces the cat's name in hint copy. Not in the first build.
- The questioning game (`InterrogationGame`) still shows initials; counters elsewhere and the person
  screen show portraits (wired 2026-10-22).
