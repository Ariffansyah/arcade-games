export type Guide = {
  goal: string;

  round: string[];

  scoring: string;

  tips: string[];
};

export const HOWTO: Record<string, Guide> = {
  doodle: {
    goal: "Be the first to name the thing the machine is drawing.",
    round: [
      "The host starts a round and an AI draws a secret word, stroke by stroke, on everyone's screen at once.",
      "The word shows as blanks. The first letter appears after 40 seconds, the last after 70.",
      "Type guesses freely — there is no turn order. A guess that is nearly right is flagged as close so you know to keep pushing.",
      "The round ends the moment somebody gets it, or when every single player has voted to give up.",
    ],
    scoring:
      "The solver takes the round. The room keeps a shared count of rounds solved alongside each player's tally.",
    tips: [
      "Guess early and often. Wrong guesses cost nothing.",
      "Nobody can end the round alone — a give-up vote needs the whole room, so hold out if you have an idea.",
    ],
  },

  maze: {
    goal: "Walk the runner out of a maze they cannot see.",
    round: [
      "One player takes the controls and sees nothing but their own square. Everyone else sees the full maze, the exit and the traps.",
      "The runner moves with the arrow keys or WASD; the room calls out turns.",
      "Step on a trap and the run is over. Reach the exit and the clock stops.",
      "Pick Small, Medium or Large before you start — 9, 13 or 17 squares across.",
    ],
    scoring: "The clock is the score. Your best time this session sits under the maze.",
    tips: [
      "Traps only ever sit in dead-end branches, never on the one true route, so a maze is always winnable if you steer well.",
      "Agree on whose left you mean before the first turn. It is always the argument.",
    ],
  },

  ships: {
    goal: "Sink the other fleet before yours goes down.",
    round: [
      "Place four ships — lengths 4, 3, 3 and 2 — or take a random fleet and get on with it.",
      "Both players ready up, then take turns firing one shot at a time.",
      "A turn expires after 30 seconds and passes to the other side, so hesitating costs you a shot.",
      "The panel tracks shots, hits, accuracy and the lengths of whatever is still afloat.",
    ],
    scoring: "First to sink all four enemy ships wins. There is nothing else to count.",
    tips: [
      "Read the remaining-lengths list. Once the 4 is gone, stop hunting for a run of four.",
      "After a hit, work the four squares around it before wandering off.",
    ],
  },

  fuse: {
    goal: "Answer before the bomb reaches you. Last one standing wins.",
    round: [
      "A category and a letter appear, and the bomb is handed to whoever is on the clock.",
      "Type anything in that category starting with that letter and that has not been used yet, and the bomb passes on with a fresh letter.",
      "The fuse starts at 15 seconds and loses a second with every answer that lands, down to a floor of 5.",
      "Let it burn out on your turn and you lose a life. Everyone starts with two.",
    ],
    scoring: "Lives, not points. The last player with a life left takes the game.",
    tips: [
      "Used answers are gone for the rest of the game — the obvious one is usually already spent.",
      "The fuse never resets to full mid-game, so it only ever gets uglier. Answer fast early.",
    ],
  },

  draw: {
    goal: "Tap the moment the light turns green, and not a moment before.",
    round: [
      "The host arms the round and everyone waits on a dead screen.",
      "Somewhere between 1.5 and 6 seconds later, it lights.",
      "Tap. Your time is measured on your own device, from your own light.",
      "Tap before it lights and you foul — fouls sort to the back and never win.",
    ],
    scoring: "Fastest clean tap takes the round. A round everybody jumped has no winner.",
    tips: [
      "The delay is random every time. Counting it out does not work; that is the point.",
      "Anything under 100 ms was a guess that got lucky.",
    ],
  },

  dial: {
    goal: "Read one person's clue well enough to find a hidden mark on a scale.",
    round: [
      "A spectrum appears — Cold to Hot, Trash to Treasure — and one player, the clue-giver, sees a hidden mark somewhere between 5 and 95.",
      "The giver writes a single clue that sits at that point on the scale. Nobody else sees the mark.",
      "Everyone else drags the slider to where they think it is.",
      "The mark is revealed and the chair moves one seat along for the next round.",
    ],
    scoring:
      "Rings: within 4 is 4 points, within 9 is 3, within 17 is 2, within 28 is 1, anything wider scores nothing. The clue-giver is paid the best read anybody got off their clue.",
    tips: [
      "Giving a clue at an extreme is easy and worth little. The interesting marks are the awkward middle ones.",
      "As a guesser, argue out loud. The giver has to sit there and listen, which is half the fun.",
    ],
  },

  chain: {
    goal: "Play back a growing sequence of pads without fumbling it.",
    round: [
      "Four pads flash a sequence. It starts two long.",
      "The player on the clock repeats it, then the next player gets the same sequence plus one more flash.",
      "Miss a pad and you lose a life. Everyone starts with two.",
    ],
    scoring: "Lives again. The last player still standing wins the run.",
    tips: [
      "Say the colours out loud. Two of the same pad in a row is where most runs die.",
      "Watch other people's turns — the sequence you are handed is the one you just saw.",
    ],
  },

  scatter: {
    goal: "Answer five prompts on one letter, and answer them differently from everyone else.",
    round: [
      "One letter and five prompts appear. You have 90 seconds.",
      "Every answer must start with that letter.",
      "Sheets go in together, then the room sees everything at once.",
    ],
    scoring:
      "An answer scores 1 point only if nobody else wrote the same thing for that prompt. Matching answers cancel each other out completely.",
    tips: [
      "The first thing you think of is the thing everybody thinks of. It is worth zero.",
      "Five weird answers beat five safe ones. Blank scores the same as duplicated: nothing.",
    ],
  },

  thirds: {
    goal: "Guess two thirds of what everyone else is going to guess.",
    round: [
      "Everyone secretly picks a number from 0 to 100.",
      "The picks are revealed and the target is worked out: two thirds of the average.",
      "Whoever sat closest to that target takes the round.",
    ],
    scoring: "One point to the closest pick. Ties share it.",
    tips: [
      "If everyone picks at random the target lands near 33. So you go lower. So does everyone else. So you go lower again.",
      "The trick is guessing how many rounds of that reasoning the room actually does.",
    ],
  },

  tug: {
    goal: "Drag the rope 60 pulls onto your side.",
    round: [
      "The room splits into two sides by join order.",
      "Mash the button. Every tap is one pull for your side.",
      "The rope shows the running difference, not the total.",
    ],
    scoring: "A side wins when the rope sits 60 net pulls in its favour.",
    tips: [
      "It is a difference, so a side that is behind is not out — it only ever needs to out-tap the other from here.",
      "Two thumbs. Obviously.",
    ],
  },

  typerace: {
    goal: "Type the same passage faster than everyone else.",
    round: [
      "The same passage appears for the whole room, after a three-second countdown.",
      "Type it exactly. A wrong character stops your progress until you fix it.",
      "Standings update live as people advance.",
    ],
    scoring: "Words per minute, worked out from correct characters and the time you took.",
    tips: [
      "Accuracy beats speed here — you cannot advance past a mistake, so hammering through costs more than it gains.",
      "The room never gets the same passage twice in a row.",
    ],
  },

  imposter: {
    goal: "Find the one player who never got the word — or, if that is you, survive the vote.",
    round: [
      "Everyone is dealt the same secret word. One player is dealt nothing and is not told who else got what.",
      "Each player writes one clue about the word. The imposter has to write one too, from context alone.",
      "All the clues go up together, then everyone votes for who they think was faking.",
      "The word and the imposter are revealed.",
    ],
    scoring:
      "Catch the imposter and every other player takes 1 point. Let them escape the vote and the imposter takes 2.",
    tips: [
      "A clue that is too specific outs you as knowing; one that is too vague outs you as not knowing.",
      "As the imposter, go late in the reading order if you can, and lean on whatever the first clue implied.",
    ],
  },

  samepage: {
    goal: "Answer the same thing as everyone else, on purpose.",
    round: [
      "A prompt appears — deliberately narrow, the kind with an obvious answer.",
      "Everyone answers at once, without conferring.",
      "Answers are grouped and the biggest matching group is shown.",
    ],
    scoring:
      "No individual score and no winner. The room gets one number — how many of you landed together — and a streak to protect when the whole room matches.",
    tips: [
      "This is the one game where being obvious is correct. Do not be clever.",
      "Think about what the room would say, not what you would say.",
    ],
  },

  tale: {
    goal: "Write one story together, three lines each, with an awkward word forced into every line.",
    round: [
      "The turn passes around the room. Each writer gets one line and one assigned word they have to work in.",
      "A line has to be more than a few characters and has to actually contain the word.",
      "Everyone writes three lines, then the finished story is read back in full.",
    ],
    scoring: "Nothing is scored. The story is the output.",
    tips: [
      "Hand the next writer a problem, not a resolution.",
      "The awkward word is easier to place at the start of a sentence than at the end.",
    ],
  },

  bomb: {
    goal:
      "Get every module on the casing down before the fuse does. One of you holds the bomb; everyone else holds the manual, and neither can see the other's screen.",
    round: [
      "The host picks a difficulty and starts. Whoever is holding the bomb sees the casing: a serial number, a countdown, strike lights, and every module at once.",
      "Everyone else sees the manual — one page per module, switched with the tabs along the top.",
      "The holder describes what is in front of them. The manual readers work out which rule applies and call the action back.",
      "Every module has to be finished before the fuse runs out. A wrong input is a strike, not always an explosion — but run out of strikes and it goes off.",
      "The bomb changes hands every round.",
    ],
    scoring:
      "One count: bombs defused together. Difficulty sets how many modules are bolted on, how long the fuse is and how many strikes you get, and every extra round adds pressure — a module every three rounds, five fewer seconds each time.",
    tips: [
      "Read the serial out once at the start. Three of the five modules need it and nobody wants to ask twice.",
      "Say colours and shapes, not conclusions. The moment the holder starts interpreting the manual, the game stops working.",
      "The button's rules depend on how many strikes you already have, so a plan made before a strike can be wrong after one.",
      "Nothing forces you to work the modules in order. Do the quick ones first and buy thinking time for the memory panel.",
    ],
  },

  mayday: {
    goal:
      "Work an emergency checklist top to bottom before you run out of height. One of you is in the seat; everyone else has the book.",
    round: [
      "The host picks a difficulty and starts. The pilot sees the instruments — fuel, airspeed, heading, three warning lamps — plus a bank of six switches and a flap lever.",
      "Everyone else sees the checklist. Every step is a condition and two actions: one if the condition holds, one if it does not.",
      "The readers cannot see the panel, so they have to ask. The pilot answers, the readers pick the branch, the pilot does it.",
      "Finish every step before altitude reaches zero and you are down in one piece.",
    ],
    scoring:
      "Landings walked away from. Altitude is both the clock and the penalty — it sinks steadily, and every wrong action drops a chunk of it at once.",
    tips: [
      "Steps that ask about a switch are the dangerous ones: your own earlier steps move the switches, so an answer from step two is worthless by step five. Ask again.",
      "Read the next step's condition out before the pilot finishes the current action. The descent does not pause for you.",
      "The instruments — fuel, speed, heading, lamps — never change during a run. Take them down once and stop asking.",
    ],
  },
};
