import { createMachine } from 'xstate';

import { puzzles } from './puzzles.js';
import Utils from './util.js'

interface Player {
  id: string,
  name: string,
  score: number,
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
    PLAYER_IDLE_TIME: 'playerAFK'
  }
};

const spinWheel = {
  entry: 'spinWheel',
  after: {
    READ_TIME: [
      { cond: 'isSpinBankrupt', actions: ['bankruptCurrentPlayer'], target: 'nextPlayerTurn' },
      { cond: 'isSpinLoseATurn', target: 'nextPlayerTurn' },
      { target: 'guessConsonant' }
    ]
  }
}

const playerAFK = {
  after: {
    50: 'nextPlayerTurn'
  }
};


const nextPlayerTurn = {
  entry: ['cycleNextPlayer'],
  after: {
    50: 'playerTurn'
  }
};

const puzzleGuessCorrect = {
  entry: ['guaranteeMinimumWin'],
  after: {
    50: 'gameOver'
  }
};

const gameOver = {

};

const puzzleGuessWrong = {
  after: {
    READ_TIME: 'nextPlayerTurn'
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
    PLAYER_IDLE_TIME: 'playerAFK'
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
    PLAYER_IDLE_TIME: 'playerAFK',
  }
};

const lettersInPuzzle = {
  after: {
    READ_TIME: 'playerTurn'
  }
};

const noLettersInPuzzle = {
  after: {
    READ_TIME: 'nextPlayerTurn'
  }
};

