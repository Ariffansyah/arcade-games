import { hash } from "./rng.ts";

/** Long enough that stamina counts, not just a fast first line. */
export const PASSAGES = [
  "The quick brown fox jumps over the lazy dog while the whole room watches and " +
    "nobody says a word, because everybody is busy pretending they knew that sentence " +
    "already, and that they could type it faster than you if it really came down to it, " +
    "which of course it never does.",
  "Old arcades smelled of dust and lightning and warm circuit boards, and the carpet " +
    "was always the same impossible pattern of neon triangles, chosen by somebody who " +
    "understood that a child staring at the floor between games should still feel like " +
    "they were somewhere important.",
  "The trick is to keep typing even when your hands stop agreeing with you. Speed is " +
    "not the fastest you have ever gone; it is the pace you can hold while somebody " +
    "reads the next line over your shoulder and tells you, unhelpfully, that you have " +
    "already made two mistakes.",
  "Every good story starts with someone deciding not to go home yet. The last train " +
    "goes without them, the rain starts, the phone dies, and somewhere between the bus " +
    "stop and the front door the evening turns into the kind of thing they will still " +
    "be describing badly in ten years.",
  "Somewhere a printer is jamming and there is nothing you can do about it. It has " +
    "paper, it has ink, it has been switched off and on again by three separate people " +
    "with three separate theories, and it will begin working the exact moment the person " +
    "who needs it has given up and gone to lunch.",
  "You can learn a lot about a person from the way they queue for a bus, and almost " +
    "everything from the way they behave when it is late. Some people check the time, " +
    "some check the road, and a rare few simply stand there, perfectly content, as if " +
    "the bus were a rumour they had never believed anyway.",
  "Half of speed is not stopping to look at what you already typed. The other half is " +
    "trusting your fingers to know a word you have written ten thousand times before, " +
    "which works beautifully right up until the moment you think about it, and then it " +
    "does not work at all.",
  "Rain on the window, tea going cold, one more level before bed. The clock says a " +
    "number you have decided not to look at directly, the controller is warm, and the " +
    "boss has a pattern you are almost certain you have finally worked out, and this " +
    "time, definitely, you will not need another go.",
  "Nobody ever regrets the coffee they drank, only the one they skipped, or the one " +
    "they had at nine in the evening because the conversation was good and stopping " +
    "seemed rude. There is a whole category of small decisions like that, and none of " +
    "them feel important until about three in the morning.",
  "A cabinet in the corner hums to itself and waits for another coin. Its screen has " +
    "burned a faint permanent scoreboard into the glass, three initials at the top that " +
    "nobody has beaten since the summer, and it is in no hurry at all, because it has " +
    "outlasted every player who ever swore at it.",
  "There is a particular silence that happens when a room full of people all realise " +
    "at the same moment that nobody wrote anything down. Somebody laughs first, usually " +
    "the one with the least to lose, and after that the meeting becomes an entirely " +
    "different and much more honest sort of meeting.",
  "The best directions anybody ever gave me involved no street names at all, only a " +
    "chip shop, a dog that is always outside it, and the instruction to turn left where " +
    "the road stops feeling like a road. I found the place on the first try and I have " +
    "never trusted a map in that town since.",
  "Airports at four in the morning belong to a separate country with its own customs. " +
    "Everyone is equally rumpled, the coffee costs whatever the machine feels like, and " +
    "complete strangers will guard your bag while you go and look at a departure board " +
    "that has not changed in twenty minutes.",
  "My grandmother could tell you the weather for the week from the behaviour of her " +
    "washing line, and she was right more often than the forecast, which she watched " +
    "every evening anyway, mostly so she could disagree with it out loud in the general " +
    "direction of the television.",
  "The problem with a shortcut is that you only ever find out it was one on the way " +
    "back, when you take the long road and discover it was not that long after all. By " +
    "then you have told everybody about your shortcut, and there is nothing to be done " +
    "except keep taking it forever.",
  "Libraries are the only buildings where you are trusted completely and asked for " +
    "nothing, and the reward for going in is that you may take almost anything out " +
    "again, carry it home, keep it for a month, and bring it back slightly late without " +
    "anybody making a serious fuss about it.",
  "Somebody in every band is the one who remembers where the leads are, packs the van " +
    "in the correct order, and knows the phone number of the venue. They are never the " +
    "one on the poster, and the whole thing falls apart within a fortnight of them " +
    "deciding they have had enough.",
  "There are two kinds of tired: the kind where you fall asleep in a chair with the " +
    "lights on, and the kind where you lie perfectly still in the dark for three hours " +
    "assembling arguments for a conversation that finished nine years ago and that " +
    "nobody else involved remembers at all.",
  "A good sandwich is an argument you can hold in one hand, and everybody thinks their " +
    "version settles it. The bread is wrong, the ratio is wrong, the thing you insist " +
    "on adding is an outrage, and yet somehow every single one of them tastes better " +
    "than anything you could buy.",
  "The last person to leave a party has seen a version of the evening nobody else got: " +
    "the chairs going back, the playlist wandering somewhere strange, one conversation " +
    "still going in the kitchen long after it stopped being about whatever it started " +
    "out being about in the first place.",
];

export const COUNTDOWN_MS = 3000;

/**
 * Which passage a race gets. `avoid` is the index the room just typed — a fresh
 * seed alone still lands on the same passage now and then, and twice running is
 * the one repeat anybody notices.
 */
export function passageIndex(seed: string, round: number, avoid = -1) {
  const at = hash(`${seed}:${round}`) % PASSAGES.length;
  return at === avoid ? (at + 1) % PASSAGES.length : at;
}

export const passage = (seed: string, round: number, avoid = -1) =>
  PASSAGES[passageIndex(seed, round, avoid)];

/** How much of the passage is typed correctly — stops dead at the first slip. */
export function progress(typed: string, text: string) {
  let at = 0;
  while (at < typed.length && typed[at] === text[at]) at++;
  return at;
}

/** True while there is a wrong character sitting in the box. */
export const mistyped = (typed: string, text: string) => typed.length > progress(typed, text);

/** Words per minute, the standard five characters to a word. */
export const wpm = (chars: number, ms: number) =>
  ms <= 0 ? 0 : Math.round(chars / 5 / (ms / 60_000));

export type Racer = { id: string; name: string; chars: number; ms: number; done: boolean };

/** Finishers first by time, then whoever has typed the most. */
export const standings = (racers: Racer[]): Racer[] =>
  [...racers].sort(
    (a, b) => Number(!a.done) - Number(!b.done) || (a.done && b.done ? a.ms - b.ms : b.chars - a.chars)
  );
