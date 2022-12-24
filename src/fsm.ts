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
  },

  always: [
    { cond: 'isPuzzleSolved', target: 'puzzleGuessCorrect' },
  ],

  on: {
    SPIN_WHEEL: 'spinWheel',

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
      { target: 'guessConsonent' }
    ]
  }
}

const nextPlayerTurn = {
  entry: ['cycleNextPlayer'],
  always: 'playerTurn'
};

const puzzleGuessCorrect = {
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

const guessConsonent = {
  on: {
    GUESS_LETTER: [
      { cond: 'notConsonantGuess', target: 'guessConsonent' },
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

const wheelMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QHcAWYwBsB0yCGAlgC4EB2UAxAHICiA6gPoAKAMgIICaNASgNoAMAXUSgADgHtYxAuNIiQAD0QAWAEwAaEAE9EATn4B2bLuUBGVaYAcV-QYBsAXwea0GHPmnkKAZQAqbbl8GAHE2AFkaAWEkEAkpEll5JQRVVQBmbDsDXQNlaztdNINTc00dBFN+UwBWbDTKg2zVXWrdXUtlJxd0LFxCEi8o+TjpRJjk1IysnLzTAqKSjW09ArqGtWtlPOaukFde0jBkJgBXAC8zzDAKIZiRhLlxxDs7WtNlfkt+Zq-TXTtlGVEJUqtgDKpcmkWr9PgZdvscKJMHgtGAAE6+E5o0g+JgASSoDDoAAkaDQWLcxJJRo9QMkWspsKZsl9VJZWnZVJ8gSkTHUCgZqh02mllFlOs49j1EcjURisTiAEIAVQ4DAAagB5OjkymxakPJJ6aqM5ntb7s-5cyw8kG6bBqKyWNJpOx-fh2Szw6XYJEo9GY7E+TUsdU0ZjKgBakZYkSEwwNMlpimNppZFo51ttaX4U2KlkKL1UL1M3rcvtlAYVwdD4aYUZjkVM0Sp8STRoQDKZ6bZme5ywqzLs3b+eRN4LaZd6frlgZxevu7aenZN3fNvat-fK5mqRiyVl3VhKymq1SnMv98qDClgRDwRDA2DwADMH2iABSsTg8Bh4gAisYML4eIRAAlBQCIVpec4LomYx0qma6spanJbogXL8GC1T8FURT2AY-C6Oe2CHAoRBMJWV7zvGdxwcmEzKPY2C5qYaQFroXLFs6PLWA6bQilsLoQgCxGwKIZB0NKFA3neD5Pq+6LviC-DgZBYkSdKsFtvBKYpMWtSWFkor1Kxzp2Dy9T2vxJivC6Nk5KJ4mkJJbjSbe96Pi+b5KThKkQT66nOZpzYJtp9Hofp2CGQYxklGxro8mYGQniZdhpNUrGEWkjkaa5MkefJ3nKapAVOS5WC8KoLb6mFHZWBYzEmtY-y6H8+GJTUTJtc6VTZIKRGSpBUAnHAsAAMKyLAshgKQRAUMEyo0N43gMLGvi+DwWk0nVLq1Ko2GLLmhj7boPLVK8jVpcorqqMorUDd05bDaNE2kFNhyzfNi3LatNDrZtIW0bVy5zK1SGutYrTvDaA5CvaKWEfwu6Cq6cKDT6z2wONk3TZ9C1LSta0bXwVWhdtIMFKY4OejUrV5DyxSqFFrQfGkbIFNU6XEZj2Nvbjc35XJXmKV+XDcL+AHhsBYH+U9I1Y6970zUQW2GhTYNmmZkN0zD5QmlTLRs-tHo5nYHrc-LsDquIyBYF9BO-f9fA0a25MIRU6XDpzrGNKh7JsTy-xU-uHS3Tk1T7Rbo3W7bmD2z9RMA9Vi46ckoNU5rEO09DPHnVF5hbAUBZssUUdYzHdv4wnf3E5Vyd0XVlPU9rOcDua2AWJY-VFwRUJl1bNt24LnkKR+os-v+gHSzQJVy9Hg+YKrS7u+nzfZ-TA5xZhzJ-OYHq7s6Z7o+WojnJcYDBJbE1omiYAAMYC+5Qujz5OGz9OZ9XJfL3iDf98qy7GqbtdKr0zjTKGG9tzNCMBxNq4IMrMiFMRU+Fwv6WzoGiWQlBh6FUUsVWWH9UEX3QZg8gS9U7AibmAlukDgTMj3MUFoEI2YmleMRK4RA3ywDxKQU4RC3KyRHkVXy78cAcK4Twvh59yHhQqIURkBZDCemaK8Ysp0BxfHtPUW6JtUgRwlI9A44gWBgE4eibhvDP7XBwcLD8+DIKkGMaYiRliiEyI7KkC60VYqmQSpvKomFYGWC7uOGoJ4nCSkcRAOA8gERkzVu7AAtOZAciTajWQydZHCR9DHuH6GQKA8Tl66WyB3YsZtrrpRqK3bcOEtEmFSOYW6AIXjEUOMcKxRSKEIGwsOKwgoCx3Vsik8oOQjCpFyGyCwOEDDsmQZROcXTZH2Ewp4uGRQOT8EBG3RoZTJmWGmYYOZx8DhgDIhRaCColkeLShnZkVSxTOj+CMuhVhsCc3qIfE2rMcpBTcNc5cXImIujNl3OYAJ0rbPKEURkvdCJbFYoxDK-dFb8wBSvMw8NDy7jFDFWZ1QeSoXeedCwgpCKKNUP3CumB0UgK2LC94IocJFBeLaXqI4Cw1FFLMtmyCrHfwVr-W+D9aVpzMEzCEuRBSMWyIYNItoVHGE7uyPIOQOho1yb6flJCsGiuBGYTCB9UgHOUVkF5g4mJZC5K6cwoo1A5KlOWcR5jJGdKBsAiYSi6iulhOC66JoeIdCZB8c6rwXhIz+G0pxZi0QWKkVcPVKQvUgt9S8f1ULgR1KVU6EF7oCjczwAAWzAJqAAbuiRNQLhwprBWmyFCr-jZpyKbVobJSwRKAA */
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

        isPuzzleSolved: (context: WheelContext, event: any): boolean => {
          for (let letter of context.puzzle) {
            if (!Utils.isAnyLetter(letter)) continue;
            if (!context.guessedLetters.includes(letter)) return false;
          }

          return true;
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
          context.guessedLetters.push(event.letter);
        },

        addScore: (context: WheelContext, event: any) => {
          if (typeof context.spinAmount != 'number') return;
          const matches = Utils.countLettersInPuzzle(context.puzzle, event.letter);
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

export { wheelMachine, WheelContext, Utils };