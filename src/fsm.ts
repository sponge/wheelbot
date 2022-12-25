import { createMachine } from 'xstate';

import { puzzles } from './puzzles.js';
import Utils from './util.js'

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
];

interface WheelContext {
  players: Player[],
  currentPlayerNum: number,
  currentPlayer: Player,
  category: string,
  puzzle: string,
  guessedLetters: string[],
  spinAmount: WheelValue,
  canSpin: boolean,
  canBuyVowel: boolean,
}

const waiting = {
  always: [
    { target: 'startGame', cond: 'isGameFull' },
  ],
  on: {
    NEW_PLAYER: { actions: ['registerNewPlayer'] },
    START_GAME: { target: 'startGame', cond: 'hasAnyPlayers' }
  }
}

const startGame = {
  entry: (context: WheelContext, event: any) => {
    const random = Math.floor(Math.random() * puzzles.length);
    context.category = puzzles[random].category;
    context.puzzle = puzzles[random].puzzle.toLowerCase();

    context.currentPlayerNum = 0;
    context.currentPlayer = context.players[0];
    context.spinAmount = 0;
    context.guessedLetters = [];
  },

  always: 'playerTurn'
};

const playerTurn = {
  entry: (context: WheelContext, event: any) => {
    context.spinAmount = 0;
    context.canBuyVowel = context.currentPlayer.score >= 250 && 'aeiou'.split('').some(vowel => !context.guessedLetters.includes(vowel));
    const canSpin = context.puzzle.split('').some(letter => Utils.letterIsConsonant(letter) && !context.guessedLetters.includes(letter));
    if (context.canSpin != canSpin) {
      for (let letter of 'bcdfghjklmnpqrstvwxyz') {
        if (!context.guessedLetters.includes(letter)) {
          context.guessedLetters.push(letter);
        }
      }
    }
    context.canSpin = canSpin;
  },

  always: [
    { cond: 'isPuzzleSolved', target: 'puzzleGuessCorrect' },
  ],

  on: {
    SPIN_WHEEL: {
      cond: 'playerCanSpin',
      target: 'spinWheel'
    },

    BUY_VOWEL: {
      cond: 'playerCanBuyVowel',
      target: 'guessVowel'
    },

    SOLVE_PUZZLE: [
      { cond: 'isPuzzleGuessCorrect', target: 'puzzleGuessCorrect' },
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
      { cond: 'isSpinBankrupt', actions: ['bankruptCurrentPlayer'], target: 'nextPlayerTurn' },
      { cond: 'isSpinLoseATurn', target: 'nextPlayerTurn' },
      { target: 'guessConsonant' }
    ]
  }
}

const nextPlayerTurn = {
  entry: ['cycleNextPlayer'],
  always: 'playerTurn'
};

const puzzleGuessCorrect = {
  entry: ['guaranteeMinimumWin'],
  after: {
    1000: 'gameOver'
  }
};

const gameOver = {

};

const puzzleGuessWrong = {
  after: {
    1000: 'nextPlayerTurn'
  }
};

const guessConsonant = {
  on: {
    GUESS_LETTER: [
      { cond: 'notConsonantGuess', target: 'guessConsonant' },
      { cond: 'letterInPuzzle', actions: ['updateUsedLetters', 'addScore'], target: 'lettersInPuzzle' },
      { cond: 'letterNotInPuzzle', actions: ['updateUsedLetters'], target: 'noLettersInPuzzle', },
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
      { cond: 'letterInPuzzle', actions: ['buyVowel', 'updateUsedLetters'], target: 'lettersInPuzzle' },
      { cond: 'letterNotInPuzzle', actions: ['buyVowel', 'updateUsedLetters'], target: 'noLettersInPuzzle' },
    ]
  },

  after: {
    PLAYER_IDLE_TIME: 'nextPlayerTurn'
  }
};

const lettersInPuzzle = {
  after: {
    1000: 'playerTurn'
  }
};

const noLettersInPuzzle = {
  after: {
    1000: 'nextPlayerTurn'
  }
};

