import { StringSelectMenuBuilder } from '@discordjs/builders';
import { createMachine } from 'xstate';

interface Player {
  name: string,
  score: number
}

interface WheelContext {
  players: Player[],
  currentPlayerNum: number,
  currentPlayer: Player,
  category: string,
  puzzle: string,
  guessedLetters: string[],
  spinAmount: number,
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

const puzzleGuessWrong = {
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
          context.spinAmount = Math.round(Math.random() * 500);
        },

        buyVowel: (context: WheelContext, event: any) => {
          context.currentPlayer.score -= 250;
        },

        updateUsedLetters: (context: WheelContext, event: any) => {
          console.log(`letter is: ${event.letter}`);
          context.guessedLetters.push(event.letter);
        },

        addScore: (context: WheelContext, event: any) => {
          const matches = context.puzzle.match(new RegExp(event.letter, 'g'))?.length ?? 0;
          context.currentPlayer.score += matches * context.spinAmount;
        }
      },

      delays: {
        PLAYER_IDLE_TIME: 20000
      }
    }
  );

export { wheelMachine, WheelContext };