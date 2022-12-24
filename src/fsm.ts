import { StringSelectMenuBuilder } from '@discordjs/builders';
import { createMachine } from 'xstate';

interface Player {
  name: string,
  score: number
}

type WheelValue = string | number;
const wheelValues: WheelValue[] = [
  5000,
  500,
  900,
  700,
  600,
  650,
  500,
  700,
  500,
  600,
  550,
  500,
  600,
  'bankrupt',
  650,
  850,
  700,
  'lose-a-turn',
  800,
  500,
  650,
  500,
  900,
  'bankrupt',
  5000
];

interface WheelContext {
  players: Player[],
  currentPlayerNum: number,
  currentPlayer: Player,
  category: string,
  puzzle: string,
  guessedLetters: string[],
  spinAmount: WheelValue,
}

const waiting = {
  always: [
    { target: 'newPuzzle', cond: 'isGameFull' },
  ],
  on: {
    NEW_PLAYER: { actions: ['registerNewPlayer'] },
    START_GAME: { target: 'newPuzzle', cond: 'hasAnyPlayers' }
  }
}

const newPuzzle = {
  entry: (context: WheelContext, event: any) => {
    context.currentPlayerNum = 0;
    context.currentPlayer = context.players[0];
    context.category = "Famous Placeholder Messages";
    context.puzzle = "hello world".toLowerCase();
    context.spinAmount = 0;
    context.guessedLetters = [];
  },

  after: {
    1000: 'playerTurn'
  }
};

const playerTurn = {
  entry: (context: WheelContext, event: any) => {
    context.spinAmount = 0;
  },

  on: {
    SPIN_WHEEL: 'spinWheel',

    BUY_VOWEL: {
      cond: 'playerCanBuyVowel',
      target: 'guessVowel'
    },

    SOLVE_PUZZLE: [
      { cond: 'isPuzzleGuessCorrect', target: 'roundOver' },
      { cond: 'isPuzzleGuessWrong', target: 'puzzleGuessWrong' },
    ]
  },

  after: {
    PLAYER_IDLE_TIME: 'nextPlayerTurn'
  }
};

const spinWheel = {
  entry: 'spinWheel',
  after: {
    1000: [
      { cond: 'isSpinBankrupt', target: 'bankruptSpin' },
      { cond: 'isSpinLoseATurn', target: 'loseTurnSpin' },
      { target: 'guessConsonent' }
    ]
  }
}

const nextPlayerTurn = {
  entry: 'cycleNextPlayer',
  after: {
    1000: 'playerTurn'
  }
};

const bankruptSpin = {
  entry: 'bankruptCurrentPlayer',
  after: {
    1000: 'nextPlayerTurn'
  }
};

const loseTurnSpin = {
  after: {
    1000: 'nextPlayerTurn'
  }
};

const puzzleGuessWrong = {
  after: {
    1000: 'nextPlayerTurn'
  }
};

const roundOver = {
  after: {
    1000: 'newPuzzle'
  }
};

const guessConsonent = {
  on: {
    GUESS_LETTER: [
      { cond: 'notConsonantGuess', target: 'guessConsonent' },
      { cond: 'letterInPuzzle', actions: ['updateUsedLetters', 'addScore'], target: 'playerTurn' },
      { cond: 'letterNotInPuzzle', actions: ['updateUsedLetters'], target: 'nextPlayerTurn', },
    ]
  },

  after: {
    PLAYER_IDLE_TIME: 'nextPlayerTurn'
  }
};

const guessVowel = {
  on: {
    GUESS_LETTER: [
      { cond: 'notVowelGuess', target: 'guessVowel' },
      { cond: 'letterInPuzzle', actions: ['buyVowel', 'updateUsedLetters'], target: 'playerTurn' },
      { cond: 'letterNotInPuzzle', actions: ['buyVowel', 'updateUsedLetters'], target: 'nextPlayerTurn' },
    ]
  },

  after: {
    PLAYER_IDLE_TIME: 'nextPlayerTurn'
  }
};

const wheelMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QHcAWYwBsB0yCGAlgC4EB2UAxAHICiA6gPoAKAMgIICaNASgNoAMAXUSgADgHtYxAuNIiQAD0QAmACwB2AKzYAbPwCM6-QA5+Ow8uXqANCACeidauPZVO5Zv6adp-QE5VZQBfINs0DBx8aXIKAGUAFTZueIYAcTYAWRoBYSQQCSkSWXklBGUdTXVsZWN9b34atwBmP1sHBFMqzWNlJr71Y3UdP34-ELD0LFxCEhic+QLpYrzS8srq2vrGnRa2xGNu7H4epsNNcpbNcZBwqdIwZCYAVwAvF8wwCgVYIjwiMGweAAZv8AE4ACn0-GhAEoKLccPdHq93mB5nlFkU5CsVLUXE1VE0Dn4Wqc9Jo9gg3MpsPplH59CYmqMCapVFdQjdJjhRJg8HYwKD4k9QaQ4kwAJJUBh0AASNBoLHRYkkS2xoFK+h8TWwmk0GjUOiG-R0lKhVmwfmUJmU-BaqjqfmM1wR2F5-MFwtFFAAQgBVDgMABqAHk6IrlflVViSog6k0dK5rSSfHb+EZKVZtHV3E1yj16WNOa73QKhSKxbEQywgzRmH6AFoNljZIQLaMydWKFT8dm6bxWYY9NxOyndfTYJrqBl2rS9brO4vct18steyvV2v1pst3j6XIqwqd2NlXvaCruIZOw2j+yII1+SfTwwM6fqAmLiYRFce8ve76-P8gIgoK4KsJwPAMBKAAiLYMPEEpZHCJarp6FaRpix44ggWp5tggyaIyOx+EY9I2HeCDmPw2BDM4hGnE6xh+EWX53GAChEEwqF-mKAF-ACwJgpC0L8Mhy73BxXG-uuGEdssGpxpoCZJv4CamMyGYURULjlM4PR6OoagNC6y6wKIZB0NyXw-PxwFCVCsLwqZ5mkJZESyUe8ndmU3i6qcNRWuyBgaJSOjOPhdKETsxiEiRwRLt+ZkWVZfFAYJoEOaJTmJS5blYHuB5Rp5XarL5Sl0kxaiePoIUUd4ia1B4ljeMYRIOiZOXJRE1mAQJIEQplYmda53K8MohWYV5pWJuVAVVcF5HtAciYElOdJmJUCbqB1UxQE8cCwAAwrIsCyGApBEBQqR+jQsSxAwLbxPEPAeWqJ56omAwVSYhk+PqlKmI+LJODUmhWmD20Jbt+2wEdJ1nRdV03XdD00E9L37u2xUnla1FGKM75gxchgA8pazdISdpGaoO04HtB3HaQp33Ij123fdj3PXw41Y292G4zRUIkU0RM7CTWl+CtkUNFO6bePotPYPTsOM8z52XalfVCeBXDcFBsF1ghSHZdDDPwyzRCvTG-O2oLBMi1aYuLY4Iw0ReybLbmivK7AQbiMgWBI+zqPo3wbYYnJJWIN0Oo5lYqhmGFgOUkF1TuDoegGOoWg1d7MO+-7gdsyjnMYxNkc47b+PC6LpzOx0E6eCJ-l5mDOh5wdfsB5gQcl2jXNjeX2M23jQuE47deUpclpmB4GjnKc-gcqxdP513gea3ZoE65BMFwUbNBDabsPr5gVtYQpCAC9X4-E-XhGPv5njRfoCaBIroLiE8pAQCGABugoeq2XSgNESR8cCf2-r-ABoJz5TRUBUKoNQcwNBisRMcPR8LPihIYYwwwKiK1ECiD4qR850E-jETeIDhKORLMQsApCDrkNkFAOBUcyinGosgkWW01DlFNFpU4WCGQaEqm1ZeXJvwACM8CkAANagieKIIgsQXJALSv1GhWVXQyPkYo5RqiyBsMrqPe2tdxbtCThFDwpxnAGiGIrTAkgwDrkMbxGyGj7JgJNjgJxsAXEVjccYkedsa4TwsdHDO1ilJDB8EYdkIROSkHEBAOA8gES82tpfAAtAI9ouSjgiSKcUiRrooizCgJki+3kPB0nwjUIk8ZVAMkGADZplocx9DwSLTwkMV7YCRM8N4HwqnwLKAER8AwSTpnMKYDwlJs5dDzMsvMUJml9MkVMUsaFRSjPYSYcwNE7Q5hERVZQoUag0XpNadwepnA+EVhJTi3F1x7JPK-Lw+EjS9GMLUdQZ4mihUMPhZwlgmK-P+WYRWSURoRDedhQIlInR4yMMONQLS3AdxVubdW8LL7EUtL804LUdjNIBu4XUJJUUND8PRJoWKC7dzxd5I0E4+hOgGHpMwksxyfKGB4VqPTX5vw-l-H+-9BTMtWBoFaOxCINEJNaCJCBxzCKhFOBeC5CH0MYbDZh5ApUqEJBOX6PghZuBlaFQIlpblZzwYMeK-TdEKKUSolyhqVW0popUVqtKRhvn0Bc1Qk5Io1SdFCUwn5Nm+Oca491Edh74v1K4OJjtpwGDMGOCo0T-KBCnEaRJQQgA */
  createMachine(
    {
      schema: {
        context: {} as WheelContext,
        events: {} as
          | { type: 'NEW_PLAYER'; playerName: string }
          | { type: 'START_GAME' }
          | { type: 'SPIN_WHEEL' }
          | { type: 'BUY_VOWEL' }
          | { type: 'GUESS_LETTER'; letter: string }
          | { type: 'SOLVE_PUZZLE'; guess: string }
      },
      id: 'wheel',
      initial: 'waiting',
      context: {
        players: [],
        currentPlayerNum: 0,
        currentPlayer: { name: '', score: 0 },
        category: '',
        puzzle: '',
        guessedLetters: [],
        spinAmount: 0,
      },
      states: {
        waiting,
        newPuzzle,
        playerTurn,
        nextPlayerTurn,
        spinWheel,
        guessConsonent,
        guessVowel,
        roundOver,
        puzzleGuessWrong,
        bankruptSpin,
        loseTurnSpin,
      },
      predictableActionArguments: true
    },
    {
      guards: {
        isGameFull: (context: WheelContext, event): boolean => {
          return context.players.length == 3;
        },

        hasAnyPlayers: (context: WheelContext, event): boolean => {
          return context.players.length > 0;
        },

        letterInPuzzle: (context: WheelContext, event: any): boolean => {
          return !!context.puzzle.includes(event.letter);
        },

        letterNotInPuzzle: (context: WheelContext, event: any): boolean => {
          return !context.puzzle.includes(event.letter);
        },

        playerCanBuyVowel: (context: WheelContext, event: any): boolean => {
          return context.currentPlayer.score >= 250;
        },

        isPuzzleGuessCorrect: (context: WheelContext, event: any): boolean => {
          return event.guess.toLowerCase() == context.puzzle;
        },

        isPuzzleGuessWrong: (context: WheelContext, event: any): boolean => {
          return event.guess.toLowerCase() != context.puzzle;
        },

        notVowelGuess: (context: WheelContext, event: any): boolean => {
          if (event.letter.length > 1) return true;
          const letter = event.letter.toLowerCase();
          if (context.guessedLetters.includes(letter)) return true;

          return ['a', 'e', 'i', 'o', 'u'].includes(letter) == false;
        },

        notConsonantGuess: (context: WheelContext, event: any): boolean => {
          if (event.letter.length > 1) return true;
          const letter = event.letter.toLowerCase();
          if (context.guessedLetters.includes(letter)) return true;

          return ['a', 'e', 'i', 'o', 'u'].includes(letter) == true;
        },

        isSpinBankrupt: (context: WheelContext, event: any): boolean => {
          return context.spinAmount == 'bankrupt';
        },

        isSpinLoseATurn: (context: WheelContext, event: any): boolean => {
          return context.spinAmount == 'lose-a-turn';
        },
      },

      actions: {
        registerNewPlayer: (context: WheelContext, event: any) => {
          context.players.push({ name: event.playerName, score: 0 });
        },

        cycleNextPlayer: (context: WheelContext, event: any) => {
          context.currentPlayerNum += 1;
          if (context.currentPlayerNum >= context.players.length) context.currentPlayerNum = 0;
          context.currentPlayer = context.players[context.currentPlayerNum];
        },

        spinWheel: (context: WheelContext, event: any) => {
          const random = Math.floor(Math.random() * wheelValues.length);
          context.spinAmount = wheelValues[random];
        },

        buyVowel: (context: WheelContext, event: any) => {
          context.currentPlayer.score -= 250;
        },

        updateUsedLetters: (context: WheelContext, event: any) => {
          console.log(`letter is: ${event.letter}`);
          context.guessedLetters.push(event.letter);
        },

        addScore: (context: WheelContext, event: any) => {
          if (typeof context.spinAmount != 'number') return;
          const matches = context.puzzle.match(new RegExp(event.letter, 'g'))?.length ?? 0;
          context.currentPlayer.score += matches * context.spinAmount;
        },

        bankruptCurrentPlayer: (context: WheelContext, event: any) => {
          context.currentPlayer.score = 0;
        },
      },

      delays: {
        PLAYER_IDLE_TIME: 20000
      }
    }
  );

export { wheelMachine, WheelContext, WheelValue, wheelValues };