function createWheelMachine() {
  /** @xstate-layout N4IgpgJg5mDOIC5QHcAWYwBsB0yCGAlgC4EB2UAxAHICiA6gPoAKAMgIICaNASgNoAMAXUSgADgHtYxAuNIiQAD0QAWAEwAaEAE9EATn4B2bLuX8AbAA4ry5Rf4BWZQF8nmtBhz5p5CgGUAKmzc-gwA4mwAsjQCwkggElIksvJKCKqqAMzYZga6lma6AIyO-IVmmjoIhaX22BnV9hn8Fgaq9rqqzq4g7li4hCQ+MfIJ0slxqelZOXkWBcWmZRV6BXXVygZm5hm6cxYubuh9sER4AE5EoXgAtmAUw3GjSXITiGZmtYWmH5v1hYX1ZZVfilbCtAyFPI7LYWXQGA49I44USYPBaMBnfwAVzOpD8TAAklQGHQABI0GgsB5iSRjF6gVK6RzYQq5AylMyZGzFIGqEx1AqbLb8ZT2MXKMwI3rI1HozE4vEAIQAqhwGAA1ADydEp1PitOeKT0zNZcI5XOUPO0iGq-F02DUZVUZkt9js+260uwKLRGOxuL8mpY6pozGVAC1wyxokIRgaZPTFMblCy2eaMtz7ECAf9sPYRXliq1MpypUjvbK-QrA8HQ0wI1HooVYjTEgmjQgmSnTeynRnXdnWWZU2VHGUQQYMpLPeWfXL-Xi9U9269Oya033M9nnbV8-nOSLTLoMqoyx4K775QGFCc8EQwNg8AAze9nAAUrE4PAYBIAItGGH8AkogASgoL05yrXEl3jcYGWTVMzU3AdrTSEEwXzEV6iKXQimKM8+lIMAFCIJhKyvRdY0eWDE0mDZh34eoTxMYp8w0VCLEKPMQVKf5GgydlLAInBYFEMg6CRCgb1Oe9HxfDE31tfgwK9UTxKRGC2zgpM0h3bA5laOErFZMUgWw4xcNwgx2kYuwMmE7A1NICSPCk29ZOfV9FJ4lTyyclysF4Zs4y02jEHSD59JyPkDGM6ys1Qy0slFPkLEaF1LFUEUHP8yTpLvB9PIUpTfPPXKPF4VQW31UKO0KCxVC4hwNn4Np7FUAxlBMIFXRZSFDJyYoPUOc8oCxOBYAAYVkWBZDAUgiAoUJlRoXxfAYaN-H8HhNLpOqMgyWo2hBdJrNin4gXsSKHC2AxJwcPIcgcsaJum0hZqIhalpWtaNpoLaduC6jatXMoikQnIXVFCFWku2EHUaQxWo+RpMme8bYCmma5q+5bVvWzbtr4KqQr20H5ghzYbHsGH2MqCFVH09oMxaQpVAsDIWnR17sc+xb8o8+T30-LhuB-f9QyA0DwPLF7Mbej75qIXbDXJ8HTUh6nacuy1jER8x6oaoouhGvo5dgdVxGQLBvvxv6Ab4KjWzJ+CqkO4dGjZvkrrMao4SBQtshhtm0uablucxy3rcwW3fsJwHquXbTUjBriNap6HWTpxA0uHTiIs5xr6ryCOLatm28bj-6icqxOaLqin06hmms4DuxsEatK1GdCwuvaUuo5tgXCqFj92FF8WAKlmhSrNjGy+jlWV1d1PKeb7XUP+JoR2siVsKaewHNELEAC8T8wMBQnn6azjOMAAGN+fckevJKmXz2Ps+L6vnnb4f5WnY1RdjpVeTctat03jFYwjVHAmDFGxE2iIP6n3PpfeedAziyEoMPOSr8fLvz6J-VBP9MYYKwUvZONpG65E1pnWGm9WRGEGu8DM7N2S6AchfIgr5YAElIEwFBF83IyRfsVfBXouE8L4QIr+YAKFhSqMeFMsJzCOB2A1DqGQgR2HtPUTIYpWrcn+A5Ug4gWBgG4RiXh-DBF3BwUVd8b8vSmPMZYs41iZGoPkR2CKtQDIxTiqZTepR+DQLKO7XuNh6guG6KYiAcB5DSlJqrV2ABacoqF0nYB4jk3JrVhpIL6F4QYUBknLx0rkDuO5m6cTtAUbMIJdHHlDsoKcvcHA5VOBcK4twymUIQPuFkLR2p2EFG6CUAc7pVIhHCSEHRCxH3IguPpCjNihN8cbVoXwJmoThEYU6HVbA7HapsExxFSJLIVCsnxZh6h9UnI1WwORzAGEHPVPMJ4cgZmaOMw+M4ypiWckia5q4sqbDqIdM0HMaaNDMp1MErU4QwphDsUuCscZEBBSvS09pobmFsGUAoWjUIHjzFdYouEsobDSgPcumAsUgJsCmCEBLSgQgOs0BprIRwulKL3WEJ4j62JIVjP+j8GUpx2E1PkhZ-iMTtNnKomiHQwLYm6dkXN-mEOFegzB5AJU2ktKEmm+caE01aoq-44LmFjmFJOacpscCSKsdI2xBq0LgoOu0DVh1rLEsqNYFkphoaOFaQ4ApzizEWKkTY2R7qwXDi9VC31sLgl2jCZyF0Q1DAcK1TgKANwwCagAG4YnjYYRNkKfUwv9TaPkw4OhlFZA1dhHoXBAA */
  return createMachine(
    {
      tsTypes: {} as import("./fsm.typegen").Typegen0,
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
        canBuyVowel: false,
        canSpin: true,
      },
      states: {
        waiting,
        startGame,
        playerTurn,
        nextPlayerTurn,
        spinWheel,
        guessConsonant,
        guessVowel,
        puzzleGuessCorrect,
        puzzleGuessWrong,
        lettersInPuzzle,
        noLettersInPuzzle,
        gameOver,
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

        letterInPuzzle: (context: WheelContext, event): boolean => {
          return !!context.puzzle.includes(event.letter);
        },

        letterNotInPuzzle: (context: WheelContext, event): boolean => {
          return !context.puzzle.includes(event.letter);
        },

        playerCanSpin: (context: WheelContext, event): boolean => {
          return context.canSpin;
        },

        playerCanBuyVowel: (context: WheelContext, event): boolean => {
          return context.canBuyVowel;
        },

        isPuzzleGuessCorrect: (context: WheelContext, event): boolean => {
          return event.guess.toLowerCase() == context.puzzle;
        },

        isPuzzleGuessWrong: (context: WheelContext, event): boolean => {
          return event.guess.toLowerCase() != context.puzzle;
        },

        notVowelGuess: (context: WheelContext, event): boolean => {
          if (event.letter.length > 1) return true;
          const letter = event.letter.toLowerCase();
          if (context.guessedLetters.includes(letter)) return true;

          return !Utils.letterIsVowel(letter);
        },

        notConsonantGuess: (context: WheelContext, event): boolean => {
          if (event.letter.length > 1) return true;
          const letter = event.letter.toLowerCase();
          if (context.guessedLetters.includes(letter)) return true;

          return Utils.letterIsVowel(letter);
        },

        isSpinBankrupt: (context: WheelContext, event): boolean => {
          return context.spinAmount == 'bankrupt';
        },

        isSpinLoseATurn: (context: WheelContext, event): boolean => {
          return context.spinAmount == 'lose-a-turn';
        },

        isPuzzleSolved: (context: WheelContext, event): boolean => {
          for (let letter of context.puzzle) {
            if (!Utils.isAnyLetter(letter)) continue;
            if (!context.guessedLetters.includes(letter)) return false;
          }

          return true;
        },
      },

      actions: {
        registerNewPlayer: (context: WheelContext, event) => {
          context.players.push({ name: event.playerName, score: 0 });
        },

        cycleNextPlayer: (context: WheelContext, event) => {
          context.currentPlayerNum += 1;
          if (context.currentPlayerNum >= context.players.length) context.currentPlayerNum = 0;
          context.currentPlayer = context.players[context.currentPlayerNum];
        },

        spinWheel: (context: WheelContext, event) => {
          const random = Math.floor(Math.random() * wheelValues.length);
          context.spinAmount = wheelValues[random];
        },

        buyVowel: (context: WheelContext, event) => {
          context.currentPlayer.score -= 250;
        },

        updateUsedLetters: (context: WheelContext, event) => {
          context.guessedLetters.push(event.letter);
        },

        addScore: (context: WheelContext, event) => {
          if (typeof context.spinAmount != 'number') return;
          const matches = Utils.countLettersInPuzzle(context.puzzle, event.letter);
          context.currentPlayer.score += matches * context.spinAmount;
        },

        bankruptCurrentPlayer: (context: WheelContext, event) => {
          context.currentPlayer.score = 0;
        },

        guaranteeMinimumWin: (context: WheelContext, event) => {
          context.currentPlayer.score = Math.max(1000, context.currentPlayer.score);
        },
      },

      delays: {
        PLAYER_IDLE_TIME: 45000
      }
    }
  );
}

export { createWheelMachine, WheelContext, Utils };