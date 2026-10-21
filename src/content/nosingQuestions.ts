/**
 * Household wording for the maths questions, per kind. Placeholders {a}, {b}, {c} are filled by
 * `src/games/mentalMaths.ts`. Generic nouns only: no characters, rooms or theme names.
 */
export const nosingQuestions = {
  // easy
  add: [
    'The larder has {a} tins on one shelf and {b} on the next. How many tins in all?',
    'The hall clock has chimed {a} times today and will chime {b} more. How many chimes in all?',
    'A bill has {a} pounds for the groceries and {b} pounds for the milk. What is the total?',
    'There are {a} stairs up to the landing and {b} more to the attic. How many stairs in all?',
  ],
  subtract: [
    'The larder had {a} eggs and {b} were used for baking. How many are left?',
    'A jar holds {a} biscuits and {b} have been eaten. How many are left?',
    'The coal scuttle held {a} lumps and {b} went on the fire. How many are left?',
    'A roll of ribbon is {a} inches long and {b} inches were cut off. How many inches remain?',
  ],
  times: [
    'There are {a} shelves with {b} jars on each. How many jars?',
    'The clock chimes {b} times an hour for {a} hours. How many chimes?',
    'A box holds {b} candles and there are {a} boxes. How many candles?',
    'Each loaf is cut into {b} slices. How many slices from {a} loaves?',
  ],
  clockGap: [
    'The kettle went on at {a} minutes past the hour and clicked off at {b} minutes past. How many minutes did it take?',
    'The hall clock showed {a} minutes past, and later {b} minutes past in the same hour. How many minutes went by?',
    'The bread went in the oven at {a} minutes past and came out at {b} minutes past. How many minutes did it bake?',
  ],
  // medium
  timesTwo: [
    'The larder has {a} jars of jam in each crate. How many jars in {b} crates?',
    'A train carriage has {a} seats. How many seats in {b} carriages?',
    'A pack holds {a} sheets of paper. How many sheets in {b} packs?',
    'The clock is wound {b} times a week, {a} turns each time. How many turns in a week?',
  ],
  change: [
    'The grocer\'s bill comes to {b} pounds and you pay with {a} pounds. How much change do you get?',
    'A loaf and a pie cost {b} pounds together. You hand over {a} pounds. What is your change?',
    'The coal merchant charges {b} pounds. You pay {a} pounds. How much change?',
  ],
  percent: [
    'The shop takes {a}% off a {b} pound coat. How many pounds is the saving?',
    '{a}% of the {b} biscuits in the tin have been eaten. How many is that?',
    'The bill is {b} pounds and a tip of {a}% is added. How many pounds is the tip?',
  ],
  gap24: [
    'The train leaves at {a} and arrives at {b}. How many minutes is the journey?',
    'The oven went on at {a} and was turned off at {b}. For how many minutes was it on?',
    'The clock in the hall shows {a} when the post comes and {b} when the next post comes. How many minutes between the posts?',
  ],
  // hard
  steps: [
    'There are {a} crates with {b} tins in each, and {c} loose tins besides. How many tins in all?',
    'A bill is {a} items at {b} pounds each, plus {c} pounds for delivery. What is the total?',
    'The larder has {a} shelves with {b} jars each, and {c} more jars on the floor. How many jars?',
  ],
  stepsLess: [
    'There are {a} boxes of {b} candles, and {c} candles are used. How many are left?',
    'A bill is {a} items at {b} pounds each, less a voucher of {c} pounds. What is left to pay?',
    'The larder had {a} trays of {b} eggs, and {c} were broken. How many eggs are left?',
  ],
  fraction: [
    '{a}/{b} of the {c} biscuits in the tin are chocolate. How many are chocolate?',
    'The clock was wound for {c} minutes and {a}/{b} of that time has passed. How many minutes is that?',
    'A bill of {c} pounds is split, and one share is {a}/{b} of it. How many pounds is that share?',
  ],
  backwards: [
    'The train arrives at {a}, after a journey of {b} minutes. When did it leave? Answer as hhmm, so 9:05 is 905.',
    'The bread came out of the oven at {a} after baking for {b} minutes. When did it go in? Answer as hhmm, so 9:05 is 905.',
    'The post arrived at {a}, {b} minutes after it was sorted. When was it sorted? Answer as hhmm, so 9:05 is 905.',
  ],
} as const;

export type QuestionKind = keyof typeof nosingQuestions;
