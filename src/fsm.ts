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
  },
  after: {
    WAITING_GAME_TIMEOUT: 'gameTimeout'
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

const gameTimeout = {

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
  /** @xstate-layout N4IgpgJg5mDOIC5QHcAWYwBsB0yCGAlgC4EB2UAxAHICiA6gPoAKAMgIICaNASgNoAMAXUSgADgHtYxAuNIiQAD0QAWAEwAaEAE9EANgCcq7AA41AZmOrjARmNnlFgL6PNaDDnzTyFAMoAVNm4-BgBxNgBZGgFhJBAJKRJZeSUEVVUzbF0Adn0DfgtdKyzizR0EUyN+ZQBWM1zjaqzjJt1nV3QsXEISb2j5eOkk2JS0jOzc-XzjQuaS7UQc3Wwq2umrXJrqtpA3Ts8eygVYIjwiMGw8ADMzgCcACjo2AEk-J6oQ0IiaBlfIgHkAKp+ACUFF2Hm6ZCgfViA0ScmGiFGmUWkwKRTmZSyyiWOOs+kmygJamqym24OwxzwNyIITwAFswBQYWJJIMEaAUrpdNVsNZlPxCrozPlivwNPNylZsDjVIKDKprDkCeSOjhRJg8FowDc-ABXG6kXxMN4MOgACRoNBYLLibPhyUQ+lJfMWuhs2OMG1KSOq1mwqiJzrM1lUTWqBK2Lh2auwGq1Ov1hooACEARwGAA1P50a22uEyDmKJ0upW5d1K5Re3TKH3lEN86o8-Qiv1Nhyq9xxzXa3UGo0+P4sTPfJgAgBa45YUSE-XthcdCGdyld5Y9Ve9kusZjMWRlaWs1kF-C9DjMnc68d7SYHQ5HzAnU6i1hirISC8RS9LbvX1drkrlfhsCyap+DA3Qj1A0xdwvdUe0TftmVnWF5yGTkSxXMtuV-TcylDfR-TURUwKqfgsiPc9owpK8EOTI4TjOC5rh1O5WE4HgGCeAARacfieSJQWo+C+0NfNUKLFJl1XbDKz-OsiX9VRQOsJtph3fRjFMWDuwTG42AAMQAaQoejTnOK5bjuUDBNjGi9KMsT3zQ4tUisf1dH4FsIysapVAgiUyhrPdQzbZRbCyMwlKybTSDABQiCYYSbxMqlGIsljrLBWNYvixLdJvRz2UXQN9D3aoGg9AjD3KusbGwUCwIFBpIs2MkqNjWBRDIOg1RShjzOY+5uBoNguL4gSsq7TrurVQqHU-NI6o8rzDAaPzQzrMMlk0-gVNUQwzFJDt2qmrrSB69w+rMpjLOG0bxpoGzTpm9xeBfOcnIkpE3MyTzDtW3z-LrXcgJ3Hcq327C-Uo9pnvO3rTLSwa7jusbfkeybOmm+HXtUV87U+xdbHFfdia9Oppn5YGskqEj+VyHc-SyVoTs6KA9TgWAAGFZFgWQ8FIIgKBCAEaB8HwGGnPw-B4OaP3QhBt0OgMGtsSxl30OtuT3IUGiqYx9e09nOZ50g+dIAWhZFsWJalmW+HelDCc-JVD2k2pD2J9060MXl-uxCxRS9awjY52Bud5-nBeF0XxclmhpdlvGPqKl3yP9LCPcPA3vclLJ+F5VWIzFA3rBZ2G2bDiOzajoXEYGyy2K4bhOJ4750aeyuTcji3Bbl5yUldjPFizr3jC1o96rA0NFT23djFDznM3EZAsBjm348TvhkLfVOFe3Jt6pDOULAcM+6yaDIBW5Xd8V97dF-D5fV8wde47t2XHd3+b9-T92Q2zoKceW59bAWbHUSGO5H6wGfmva278E7214MnJ2e8XJD3-p7HOwCyil2wMGW+N9SKqGgbA1+9cbosSbhxbivEO6YxwMbJ+K8sD9y+orP+mcAFjy1uVZYJFAa2AIo0bSog9QAC9xGYDACEKuPMbg3DAAAYzrqlBuGV+Cd3VBIqRMi5HiAUcoogbCiacJHtw7BdZtzpBMBYHItQvJVmiqzbRkjpGyM5nQG4shDhqMoUNEaaN+IY2ojo9xVcvE+JMQtH6y1-o+XWgFJEJMSqGA8gKXyBFtLSKILcWATxSBMDCUyCh6UAn3XoRSHJeSClFLcWAaJ+8CJLCigbAuh1GhNisUqIwPTtzKCaJpciMMYxdlIOIFgYBck6nyYU4pV0ka3UCQ9LR2BxmTOmTcWZdTdGNJcotdyf1vJrSBpKOwRgeQ8nws0MC+hnDRnGRAOA8hwQpx-i5AAtLoOsXz+EkX+f8po2l9hQjefLFyOQAx+SbLYWovlxTWAvvoFc+1SRe3SNiEhLjKQnBpHSRkYKB6IFAkscKfolQRQLtiWq+R8GFEggRE8HkQ7YrsjeQl7DmZATSDyTyENtwqRpRkXIxEIxHmmLtURwkDKGQ5cVI8-pCQihxNUXypItY4j5Epfk3lijMzudinKCUkr9jlQtbkvIiRylJAdBUF9mb1SJBTAwpVAxtQrjgbGF0sBmoVnKaYwEyLikigSewO5gYNnKjuSw5gagso9dgJh1dzaW19egsK+h6pemKKYI8nkNIXxsaGcYIF8hKSbKQlhmA02D2UHW4C-ImhqGGc0aotULD4MFOVIico-IGoTWI+pHjw7yMUSomtiBtwEWWPtQwjKgzNCsbO7A0a7AOEsB5L0ojinDtgJE8gE7UhMpXf9FSNhdo4m+QBXaKsSIQQLieBwziE3VJmbU4ph7-VLEZsI89-JuTdIjMsAZYEabNAGekGKEypk1LmfUz9J49wNBUrfGm4or24IbJciMrYVI1hGRSKADIwB-AAG46gQwGn9Z6FWXqsZFIwdhNLH1yAXLFCaiOMj8AQRk4g9REEPSSvkrbDzFFbNSvONQZQQQ0qMDSzMozOCAA */
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
        gameTimeout
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
        WAITING_GAME_TIMEOUT: 1000 * 60 * 3, // 3 minutes
      }
    }
  );
}

export { createWheelMachine, WheelContext, Utils };