function createWheelMachine() {
  /** @xstate-layout N4IgpgJg5mDOIC5QHcAWYwBsB0yCGAlgC4EB2UAxAHICiA6gPoAKAMgIICaNASgNoAMAXUSgADgHtYxAuNIiQAD0QAWAEwAaEAE9EqgOyrsq5QEY1AVn0AOPQGZ+y8wF8nmtBhz5p5CgGUAKmzc-gwA4mwAsjQCwkggElIksvJKCKqqttgAbHoAnFm5+Xr8xeYmtpo6CKbm2Pz6uVZZyrYZenkubuhYuIQkPjHyCdLJcanpmTn5hTkl-GUV2oi2BXXW5lkbWapmnSDuPbBEeABORKF4ALZgFINxw0lyY4hZm9hmc4V2+armlctWTIrEyqKzmcyNX4GPYHHCiTB4LRgE7+ACuJ1IfiYAEkqAw6AAJGg0Fh3MSSEZPUCpXLmZTvPIGVS5AzKJpWf4IDa5IyqWbFZq2NS2GHdOEIpEo9GYgBCAFUOAwAGoAeToJLJ8QpjxSiFp9JMjPSLOM7M5IMsRiyDhsVnZNiyoo82HhiORaIxfhVLCVNGYcoAWgGWNEhENtTIqYo9XSGSbmayzUsEOU9NlXlkTJncuVHOYRa59mKXRL3dKvT6-UxA8HoiZYuTEpHdQh9XGmSa2VkOcnyrlDMoskK9JmbGVyk6eq7JR7MZqHs3nq3Y4b452k1Uc+nXnYrLS6XpJ+K3VLPQojngiGBsHgAGZXk4AClYnB4DGxABEQwx-NiogBKChYRLE9Z3nCNRmpGMDSNBNTW7TlbDyd4d0HAp8zKWkjxAyU2AAMQAaQoc9jivG972RR9zH4QDgOnZF8II8Cm0g6M0l+Womj0ZR+AcfhplyRYqmUQpsFMAp5jsX4kNyZRsNIMAFCIJhS1PTESMva87wfKiaKA4sFKUlTQOlZjKRbYw9BMbArBaRplDsBxqJ7Kpfh5HMcj0OlTDMLZsNgUQyDoMViIvMjtMo7gaDYD8fz-GhaOLAKgrFMydSXdJwRsnIeL4gShMQOksmwDzbKsYx+Oo5xC2A5LSGCjxQtIrSKKfKKYrigD9OdOqGqwXh63DFio3GDjsu43iePyzlmn4bAVnsnYD34MF-MC+qQo08LWsfdrYt-LravWvrMF4VQGy1YaW0NcqxJ2fseJ3EoshmvcSpHHIwVsEwsz5bCoFROBYAAYVkWBZDwUgiAoUI5RoXxfAYEN-H8Hg0sXKCU1sWxal+XiqvmHZlGUTlikyaYmjza0MkdGriwBoHQdIcHSEh6HYfhxHkdRvhBvuCCRsQLMt1XdohXMKyd05QFDGZX7bHKnifpMf7AdgEGwYhqGYbhhGkZoFG0fOobzKXYXrNFuxHElnJzRBYrrRqPlMocVXGc11nta2lqdJfLhuHfL8-QOhLup6Bn1aZlm2fR1jUnN9srYlrNbeTLyeWzKxcxWnM2Td9WlXEZAsB1zn9cNvgw35q6zZx4r83KPkihZVpzVUBxsDKeovrZFZaa6Z0I9gQvi8wUu9e5tG+cbU3MYTy3xZtvRzV4zITBZMFZPaQdbFyfPh6LkuOYng2ebOi6FzjoWCgtxkk6XtuMjqCXsccb6wXMKx95HkvvfI332D+0Dt+EOiVB5qwPqPWOgsUw30TovFOy9exCmKjvbYI4Rx7k-thUQqIABeeDMBgFCBA0GJwThgAAMbQz-hFJ81EwFTnwYQ4hpDxDkKoUQaB104EL2togletRCiFBMBhJkDkv502dLgghRCSFAzoCcWQlBaE7T2p1UOdFmFyIgYo5R3Cza8LvggqWyDBIlSHBLfgJgvorQLAPHoRCiAPlgNiUgTBtE3FUTpdRoCw44CcS4txHjZFgAMXPPcxVfhWFXgYCEmwSbJn3NkFkHlpjzBBPJcQLAwDOORK49xnimqaX-pFaK+14qMJwKQbJuSgmFNCeEtimVOI5UmvxAogk7af3mvYYo3dbKf2qoWGpEA4DyFhCbdKmMAC0L1kxzOwl4foUApkYzYshdImxth7nXlVDQyYkKTFktaKydoVoZHsUWHqxwzgXGuGsq+XJ+DFRsV5Mo1pyifwKggHGVhsoWhKP2fIK0cGqVnI8mBI45pbM2ICMELz8yIR6U0QFeRmTWkkQ448uFCKQosiCNMXEeJggcu0FyKhGhiSzFnQ0w5TDyUUspcF0p8UZVeDyLy-BsY5lko3JBrk7DZCzNxOkgJHC7CkYcY6Yo2WY3bq8Xp1pLDlFaAKwqEJsgtCFD9T+WYVZSpwEPKOWsiByrYmYdenc9y5AcNxFo5U-hp01YORoJQ2T5GaP3a54cIE-0wOa+OxN6RWREnY+YHKfn2zmtYhwoiwRtF+Dgzx8jI7sIodQwNQtd7WXqDMeoIkYnzGltZESXxtVWWVtVbFLoU26KUeQLNKZTBzQllnfsDhcqJKqH2Qw+Q65fCbnJQ12BAn5OCZ4ptCrirY2VTsbG+hpZ6H+U0DeaFvo7CyTkvJJwCkhJYVOl5M6ViE1VYu3soi0zYzmLxLytlBz-SuGAFUAA3ZEh7FWztPQu9VKZ5h1F4rxPcCZBIFhcEAA */
  return createMachine(
    {
      tsTypes: {} as import("./fsm.typegen").Typegen0,
      schema: {
        context: {} as WheelContext,
        events: {} as
          | { type: 'NEW_PLAYER'; playerName: string, id?: string }
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
        currentPlayer: { name: '', score: 0, id: '' },
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
        playerAFK,
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
          context.players.push({ name: event.playerName, score: 0, id: event.id ?? event.playerName });
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
        PLAYER_IDLE_TIME: 45000,
        READ_TIME: 3000,
      }
    }
  );
}

export { createWheelMachine, WheelContext, Utils };