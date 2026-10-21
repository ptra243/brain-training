# Character portraits

Decided 2026-10-22 with the owner, from mockups on the canvas
https://claude.ai/artifact/KawPqx6XDKshtWkMVBbAQV (the "Faceted, three-quarter" board is the chosen
one; its SVG source is the reference drawing). Nothing is built yet.

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

## Plan for the build

- **Parametric parts, not one hand-drawn picture per guest:** a base figure (face planes, neck, body
  block), plus per-character parts (hair, headwear, costume, accent, background colours) and the
  mood overlay. The data goes in `src/content/` (content is data); the drawing is a thin React
  component over plain TS that returns the shapes. The portrait for a role is the same in every case
  (no seeded variation, unless we decide otherwise).
- Head tilt for a mood later needs the head as its own group, so keep head and body as separate groups.

## Open

- **Which cast to draw.** The current content has 7 placeholder roles (Cook, Butler, Gardener, Maid,
  Doctor, Painter, Chauffeur); the theme draft has a pool of 10 tarot guests (Host, Hostess, Butler,
  Conjurer, Housekeeper, Financier, Uncle, Elder heir, Younger heir, Detective). The Maid is in neither
  final list. Drawing the theme-draft pool is probably right.
- **Portrait versus tarot card art.** `docs/exploration-mode.md` says the person screen shows "tarot
  card art as the portrait". Decide whether the portrait sits inside a tarot card frame (name and card
  numeral), replaces the card art, or the card stays separate.
- Where the mood comes from (the night's line pool, or something she earns), and whether the floor-plan
  counters show the tint.
