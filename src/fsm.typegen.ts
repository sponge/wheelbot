
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "": { type: "" };
"xstate.after(1000)#wheel.puzzleGuessCorrect": { type: "xstate.after(1000)#wheel.puzzleGuessCorrect" };
"xstate.after(1000)#wheel.puzzleGuessWrong": { type: "xstate.after(1000)#wheel.puzzleGuessWrong" };
"xstate.after(3000)#wheel.lettersInPuzzle": { type: "xstate.after(3000)#wheel.lettersInPuzzle" };
"xstate.after(3000)#wheel.noLettersInPuzzle": { type: "xstate.after(3000)#wheel.noLettersInPuzzle" };
"xstate.after(3000)#wheel.spinWheel": { type: "xstate.after(3000)#wheel.spinWheel" };
"xstate.after(PLAYER_IDLE_TIME)#wheel.guessConsonant": { type: "xstate.after(PLAYER_IDLE_TIME)#wheel.guessConsonant" };
"xstate.after(PLAYER_IDLE_TIME)#wheel.guessVowel": { type: "xstate.after(PLAYER_IDLE_TIME)#wheel.guessVowel" };
"xstate.after(PLAYER_IDLE_TIME)#wheel.playerTurn": { type: "xstate.after(PLAYER_IDLE_TIME)#wheel.playerTurn" };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "addScore": "GUESS_LETTER";
"bankruptCurrentPlayer": "xstate.after(3000)#wheel.spinWheel";
"buyVowel": "GUESS_LETTER";
"cycleNextPlayer": "xstate.after(1000)#wheel.puzzleGuessWrong" | "xstate.after(3000)#wheel.noLettersInPuzzle" | "xstate.after(3000)#wheel.spinWheel" | "xstate.after(PLAYER_IDLE_TIME)#wheel.guessConsonant" | "xstate.after(PLAYER_IDLE_TIME)#wheel.guessVowel" | "xstate.after(PLAYER_IDLE_TIME)#wheel.playerTurn";
"guaranteeMinimumWin": "" | "SOLVE_PUZZLE";
"registerNewPlayer": "NEW_PLAYER";
"spinWheel": "SPIN_WHEEL";
"updateUsedLetters": "GUESS_LETTER";
        };
        eventsCausingDelays: {
          "PLAYER_IDLE_TIME": "" | "BUY_VOWEL" | "GUESS_LETTER" | "xstate.after(3000)#wheel.lettersInPuzzle" | "xstate.after(3000)#wheel.spinWheel";
        };
        eventsCausingGuards: {
          "hasAnyPlayers": "START_GAME";
"isGameFull": "";
"isPuzzleGuessCorrect": "SOLVE_PUZZLE";
"isPuzzleGuessWrong": "SOLVE_PUZZLE";
"isPuzzleSolved": "";
"isSpinBankrupt": "xstate.after(3000)#wheel.spinWheel";
"isSpinLoseATurn": "xstate.after(3000)#wheel.spinWheel";
"letterInPuzzle": "GUESS_LETTER";
"letterNotInPuzzle": "GUESS_LETTER";
"notConsonantGuess": "GUESS_LETTER";
"notVowelGuess": "GUESS_LETTER";
"playerCanBuyVowel": "BUY_VOWEL";
"playerCanSpin": "SPIN_WHEEL";
        };
        eventsCausingServices: {
          
        };
        matchesStates: "gameOver" | "guessConsonant" | "guessVowel" | "lettersInPuzzle" | "nextPlayerTurn" | "noLettersInPuzzle" | "playerTurn" | "puzzleGuessCorrect" | "puzzleGuessWrong" | "spinWheel" | "startGame" | "waiting";
        tags: never;
      }
  