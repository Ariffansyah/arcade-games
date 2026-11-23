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

  lastcard: {
    goal: "Get rid of every card in your hand before anyone else does.",
    round: [
      "The host picks a deck — Classic, Flip or No Mercy — and any house rules, then deals seven cards each and turns one face up to start the pile.",
      "On your turn play one card that matches the top card's colour or its face. Wilds go on anything and let you call the colour.",
      "Can't go, or don't want to? Draw one. If it fits you may play it straight away, otherwise the turn moves on.",
      "Skip jumps the next player, Reverse turns the table around, and draw cards make the next player pick up and lose their turn.",
      "A Wild Draw is only fair when you hold nothing in the current colour. The next player can take it or challenge: caught bluffing, you pick up instead; played fair, they pick up two extra.",
      "Flip deck: every card has a dark side. Play a Flip and the whole table turns over. The dark side hits harder — Draw Five, Skip Everyone, and Wild Draw Colour, which keeps dealing until the called colour turns up.",
      "House rules, each switched on by the host: Stack Numbers lays every card of one number in a turn; Call Last Card means calling it as you go down to one, or anyone can catch you for two; Jump-In lets an exact copy of the top card go down out of turn; Force Play puts a drawn fit straight down; No Bluffing makes Wild Draws land with no challenge; Draw to Match keeps you drawing until a card fits.",
      "No Mercy deck: adds Wild Draw Six and Wild Draw Ten and switches on its rules. Draw cards stack — answer with an equal or bigger one and whoever can't takes the lot. A 7 swaps hands with anyone, a 0 moves every hand on a seat, and anyone holding 25 cards or more is out of the round.",
      "Tongkrongan rules, the way a lot of friend groups in Indonesia play: Finish on a Number (gak boleh habis pakai kartu power) means a Skip, Reverse, draw card or wild can't be your last card. Bounce Draws (balikin +2) lets a Reverse send a draw stack back and a Skip pass it on. Play to the Loser (cari yang kalah) makes going out safe, and the round goes on until one player is left holding cards.",
    ],
    scoring:
      "Whoever empties their hand takes the round and scores everything still held by everyone else: numbers at face value, action cards 20 (10 to 30 on the Flip deck), wilds 50 (40 to 60 on Flip). Going out on a draw card still makes the next player pick up first, and those cards count. Scores carry over between rounds.",
    tips: [
      "Hang on to a wild. It is the only card that always gets you out of a corner.",
      "Two players? Reverse works like a Skip, so it is a free extra turn.",
      "In Flip you can see the other side of everyone else's cards — that is what they will be holding when the table turns.",
      "Challenge a Wild Draw when the player had plenty of cards and a long pause before laying it.",
    ],
  },

  topple: {
    goal: "Keep the tower standing longer than everyone else. Whoever knocks it down loses the round.",
    round: [
      "The tower starts fifteen levels high, three blocks a level, every level crossing the one below it.",
      "On your turn grab any block below the top and drag it out along its length with your mouse or finger. Nothing comes out of the top level, or out of the one under it while the top is still being built.",
      "Once it is clear of the tower it lifts into your hand. Carry it over the top and let go: it drops into the nearest free spot.",
      "It is real physics. Slide too fast and friction drags the level above along with it; take a block that was holding something up and the tower goes.",
      "No mouse? Arrow keys pick a block and Enter pulls it out and stacks it for you.",
    ],
    scoring:
      "The player who drops the tower takes a mark against their name. Fewest marks after a few rebuilds is the winner.",
    tips: [
      "The middle block of a full level is the safest pull — the two edges keep everything above balanced.",
      "Never take an edge block once the middle of that level is gone. Whatever sits on it is left on one block.",
      "Go slow. A steady pull leaves the tower alone; a yank drags the next level with it.",
    ],
  },

  four: {
    goal: "Line up four of your discs in a row — across, up, or on a diagonal — before the other player does.",
    round: [
      "Two players take turns dropping one disc into any of the seven columns. It falls to the lowest empty spot.",
      "Tap a column in the 3D rack, or use the numbered buttons under it. Drag to look around the board.",
      "The first line of four wins. If all 42 spaces fill with no line, it is a draw.",
      "Rematch keeps the score and hands the first move to whoever went second.",
    ],
    scoring: "One point per win, kept across rematches for as long as the same two players sit down.",
    tips: [
      "The middle column is part of more possible lines than any other. Start there.",
      "Look for a spot where one drop makes two threats at once. They can only block one.",
    ],
  },

  yacht: {
    goal: "Fill all thirteen boxes on your score card and finish with the biggest total.",
    round: [
      "On your turn roll all five dice. Then roll again up to twice more, keeping any dice you like between rolls.",
      "Tap a die in the tray, or its button below, to keep it. Kept dice float to the front and do not roll.",
      "When you are done, pick one empty box on your card. It scores whatever those dice are worth there — even zero.",
      "Every box gets filled exactly once. The game ends when every card is full.",
    ],
    scoring:
      "Ones to Sixes score the sum of that face. Three and Four of a kind and Chance score all five dice. Full house is 25, small straight 30, large straight 40, Yacht (five alike) 50. Reaching 63 in the top six boxes adds a 35 bonus.",
    tips: [
      "The bonus needs three of each face up top. Aim for that and the top half pays for itself.",
      "Chance is your safety net. Save it for the turn that goes nowhere.",
      "Sometimes the right move is a zero in Yacht or Ones rather than wrecking a box you can still fill well.",
    ],
  },

  landlord: {
    goal: "Be the last player with money. Everyone else goes bankrupt paying you rent.",
    round: [
      "Everyone starts on GO with $1500. On your turn roll two dice and your pawn hops that many squares; pass GO and you collect $200.",
      "Land on a street, train line or utility nobody owns and you can buy it. Pass on it and it goes to auction: everyone takes turns raising or dropping out, and the last bidder standing pays.",
      "Land on one somebody owns and you pay them rent automatically. Taxes go to the bank.",
      "Glitch and Bonus squares draw the top card of their deck. Cards can pay you, charge you, move you, or send you to jail — and a get-out-of-jail card stays in your hand until you need it.",
      "Own a whole colour set and its rent doubles. Then build houses — evenly across the set — and a fifth turns into a hotel.",
      "On your turn you can also mortgage a deed for half its price (it charges no rent until you pay that back plus 10%), sell buildings back at half price, or offer another player a trade of deeds and cash.",
      "Doubles roll again, but a third double in one turn sends you to jail. In jail, roll doubles, use a card or pay $50 to walk out; after three misses you pay and go.",
    ],
    scoring:
      "Run out of money and your buildings are sold back at half price, then your deeds are mortgaged. If that still is not enough you are out, and everything you own goes to whoever you owed. Last one standing wins. The host can call it early, in which case the highest net worth — cash plus deeds plus buildings — takes it.",
    tips: [
      "The orange and red sets get landed on more than any others: jail sits just before them.",
      "Three houses is where rent jumps hardest. Get a set to three before spreading out.",
      "Auctions are where bargains happen. If nobody else can afford it, a deed can go for $10.",
      "A trade that finishes someone's colour set is worth far more to them than the deed's price. Charge for it.",
    ],
  },
};
