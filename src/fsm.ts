import { createMachine } from 'xstate';

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
  entry: (context: any, event: any) => {
    context.currentPlayer = 0;
    context.puzzle = "hello world";
  },

  after: {
    1000: 'playerTurn'
  }
};

const playerTurn = {
  on: {
    SPIN_WHEEL: {
      actions: ['spinWheel'],
      target: 'guessConsonent'
    },

    BUY_VOWEL: {
      cond: 'playerCanBuyVowel',
      target: 'guessVowel'
    },

    SOLVE_PUZZLE: [
      { cond: 'puzzleGuessCorrect', target: 'roundOver' },
      { cond: 'puzzleGuessWrong', target: 'nextPlayerTurn' },
    ]
  },

  after: {
    PLAYER_IDLE_TIME: 'nextPlayerTurn'
  }
};

const nextPlayerTurn = {
  entry: 'cycleNextPlayer',
  after: {
    1000: 'playerTurn'
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
      { target: 'playerTurn', actions: ['updatePuzzle'], cond: 'letterInPuzzle' },
      { target: 'nextPlayerTurn', cond: 'letterNotInPuzzle' },
    ]
  },

  after: {
    PLAYER_IDLE_TIME: 'nextPlayerTurn'
  }
};

const guessVowel = {
  on: {
    GUESS_LETTER: [
      { target: 'playerTurn', actions: ['adjustCash', 'updatePuzzle'], cond: 'letterInPuzzle' },
      { target: 'nextPlayerTurn', actions: ['adjustCash'], cond: 'letterNotInPuzzle' },
    ]
  },

  after: {
    PLAYER_IDLE_TIME: 'nextPlayerTurn'
  }
};

interface WheelContext {
    players: { name: string, score: number }[],
    currentPlayer: number,
    puzzle: string,
}

const wheelMachine =

  /** @xstate-layout N4IgpgJg5mDOIC5QHcAWYwBsB0yCGAlgC4EB2UAxAHICiA6gPoAKAMgIICaNASgNoAMAXUSgADgHtYxAuNIiQAD0QA2ACyrsygOwBGAByrlATj1GjAJj0BmADQgAnoj07sAVn4f+rncfOqd-KoAvkF2aBg4+NLkFADKACps3PEMAOJsALI0AsJIIBJSJLLySgh6rsrYVt6u5kZWfg1WenaOCDqq-Jo6RlrWVkauqkb85lYhYehYuIQkMTnyBdLFeaXlldU6tfWNYy0OiD0uOj16-MrlVqp9RsoTIOHTpGDITACuAF4fmGAUCrBEPBEMDYPAAM2BACcABQBDwASgojxwz1en2+YAWeSWRTkq0OJw0zXMWgsWn4WnM5lcrUQYy02BOJlGVkpYw8enuyOwokweHsYEh8TekNIcSYAEkqAw6AAJGg0FhYsSSZZ40ClVTONxjAZGYZ1VQNWkIVy1KpUkYU6qdExcqY4Xn8wXC0UUABCAFUOAwAGoAeToiuV+VVuJKiCsVyqI1cenMaj01m8JsT2C0WmU-B0fS0VmMWlc9oiPL5AqFIrFsX9LF9NGYnoAWo2WNkhIswzJ1YonBUqjU6g0jXsTZYNMoehm+hT+GYtMXpk7y66qzW6w3m63eDpcirCl2I2U+5ttkOmvs2hOXKpqb1ma5qs4F46yy7K38AUCQeCodDWJweAYCUABFWwYeIJSyRFuSXN9RRDHED3xI8NgHHZh2aVMJ2wCws34BplCjQx51CB4HWwZ4FCIJhXwrN1-kBYFQQhQVYU8aDyMo6jaJXBDOxWDUCQ6Kp41JEkKSpGkDlNQicNvLRhjzWpSWfbAoDeOBYAAYVkWBZDAUgiAoVJPRoWJYgYVt4niHg+P3ASewQEkNBqCdC1cXoTi0E1VDNbA9ALZNPKpcxVPUzSdNIPTnkM4zTPMyyaGs2ydw7ezu1KZy3C2NyzU8nMfK8KpjGcUwoy8a4wo02BtN0-TYoYr9mN-f8uG4IDQPrCCoKRcjwpqyLooMog7LVQ8stcnM8t0ArpPjcxNHmkZbmsMkqs031xGQLA4rMiyrJsvh22xfiMrpBTsoqKaPJm7zpOMIxsBJDz4wfDNlCLUjuX62BNu2zBdoSg6Ut3UN0vGi7Jvc-K7raPRyUZJa4w8Klxi+vrqt+radsapif1Y1rAJAsDupoDiSx+v6sFG8NkImnLrphk1bkqQihh0QdygCO57lIcQIDgeRkTSsbkIAWmUE0xdcHCzDl+W5cpVSojmKARdpwSEAuFxTAMbNDATJML0OeMcIfDn2ULSwSMmEtUXeL4fnVpDNY5vz42cLxbkMXpYbpfDsHOX2OisHRqgGHnbcXHjK2dhzSmUC50x8EwI98yxU0MbAbxeicrFnZpVK4mjnTo7tEPjw5qRlj2Ag8tQCz9rWBjkvCtTqDozHWga6piog47OhAbxNM5HrDqkFLcowU+7rH-oHw8+gtT3qQ6SxzH4Y2EEGKxA8uW44zOK5ORCIIgA */
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
        currentPlayer: 0,
        puzzle: '',
      },
      states: {
        waiting,
        newPuzzle,
        playerTurn,
        nextPlayerTurn,
        guessConsonent,
        guessVowel,
        roundOver
      },
      predictableActionArguments: true
    },
    {
      guards: {
        isGameFull: (context, event) => {
          return context.players.length == 3;
        },

        hasAnyPlayers: (context, event) => {
          return context.players.length > 0;
        },

        letterInPuzzle: (context, event: any): boolean => {
          return !!context.puzzle?.includes(event.letter);
        },

        letterNotInPuzzle: (context, event: any): boolean => {
          return !context.puzzle?.includes(event.letter);
        },

        playerCanBuyVowel: (context, event: any): boolean => {
          return true;
        },

        puzzleGuessCorrect: (context, event: any): boolean => {
          return event.guess.toLowerCase() == context.puzzle.toLowerCase();
        },

        puzzleGuessWrong: (context, event: any): boolean => {
          return event.guess.toLowerCase() != context.puzzle.toLowerCase();
        },
      },

      actions: {
        registerNewPlayer: (context, event: any) => {
          context.players.push({name: event.playerName, score: 0});
        },

        cycleNextPlayer: (context, event: any) => {
          context.currentPlayer += 1;
          if (context.currentPlayer > context.players.length) context.currentPlayer = 0;
        },

        adjustCash: (context, event: any) => {
        },

        updatePuzzle: (context, event: any) => {
          console.log(`letter is: ${event.letter}`);
        }
      },

      delays: {
        PLAYER_IDLE_TIME: 20000
      }
    }
  );

export { wheelMachine, WheelContext };