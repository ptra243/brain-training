# The story: why everyone is at the house

Decided with the owner 2026-10-29. This is the frame every talk line, motive and opening hangs off.
Voice rules (plain modern English, nothing that needs time to have passed) are in `docs/theme-draft.md`.

## The evening

The family's chocolate company turns 50. The Host invites family, staff and a few others to the
family house for the weekend to celebrate. At breakfast the Host will announce whether the company
goes to one of the heirs or is sold to the Investor, whose fund has made an offer. Nobody knows which.

The Investor is one of the 10 guests (the Conjurer's slot and Magician card: the pitch and the charm),
so they can be a suspect or the victim. If the Investor dies, the offer dies with them.

A storm cuts the road, so nobody comes or goes. After dinner someone is killed. One of the guests did it.

It works whoever dies. If the Host is the victim, the decision never gets made, and that hangs over
everyone. In a campaign the later bodies keep raising the same question: who gains now?

## Why each guest is there

Ids stay as they are (saves and seeds use them); only display names and bios change.

| Guest (id) | Why they're there | What's at stake |
|---|---|---|
| Host (`host`) | Founded the company and called the weekend | The decision |
| Hostess (`hostess`) | Helped build the company and never got the credit | Wasn't asked |
| Assistant (`butler`, was the Butler) | The Host's assistant for twenty years; knows everyone's diary and secrets | A job, if it's sold |
| Housekeeper (`housekeeper`) | Runs the family house | Hears everything said in it |
| Accountant (`financier`, was the Financier) | Keeps the company's books | Knows what it is really worth |
| Uncle (`uncle`) | Co-founded it and was pushed out years ago; still owns shares | An old grudge, and a vote |
| Elder heir (`elder-heir`) | Works at the company and expects to run it | Everything |
| Younger heir (`younger-heir`) | Left to do something else | Everyone assumes they'll come back for the money |
| Investor (`conjurer`, was the Conjurer) | Runs the fund that made the offer; came to close the deal in person | The deal, and whatever they know about the books |
| Detective (`detective`) | A family friend, invited as a guest | Wants to solve it before you |
| You (the Fool) | Knocked on the door in the storm with your dog, and they let you in | Nothing, which is why you can be trusted |

## How motives use it

Every motive answers one question: what does this guest gain or lose depending on the company, and
the decision? The tarot card picks which version she hears (home or borrowed card, upright or
reversed). Chocolate gives the jokes: the secret recipe, tasting, the rival brand, the buyer.

Still true from `docs/theme-draft.md`: a motive is never a clue, never says where anyone was or what
they held, and never depends on who the killer is. Nobody lies.

## Still to do

1. Rewrite the 60 motive outlines (`docs/motive-outlines.xlsx`) to hang off this frame.
2. Rename the Financier, the Butler and the Conjurer (display name and bio in `src/content/index.ts`): a content
   change, so `npm run update-golden` and a storage prefix bump.
3. Reword the old-fashioned talk lines (about 54 found by a word search).
4. Build the reaction-to-the-death line under the greeting (draft below, approved in tone).
5. Company name: open. Not a place word from `src/content/caseNames.ts`.

## Reaction to the death (draft)

Shown under the greeting before she asks anything; warm or cold pool by the guest's current mood,
picked once per guest on its own seeded stream, avoiding lines another guest already has.

Warm:
- {victim} is gone, and the whole house has gone quiet.
- {victim} is dead. I've had two drinks and it still doesn't feel real.
- {victim} would have loved all this fuss. That's the worst part.
- {victim} is dead. I'm glad it's you asking and not one of the others.
- {victim} is dead. I keep forgetting, and then remembering.
- {victim} always joked this house would kill someone. Nobody's laughing now.

Cold:
- {victim} is dead and I'm supposed to look upset. I'm doing my best.
- {victim}. Of course. Go on, then, ask.
- {victim} had a lot of enemies. You might need a bigger notebook.
- {victim} is dead, and no, I'm not going to cry in front of you.
- {victim} will be missed. Whether I'll miss them is complicated.
- {victim} is dead and everyone wants someone to blame. I can feel them looking at me.
