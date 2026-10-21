// PLACEHOLDER talk content. The real lines and threads are written in the
// "Theme content" session; this exists so the Talk section runs and the
// checks have something to build from.
//
// Rules for content:
// - Never name a card in a line or beat.
// - Loose lines never state times or alibis ("all night", "for hours", where
//   someone was). They are colour, not evidence.
// - A thread is 2 to 3 beats, heard in order.
// - Kept out of `content` (like `cats`) so it never changes a case.

import type { CardReading, TalkContent } from '../engine/types.ts';

const reading = (neutral: string[], bound: string[], threads: string[][]): CardReading => ({
  lines: { neutral, bound },
  threads,
});

export const talk: TalkContent = {
  suspects: {
    cook: { card: 'empress', mayAlsoRoll: ['emperor', 'hermit'] },
    butler: { card: 'emperor', mayAlsoRoll: ['empress', 'strength'] },
    gardener: { card: 'fool', mayAlsoRoll: ['magician', 'lovers'] },
    maid: { card: 'lovers', mayAlsoRoll: ['fool', 'empress'] },
    doctor: { card: 'hermit', mayAlsoRoll: ['magician', 'strength'] },
    painter: { card: 'magician', mayAlsoRoll: ['fool', 'lovers'] },
    chauffeur: { card: 'strength', mayAlsoRoll: ['emperor', 'hermit'] },
  },
  cards: {
    empress: {
      upright: reading(
        ['Have you eaten? You look as though you could use something.', 'People are easier to talk to with a cup of tea in hand.', 'I like a house where everyone is looked after.'],
        ['I keep a spare apron in my pocket. You never know.'],
        [
          ['I always think the best of people. It saves a lot of worry.', 'Even so, one of them has been short with me lately.', 'I would sooner not say who. Not yet.'],
          ['Somebody asked me for a favour that felt odd.', 'I did it anyway. Now I am not so sure.'],
        ],
      ),
      reversed: reading(
        ['I do not have time for idle chatter.', 'Nobody thanks you for keeping a house running.', 'Mind where you put your feet.'],
        ['If one more person tracks mud in, I will scream.'],
        [
          ['I have said my piece to the others already.', 'They do not listen, so why should I repeat myself?', 'Ask them who has been taking more than their share.'],
          ['There is a tidy way to do things and a careless way.', 'Someone here has been careless on purpose.'],
        ],
      ),
    },
    emperor: {
      upright: reading(
        ['Order matters, especially on a difficult day.', 'I have seen worse, and I have seen it handled better.', 'Ask what you like. I will answer plainly.'],
        ['I keep the keys tidy. Always have.'],
        [
          ['People tell me things, because I make a point of listening.', 'There has been a coolness between two of the guests.', 'I will not say more without being sure.'],
          ['Something was moved that should have stayed put.', 'I noticed it straight away.'],
        ],
      ),
      reversed: reading(
        ['I hardly think this is the proper way to go about it.', 'Standards have slipped, and I will say so.', 'I am not in the habit of explaining myself.'],
        ['I have given loyal service. That should count for something.'],
        [
          ['You want to know who to trust? Not me, apparently.', 'Look at who is quickest to blame someone else.', 'I will say no more than that.'],
          ['There is a thing I should have reported sooner.', 'I did not, and I regret it.'],
        ],
      ),
    },
    fool: {
      upright: reading(
        ['Lovely light in this house, when it is not raining.', 'I never plan, and it rarely does me any harm.', 'Funny how a place feels different when something has happened.'],
        ['I once talked a hedge into growing straight. Nearly.'],
        [
          ['I hum when I work, and people tell me things without noticing.', 'There was an argument I was not supposed to hear.', 'I will tell you the rest if you promise to be kind about it.'],
          ['I found something where it should not have been.', 'I put it back. Was that wrong?'],
        ],
      ),
      reversed: reading(
        ['Do not ask me to be sensible just now.', 'I said something I should not have, and now everyone is looking.', 'Everything feels slightly off today.'],
        ['I could do with a long walk and no company.'],
        [
          ['I make a mess of things. It is what I am known for.', 'But I am not the only one who has been careless.', 'Check the people who pretend to be careful.'],
          ['I took something that was not mine. Only to borrow it.', 'I think someone saw me.'],
        ],
      ),
    },
    lovers: {
      upright: reading(
        ['It is nice to have someone to talk to, even now.', 'I notice who sits with whom. Not much gets past me.', 'A house is nothing without the people in it.'],
        ['I tidy up after others and it always feels like a conversation.'],
        [
          ['There are two people here who are closer than they let on.', 'I have seen them pass something quietly between them.', 'I would not like to cause trouble for either.'],
          ['One of them asked me to keep a secret.', 'I am not sure I can any more.'],
        ],
      ),
      reversed: reading(
        ['I would rather not talk about the others.', 'People pretend to be friends here. It is exhausting.', 'You are the only one who has asked me anything useful.'],
        ['I have heard enough whispering to last me a lifetime.'],
        [
          ['Two people had words. I will not say who.', 'It was not a small disagreement.', 'Ask them what it was about.'],
          ['Somebody promised me something and then looked away.', 'I have not forgotten it.'],
        ],
      ),
    },
    hermit: {
      upright: reading(
        ['I find it easier to think when the room is quiet.', 'Most people talk too quickly to notice anything.', 'Take your time. I am in no hurry myself.'],
        ['I carry a little notebook. Habit, nothing more.'],
        [
          ['I notice small things: a shut door, a missing glove.', 'One of the guests has been avoiding the others.', 'I would watch that one carefully.'],
          ['I made a note of something odd.', 'It will make sense to you before it does to me.'],
        ],
      ),
      reversed: reading(
        ['I would rather be left alone, if it is all the same.', 'Questions make me nervous, I will admit.', 'I do not know what you want from me.'],
        ['I have said too much already, I think.'],
        [
          ['I keep my own counsel for good reasons.', 'Someone here has been asking about me.', 'Find out why before you find out anything else.'],
          ['There is a thing I have not told anyone.', 'It may be nothing. It may not.'],
        ],
      ),
    },
    magician: {
      upright: reading(
        ['Give me a moment and I can make this house feel quite different.', 'I see a pattern in most things, if I look long enough.', 'Everyone has a trick. Mine is that I admit it.'],
        ['I never go anywhere without a pencil. You never know what you will want to sketch.'],
        [
          ['Appearances are my business, so I notice when they are wrong.', 'One of the guests is not quite who they seem.', 'I will point you in the right direction, no more.'],
          ['I saw a gesture that did not fit the person.', 'It stuck with me.'],
        ],
      ),
      reversed: reading(
        ['I am not in the mood for games.', 'Everything I try today comes out wrong.', 'Do not look at me like that.'],
        ['My hands are shaking. It is only the cold.'],
        [
          ['I know what it looks like when someone is putting on a show.', 'Someone here has been doing exactly that.', 'Ask who gains from all the confusion.'],
          ['I was asked to keep quiet about something.', 'I took the money and I wish I had not.'],
        ],
      ),
    },
    strength: {
      upright: reading(
        ['I do not say much, but I listen.', 'Heavy work makes you patient.', 'If anything needs lifting or carrying, I am your person.'],
        ['I like machines that do what you tell them.'],
        [
          ['Staying calm is half the job.', 'One of the guests has not been calm at all.', 'I would keep an eye on that one.'],
          ['I was asked to do a small errand.', 'It struck me as strange afterwards.'],
        ],
      ),
      reversed: reading(
        ['I am tired, and I do not feel like being polite.', 'I did what I was told. That is all.', 'Do not push me.'],
        ['My patience is thin today, and I will not pretend otherwise.'],
        [
          ['People assume the quiet one has nothing to say.', 'They are wrong, but they never ask.', 'Ask me who has been giving the orders.'],
          ['There was a harsh word, and I answered it badly.', 'I am not proud of that.'],
        ],
      ),
    },
  },
  greetings: {
    cold: ['You again?', 'Fine, sit down.'],
    warm: ['Hello again.', 'Good to see you.', 'Come in, come in.'],
  },
};
