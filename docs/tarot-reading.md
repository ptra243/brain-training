# Tarot reading (the detective behind the cards)

Handoff from the 2026-11-10 critique and prototype session. Exploratory: nothing here is in the game.
The playable prototype is the artifact **The Ashby Sitting**
(https://claude.ai/artifact/5k3iq1X2eR2KE7Q9QpnbU3); read it with the Artifact tool, not WebFetch. It
is a single HTML page outside the repo, like the earlier sittings.

Not the same thing as Tarot match (`docs/tarot-match.md`, the memory game) or the dog fight
(`docs/nosing-around.md`). Those are in the game; their critique is at the end of this file.

## The idea

She is a detective posing as a fortune teller. A suspect sits for a reading. She turns cards, tells the
sitter what they show, watches the reaction, and works out what the sitter is hiding. The owner's
original idea, and the version he liked most, is The Ashby Case.

## What the owner said (the feedback to design from)

- **The Ashby Case was closest to the original idea, but it became automatic.**
- **"It was automatic but it had a certain charm to it. It felt like I was doing a reading."** This is
  the main finding. The feel of doing a reading comes first; the puzzle comes second. Do not trade the
  ritual (turn a card, say what it means, watch her) for a harder logic problem.
- **A reader does not ask questions.** The first rebuild had "Where were you at nine?" and he called it
  out. The reader states what the card shows; the sitter agrees, corrects or fills in.
- **It should mirror how a real reading goes:** a question from the sitter, a spread whose positions
  have fixed meanings, card meanings applied to the position, the cards read together, a closing card.
- **There are different spreads**, and he wants them used
  (https://www.tarotnova.app/blog/most-used-tarot-spreads).
- **The detective's inner monologue should guide the right choices**, "since they'd know what they're
  doing". Earlier versions had it; a blank logic board left him stuck with no idea how to progress.
- **How much the detective helps could be the difficulty setting.**
- **The Nine Cards was a different direction he wanted to try; it was too confusing.**

## How the current version played (owner, 2026-11-11)

- **It does not play like a conversation.** Each card is its own exchange.
- **The choices feel arbitrary**, even though they come from the card.
- **There is no goal to aim at.**
- His idea: start at the clue and build the deck towards it, so the sitting reads like a story.

Why, from the prototype's code:

- Her answer is keyed to the position, not to what you said: "Yes. X" or "No. X" with the same X.
  Nothing she says changes the next card, and the cards can be read in any order.
- Your notes are not on screen while you read a card, so nothing favours one reading over the other.
  The choice only moves trust. Landing on the hidden truth earns a flat "No" and less text, so the
  best play is to tell her what she wants to hear.
- The detecting happens afterwards, in a separate thinking step. The reading and the puzzle are two
  games back to back.
- What you are trying to find out is never stated; it only appears at the last card.

## The Rigged Sitting (prototype, 2026-11-11)

Artifact: https://claude.ai/artifact/KBqDgaASHVGmYnr3XB4ipE. The owner's framing: the detective is
rigging the deck to get the answers she wants. He has not yet said how it plays.

Version 1 (five cards in the sleeve, four beats, palm a card after each of her lines): he liked it,
but there was too much scrolling. The current one (version 6) is two spreads of three cards, laid
out for one phone screen at a time:

- **The first spread is honest**, on her own question (behind her, where she stands, what she
  asks). Whichever card falls, she lets one thing drop per card. Those three things replace most
  of the detective's notes, so the stacking that follows builds on what she said. Tap the
  face-down card, or the button, to turn.
- **You choose what the card means for her** (version 6). The owner asked why "I see someone
  walking a house alone, with a lamp" would get an answer: the line described the picture and said
  nothing about her. Now the card's picture is read out, then you pick one of two statements about
  her. One repeats what she has already told you and gets a nod; the other is a near miss she can
  put right ("...while you sat with him." "I wasn't with him. I was at evensong"), and the
  correction is what she lets drop. A nod costs nothing: the other line is still there. Easy says
  which gap to aim at, medium gives the principle, hard nothing. **Owner, after playing it: "I
  think it worked."** The rigged spread's lines have not had the same treatment yet; that is the
  next step.
- **The goal sits at the top** as a statement ("Find out who was in the house at nine"), and turns
  into the clue when she says it.
- **Three positions, built backwards from the clue:** the anchor (something she will agree with,
  taken from the notes), the obstacle (what she is guarding), the resolution (what brings it out).
  This is the form that looks easiest to generate from a case: a known fact fills the first slot
  and the clue fills the last.
- **Stack the deck for the second spread:** from what she let drop and two notes, place one of six
  cards in each position. Two cards fit each position; The Sun fits two of them and The Tower fits none. All the
  choosing happens here.
- **The sitting is turn, read, listen.** A card that suits its position gets her talking; one that
  doesn't gets a true line that goes nowhere.
- **After a miss, an honest card off the deck** moves her along, so she can't get stuck; it counts
  as luck.
- **The reading is told back as one sentence** at the end, a clause per card that landed ("She left
  for evensong at eight, her husband sat on with Dr Marsh, and the doctor was still there at nine").
- **Levels change only the detective's voice** while stacking: easy gives the plan, medium the
  principle, hard nothing.
- No lies, no trust meter, no thinking step. She is guarded, not lying, so every line is true.
- One hand-written sitting, the Ashby cast again. One exchange shows at a time; the rest folds away.

Ideas not yet tried (owner asked for ideas, 2026-11-11): upright or reversed chosen when stacking
(gentle or pressing); one card with two meanings by position as the core; the card that doesn't fit
her story, as lie-catching inside the conversation; a spare card up the sleeve for when the plan
breaks; and "order the evening" as a small minigame of its own (cards stand for events, the answer
is an order, generated from the case's timeline).

Next idea, agreed in principle but not built: different spreads for different things, chosen by
what you need. Past, present, future for where or when; the relationship spread (her, the other,
the bond) for who was with whom; the decision spread (wants, fears, cost) for why. In the game the
clue's kind would pick the spread; in the prototype it would be a choice after the honest spread,
with the goal as the guide.

To judge: is picking the line a decision or "always take the one that sounds wrong"; is stacking a decision or matching cards to
labels; does the story at the end pay off; does anything still scroll. Nobody has checked the
rendered layout at 360px: the browser pane only shows a local file as a static snapshot.

## The earlier prototypes (all artifacts on the owner's account, 2026-10-25/26)

| Prototype | What it adds | Verdict |
|---|---|---|
| Reading the Room | Four cards, turn, read aloud, watch the reaction, guess the secret | The core works; too thin |
| The Long Sitting | One client, three spreads, answer pairs, the detective corrects you, scored by mistakes | Best fit for her |
| The Ashby Case | A murder suspect who lies, a baseline spread to learn her tell, rig the deck, call out a reaction, reversed cards, an accusation | The owner's favourite; too many rules at once; goes automatic |
| Lantern Vale | A day in town, trust and cover, a case board that pins a claim against evidence | Best deduction; a separate, much bigger game |
| Echoes | Chips × mult, poker-style patterns | Fun engine, wrong fit; the client becomes a score target |
| The Nine Cards | 3×3 grid, five readings for nine cards, prophecies, lines, patience | Too confusing: six systems at once, and the scoring has nothing to do with the truth |

Design docs beside them: "The Reader of Lantern Vale" (the full town game, with its own "Lessons from
the prototypes") and "Tarot Scoundrel — Idea" (a Scoundrel dungeon crawl as the campaign; untested, its
first step is that she plays plain Scoundrel).

Worth keeping from all of them: turning a card and watching her before you speak; answer pairs, so
"close" and "no" are evidence; the detective always gets there, scored by mistakes (the same promise
as "she can never get stuck"); the baseline spread that teaches her tell; major arcana as people (ties
to the hidden tarot layer in `docs/theme-draft.md`).

## Why The Ashby Case went automatic (from its code)

- Her lying was a code, not a lie: true → "denied, ring turned", near → "hesitated", wrong → "agreed".
  Once spread 1 taught that, every reaction translated straight back.
- The thinking step was a lookup of what the reaction had already said.
- Every card was its own question; nothing on one card changed how to read another. Root cause.
- Calling out a reaction and rigging the deck were free answers.

## What the current prototype does

One sitting, about seven cards:

1. **Pick how much the detective says** (easy, medium, hard).
2. **Three cards on her own question.** She has no reason to lie; this teaches how she sounds, and
   that the ring means "this card matters to her", never "she is lying".
3. **Choose the second spread**: the Cross (the night), the Relationship spread (the people) or the
   Decision spread (her heart). She lies under one or two cards and only the right spread lays them.
4. **Read each card.** The card shows its real meaning and can be read two ways in its place. A
   reading that suits her story gets agreement; one that doesn't gets a correction and costs trust.
   A reading that lands on the hidden truth gets a flat "No" and nothing else.
5. **Stay with a card** to draw her out: she says more in her own words; costs trust (5 in all).
6. **Her own thoughts**, then the **synthesis card**: tell her which card "will not lie flat", she lets
   the truth slip, and you read her the ending (one of three).

Rules behind it:

- **Lies show only as contradictions.** A lie sounds like a truth. It is caught by setting what she
  said against the detective's notes, or against something else she said. Against a note it is a proven
  lie; two of her own answers only show that one of them is false.
- **Some contradictions need her own words**, which only "stay with this card" gives.
- **One of the two readings always fits her story.** Fully random options made her walk out on bad luck.
- **Fate deals a card whose meaning can carry both readings** (tags on cards and readings); about one
  card in thirty falls back to a looser fit.
- **Help levels change only the detective's voice**, never the case:

| | Easy | Medium | Hard |
|---|---|---|---|
| After she speaks | Says what it clashes with, or that a card has more in it | "That doesn't sit right" | Silent |
| Choosing the spread | Recommends one | Repeats her line worth following | Nothing |
| Before the last card | One thought per screen, with the detective's lean, one pair that fits | One thought per screen, no lean, two pairs that fit | A board of claims and notes, with "I'm stuck" |

- A wrong spread is not a dead end: the detective says so, and "none of these" is then the right call.
- Three hand-written cases share one cast and question: she did it, she is shielding the doctor, she is
  innocent and was leaving him.

## Open questions

- Does the current version keep the charm, or does the thinking step interrupt the reading? Start
  from easy.
- Is choosing a reading a decision, or a guess at what she wants to hear?
- Does choosing the spread feel like detection or luck? On hard there is almost nothing to go on.
- Where would this live: replacing or joining the questioning in a case, or a game of its own? For the
  questioning it would have to be generated from the case (seeded, replayable), and clue facts may not
  map cleanly onto readings. Nothing has been tried.
- The cards do little beyond limiting what can be said. Major arcana as people is not in this version.
- Hand-written cases cannot be replayed, which breaks "same ref = same case" if it joins the game.

## The tarot games already in the game (critique, 2026-11-10)

- **Tarot match**: forgiving by design, and the third joker rule (the free card never takes a flip) is
  the best of the three. But it is not really a puzzle (no cost, so tap until done), the joker is luck,
  the faces are coloured shapes with nothing tarot about them, and the cat hint can show a card she
  cannot yet pair. Suggested: draw the minor arcana pips (`docs/tarot-faces.md`, step 1), fix the hint
  to show a pair, and decide whether it earns its 25% share of Play cases. Leave the joker alone.
- **Dog fight**: the strongest of the three; the number grid is a real decision and it is always
  winnable. The tarot is only a label (suits do nothing), defence is thinner than attack, and it is
  rarely seen. The deck-builder idea (`docs/dog-deck-builder.md`) is where suits and the major arcana
  would start to mean something.
