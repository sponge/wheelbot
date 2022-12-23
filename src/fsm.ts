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
    context.currentPlayerNum = 0;
    context.currentPlayer = context.players[0];
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
      { cond: 'isPuzzleGuessCorrect', target: 'roundOver' },
      { cond: 'isPuzzleGuessWrong', target: 'puzzleGuessWrong' },
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

const puzzleGuessWrong = {
  after: {
    1000: 'newPuzzle'
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
      { target: 'nextPlayerTurn', actions: ['updatePuzzle'], cond: 'letterNotInPuzzle' },
    ]
  },

  after: {
    PLAYER_IDLE_TIME: 'nextPlayerTurn'
  }
};

const guessVowel = {
  on: {
    GUESS_LETTER: [
      { target: 'playerTurn', actions: ['buyVowel', 'updatePuzzle'], cond: 'letterInPuzzle' },
      { target: 'nextPlayerTurn', actions: ['buyVowel'], cond: 'letterNotInPuzzle' },
    ]
  },

  after: {
    PLAYER_IDLE_TIME: 'nextPlayerTurn'
  }
};

interface Player {
  name: string,
  score: number
}

interface WheelContext {
  players: Player[],
  currentPlayerNum: number,
  currentPlayer: Player | null,
  puzzle: string,
  guessedLetters: string[],
}

const wheelMachine =
/** @xstate-layout N4IgpgJg5mDOIC5QHcAWYwBsB0yCGAlgC4EB2UAxAHICiA6gPoAKAMgIICaNASgNoAMAXUSgADgHtYxAuNIiQAD0QBGAEzKArNg0B2fgBYdqgGzHNAZgCc5gDQgAnolXnz2Z-uOXV3-fwAclsYAvkF2aBg4+NLkFADKACps3PEMAOJsALI0AsJIIBJSJLLySgjKVjpuGvzKppZ+esp2jgiqXtjmGvr6lvoaxn3m-LohYehYuIQkMTnyBdLFeaXllpWq1bWeDTXNiOb6qth+XR465jrGF5ejIOETpGDITACuAF6vmGAUCrBEeERgbB4ABmAIATgAKZT8GEASgodxwDyebw+YFmeXmRTkSxUGg0fg6akuXksyj85j8fl2CF62FWxhOqjOx0sGnMN0R2FEmDw9jAYPizzBpDiTAAklQGHQABI0GgsDFiSQLHGgUp9ZTadzGfyXY7mTQ08zqen8Mxk-gXDTKTnjHA8vkCoUiigAIQAqhwGAA1ADydAVSvyKuxJT2Bg6lnNXUpbIG6xp+nJHQ0Xj8Bmq63x+jtEW5vP5guFotifpYPpozA9AC0ayxskI5qGZGrFIhrdhjOthuZTDpahSaRnKoE-N2hvwyYFbaFbvaC07i66yxWq0xa-XsspcsrCq3wwhO93quz+4PbA5EOPjNgPOPqhmyXG8xNHUWXaKfn8AUDQQKIVYTgeAYcUABEGwYeJxSyeEuXfZ0S2DLED1xI9GS7Hsz0uC8k28bAYVJVQ-HURlrFfJEwAUIgmELRDXW-f5ARBcEoRhfg4IXB5qNopdP2QltFnVFR+CGKpCMNM442pK8EHOfRtCnFxrGUU4dEsCjsCgZ44FgABhWRYFkMBSCIChUg9GhYliBgG3ieIeAE-chPbVpum0TQBn4bMGj6GlvC0QZoWUPRmQGDxNO03SDNIIyHlM8zLOs2yaHsxyd2bZy21KVR3JtfpfB8nQ-NkvwtWqdjKX2FwrWCOcuSi2B9MM4yEsY38WIAoCuG4UCIKraDYIRBdGua2LWqIJzVUPXKFPyryipKloQtHdklNUfxapcSKdKan1xGQLBEqsmy7Icvgm0xQTsqcPLPMK-FfI0JNjEJVl1hNbsehCjl6pG3bYH2w7MGO5KzvS3cQyyma7oK7zHuK57ZLTQ4THxfoqWUNlLA0v781GoGjva5j-0hbqQPAyDBpoTj8YBwnMCmsM0Nmjy4cWpGWlewkB3HDxsz0LpNLBcRnlICA-QANwFb5fiYv9WOhOFhvzEWxYl6WwSZ1DhLKCpxM2epGmHKc71e3QLmK5Rah0TTRFRT5UgBugRZiYmFYApWOJVt8HbAJ3dJd2QoG1lzln1ntDe2JpSsuelXt1LpiuGQIQjnUhxAgOB5ERTLprQgBaYwaSLzSommKA8+Z3W1A0Q51L0XxanNXpVGNfYuwaHQyrTbvOhCzTkRed5PirnXXMHSxsB0XQvGtV6hmL2STX4bBoW6KxVPWQJ+jtujlzbFCw8QC0uwHaNzisfx+iTWoCKnYjDU8USscHqiaP3z8x+PsoQq1Twuj5XKOpTmexrBrwaE+CoOhu47Wii1eKRBv43QQAcduWgXDMl0DaTo1gKRwL2gdLAyDDzdw6MRTQ19nCiQHDSS4WhBzhRnr0K0wtRbiylgKEhaE1B30wc4fY1Q2QyRaBmQk94MbeVUgEX6Yx8z2xHv7Z2rtK5XWhjw8kCkXC6mTMYIYFIXDDlMPHB8m1ny4xCEAA */
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
        currentPlayer: null,
        puzzle: '',
        guessedLetters: [],
      },
      states: {
        waiting,
        newPuzzle,
        playerTurn,
        nextPlayerTurn,
        guessConsonent,
        guessVowel,
        roundOver,
        puzzleGuessWrong
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
          return event.currentPlayer?.score >= 250;
        },

        isPuzzleGuessCorrect: (context, event: any): boolean => {
          return event.guess.toLowerCase() == context.puzzle.toLowerCase();
        },

        isPuzzleGuessWrong: (context, event: any): boolean => {
          return event.guess.toLowerCase() != context.puzzle.toLowerCase();
        },
      },

      actions: {
        registerNewPlayer: (context, event: any) => {
          context.players.push({ name: event.playerName, score: 0 });
        },

        cycleNextPlayer: (context, event: any) => {
          context.currentPlayerNum += 1;
          if (context.currentPlayerNum >= context.players.length) context.currentPlayerNum = 0;
          context.currentPlayer = context.players[context.currentPlayerNum];
        },

        buyVowel: (context, event: any) => {
          if (event.currentPlayer) {
            event.currentPlayer.score -= 250;
          }
        },

        updatePuzzle: (context, event: any) => {
          console.log(`letter is: ${event.letter}`);
          context.guessedLetters.push(event.letter);
        }
      },

      delays: {
        PLAYER_IDLE_TIME: 20000
      }
    }
  );

export { wheelMachine, WheelContext };